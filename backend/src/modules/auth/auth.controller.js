import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { OAuth2Client } from "google-auth-library";
import { pool } from "../../config/database.js";
import { masterPool } from "../../config/masterDatabase.js";
import {
  getTenantPool,
  provisionTenant,
  provisionSupplierTenant,
} from "../../middleware/tenant.middleware.js";
import { generateTokenPair, verifyRefreshToken } from "../../config/jwt.js";
import { sendOtpEmail, sendPasswordResetEmail } from "../../config/email.js";
import { AppError } from "../../middleware/errorHandler.js";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function saveOtp(db, userId) {
  await db.execute("DELETE FROM email_otps WHERE user_id = ?", [userId]);
  const code = generateOtp();
  const expiry = new Date(Date.now() + 5 * 60 * 1000);
  await db.execute(
    "INSERT INTO email_otps (id, user_id, code, expiry) VALUES (?, ?, ?, ?)",
    [uuidv4(), userId, code, expiry]
  );
  return code;
}

function buildSlug(name, id) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 40) + '_' + id.slice(0, 6);
}

async function resolveDb(email) {
  // 1. Check Owners
  const [shopRows] = await masterPool.execute(
    `SELECT tenant_id AS id, db_name, status FROM tenants WHERE owner_email = ?`, [email]
  );
  if (shopRows.length > 0) {
    if (shopRows[0].status === "SUSPENDED") throw new AppError("Your shop has been suspended.", 403);
    const db = await getTenantPool(shopRows[0].db_name);
    return { db, row: shopRows[0], dbName: shopRows[0].db_name, userType: 'shop' };
  }

  const [supRows] = await masterPool.execute(
    `SELECT supplier_id AS id, db_name, status FROM suppliers WHERE owner_email = ?`, [email]
  );
  if (supRows.length > 0) {
    if (supRows[0].status === "SUSPENDED") throw new AppError("Your account has been suspended.", 403);
    const db = await getTenantPool(supRows[0].db_name);
    return { db, row: supRows[0], dbName: supRows[0].db_name, userType: 'supplier' };
  }

  // 2. Check Global Invited Users (Admin, Cashier, Staff)
  const [globalRows] = await masterPool.execute(
    `SELECT db_name, user_type FROM global_users WHERE email = ?`, [email]
  );
  if (globalRows.length > 0) {
    const { db_name, user_type } = globalRows[0];
    const db = await getTenantPool(db_name);
    return { db, row: null, dbName: db_name, userType: user_type };
  }

  return { db: null, row: null, dbName: null, userType: null };
}

async function resolveDbFromToken(token) {
  if (token && token.includes('::')) {
    const dbName = token.split('::')[0];
    try { return await getTenantPool(dbName); } catch { return pool; }
  }
  return pool;
}

// SIGNUP
const signup = async (req, res, next) => {
  try {
    try {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      await pool.execute("DELETE FROM users WHERE emailVerified = FALSE AND createdAt < ?", [oneDayAgo]);
      await pool.execute("DELETE FROM email_otps WHERE createdAt < ?", [oneDayAgo]);
    } catch (e) { console.warn("Cleanup error:", e.message); }

    const { name, email, password, phone, shopType = 'other', userType = 'shop' } = req.body;

    if (!name || !email || !password)
      return next(new AppError("Name, email, and password are required.", 400));
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return next(new AppError("Please enter a valid email address.", 400));
    if (password.length < 6)
      return next(new AppError("Password must be at least 6 characters.", 400));

    const [tenantCheck] = await masterPool.execute(
      "SELECT tenant_id AS id FROM tenants WHERE owner_email = ?", [email]
    );
    const [supplierCheck] = await masterPool.execute(
      "SELECT supplier_id AS id FROM suppliers WHERE owner_email = ?", [email]
    );
    if (tenantCheck.length > 0 || supplierCheck.length > 0)
      return next(new AppError("Email already registered.", 409));

    const [existing] = await pool.execute(
      "SELECT user_id, emailVerified FROM users WHERE email = ?", [email]
    );
    if (existing.length > 0) {
      if (existing[0].emailVerified) return next(new AppError("Email already registered.", 409));
      const code = await saveOtp(pool, existing[0].user_id);
      try { await sendOtpEmail(email, name, code); } catch { }
      return res.status(200).json({ success: true, message: "A new verification code has been sent to your email." });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const userId = uuidv4();

    await pool.execute(
      `INSERT INTO users (user_id, name, email, password, provider, role, phone, status, emailVerified, isActive)
       VALUES (?, ?, ?, ?, 'local', 'OWNER', ?, 'PENDING', FALSE, FALSE)`,
      [userId, name, email, hashedPassword, phone || null]
    );

    await pool.execute(
      "UPDATE users SET verifyToken = ? WHERE user_id = ?",
      [JSON.stringify({ shopType, userType }), userId]
    );

    const code = await saveOtp(pool, userId);
    try { await sendOtpEmail(email, name, code); } catch (e) { console.warn("OTP email failed:", e.message); }

    res.status(201).json({
      success: true,
      message: "Account created! Please enter the verification code sent to your email.",
    });
  } catch (error) { next(error); }
};

// VERIFY EMAIL
const verifyEmail = async (req, res, next) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) return next(new AppError("Email and verification code are required.", 400));

    const [userRows] = await pool.execute(
      "SELECT user_id, name, email, password, phone, verifyToken FROM users WHERE email = ? AND emailVerified = FALSE",
      [email]
    );
    if (userRows.length === 0) return next(new AppError("Account not found or already verified.", 404));

    const stagingUser = userRows[0];

    const [otpRows] = await pool.execute(
      "SELECT id, expiry FROM email_otps WHERE user_id = ? AND code = ? ORDER BY createdAt DESC LIMIT 1",
      [stagingUser.user_id, code]
    );
    if (otpRows.length === 0) return next(new AppError("Invalid verification code.", 400));
    if (new Date() > new Date(otpRows[0].expiry))
      return next(new AppError("Verification code has expired. Please request a new one.", 400));

    let shopType = 'other';
    let userType = 'shop';
    try {
      const meta = JSON.parse(stagingUser.verifyToken || '{}');
      if (meta.shopType) shopType = meta.shopType;
      if (meta.userType) userType = meta.userType;
    } catch { }

    const displayName = userType === 'supplier'
      ? `${stagingUser.name}'s Business`
      : `${stagingUser.name}'s Shop`;

    let dbName;
    let tenantId = uuidv4();
    let slug;

    if (userType === 'supplier') {
      const [existingSupplier] = await masterPool.execute(
        "SELECT supplier_id, db_name FROM suppliers WHERE owner_email = ?", [email]
      );
      if (existingSupplier.length > 0) {
        tenantId = existingSupplier[0].supplier_id;
        dbName = existingSupplier[0].db_name;
        slug = buildSlug(displayName, tenantId);
      } else {
        slug = buildSlug(displayName, tenantId);
        dbName = `${process.env.SUPPLIER_DB_PREFIX}${tenantId.replace(/-/g, '').slice(0, 16)}`;
        await masterPool.execute(
          `INSERT INTO suppliers (supplier_id, business_name, slug, owner_name, owner_email, owner_phone, db_name, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'TRIAL')`,
          [tenantId, displayName, slug, stagingUser.name, email, stagingUser.phone || null, dbName]
        );
        await provisionSupplierTenant(tenantId, dbName);
      }
    } else {
      const [existingTenant] = await masterPool.execute(
        "SELECT tenant_id, db_name FROM tenants WHERE owner_email = ?", [email]
      );
      if (existingTenant.length > 0) {
        tenantId = existingTenant[0].tenant_id;
        dbName = existingTenant[0].db_name;
        slug = buildSlug(displayName, tenantId);
      } else {
        slug = buildSlug(displayName, tenantId);
        dbName = `${process.env.TENANT_DB_PREFIX}${tenantId.replace(/-/g, '').slice(0, 16)}`;
        await masterPool.execute(
          `INSERT INTO tenants (tenant_id, shop_name, shop_slug, owner_name, owner_email, owner_phone, db_name, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'TRIAL')`,
          [tenantId, displayName, slug, stagingUser.name, email, stagingUser.phone || null, dbName]
        );
        await masterPool.execute(
          `INSERT INTO subscriptions (sub_id, tenant_id, plan, status, max_users, max_products, ai_enabled, reports_enabled, expires_at)
           SELECT ?, ?, plan_name, 'ACTIVE', max_users, max_products, ai_enabled, reports_enabled, DATE_ADD(NOW(), INTERVAL 30 DAY)
           FROM plans WHERE plan_name = 'FREE'`,
          [uuidv4(), tenantId]
        );
        await provisionTenant(tenantId, dbName, shopType);
      }
    }

    const tenantDb = await getTenantPool(dbName);
    const [existingUser] = await tenantDb.execute("SELECT user_id FROM users WHERE email = ?", [email]);
    if (existingUser.length === 0) {
      await tenantDb.execute(
        `INSERT INTO users (user_id, name, email, password, provider, role, phone, status, emailVerified, isActive)
         VALUES (?, ?, ?, ?, 'local', 'OWNER', ?, 'APPROVED', TRUE, TRUE)`,
        [stagingUser.user_id, stagingUser.name, email, stagingUser.password, stagingUser.phone || null]
      );
      await masterPool.execute(
        `INSERT IGNORE INTO global_users (email, db_name, user_type) VALUES (?, ?, ?)`,
        [email, dbName, userType]
      );
      const profileEntityId = userType === 'supplier' ? tenantId : dbName;
      await masterPool.execute(
        `INSERT IGNORE INTO profiles (profile_id, entity_id, entity_type, business_name, slug, business_type, is_public)
         VALUES (?, ?, ?, ?, ?, ?, TRUE)`,
        [uuidv4(), profileEntityId, userType, displayName, slug, shopType || 'general']
      );
    }

    await pool.execute("DELETE FROM email_otps WHERE user_id = ?", [stagingUser.user_id]);
    await pool.execute("DELETE FROM users WHERE user_id = ? AND emailVerified = FALSE", [stagingUser.user_id]);

    const label = userType === 'supplier' ? 'Your supplier account is ready.' : 'Your shop is ready.';
    res.json({ success: true, message: `Email verified! ${label} You can now sign in.` });
  } catch (error) { next(error); }
};

// RESEND OTP
const resendOtp = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return next(new AppError("Email is required.", 400));
    const [rows] = await pool.execute(
      "SELECT user_id, name FROM users WHERE email = ? AND emailVerified = FALSE", [email]
    );
    if (rows.length === 0) return next(new AppError("Account not found or already verified.", 404));
    const code = await saveOtp(pool, rows[0].user_id);
    try { await sendOtpEmail(email, rows[0].name, code); } catch (e) { console.warn("OTP email failed:", e.message); }
    res.json({ success: true, message: "A new verification code has been sent." });
  } catch (error) { next(error); }
};

// LOGIN
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return next(new AppError("Email and password are required.", 400));

    const { db, row, dbName, userType } = await resolveDb(email);
    const targetDb = db || pool;

    const [rows] = await targetDb.execute("SELECT * FROM users WHERE email = ?", [email]);
    if (rows.length === 0) return next(new AppError("Account not found. Please sign up.", 404));
    const user = rows[0];

    if (user.provider === "google" && !user.password)
      return next(new AppError("This account uses Google Sign-In. Please sign in with Google.", 400));
    if (!await bcrypt.compare(password, user.password))
      return next(new AppError("Incorrect password.", 401));
    if (!user.emailVerified)
      return next(new AppError("Email not verified. Please check your inbox.", 403));
    if (user.status === "PENDING") return next(new AppError("Your account is pending approval.", 403));
    if (user.status === "REJECTED") return next(new AppError("Your account was rejected.", 403));
    if (!user.isActive) return next(new AppError("Your account has been deactivated.", 403));

    const tokens = generateTokenPair({ ...user, dbName, userType: userType || 'shop' });
    await targetDb.execute("UPDATE users SET refreshToken = ? WHERE user_id = ?", [tokens.refreshToken, user.user_id]);

    const { password: _, refreshToken: __, verifyToken: ___, ...safeUser } = user;
    safeUser.role = safeUser.role.toLowerCase();
    safeUser.userType = userType || 'shop';

    res.json({
      success: true, message: "Login successful.",
      data: {
        user: safeUser,
        ...tokens,
        userType: userType || 'shop',
        tenant: row ? { tenantId: row.id, dbName, slug: row.slug || row.shop_slug } : null
      },
    });
  } catch (error) { next(error); }
};

// GOOGLE AUTH
const googleAuth = async (req, res, next) => {
  try {
    const { idToken, accessToken, userType: reqUserType } = req.body;
    if (!idToken && !accessToken) return next(new AppError("Google token is required.", 400));

    let email, name, picture;
    if (idToken) {
      const ticket = await googleClient.verifyIdToken({ idToken, audience: process.env.GOOGLE_CLIENT_ID });
      const p = ticket.getPayload();
      email = p.email; name = p.name; picture = p.picture;
    } else {
      const resp = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (!resp.ok) return next(new AppError("Failed to fetch user info from Google.", 400));
      const p = await resp.json();
      email = p.email; name = p.name; picture = p.picture;
    }
    if (!email) return next(new AppError("Could not retrieve email from Google.", 400));

    const { db: existingDb, row: existingRow, dbName: existingDbName, userType: existingUserType } = await resolveDb(email);
    let db, dbName, row, userType;

    if (existingRow) {
      db = existingDb; dbName = existingDbName; row = existingRow; userType = existingUserType;
      // Ensure slug is available if it was missing in the 'row' from resolveDb
      if (!row.slug && !row.shop_slug) {
        const table = userType === 'supplier' ? 'suppliers' : 'tenants';
        const idCol = userType === 'supplier' ? 'supplier_id' : 'tenant_id';
        const slugCol = userType === 'supplier' ? 'slug' : 'shop_slug';
        const [slugRows] = await masterPool.execute(`SELECT ${slugCol} FROM ${table} WHERE ${idCol} = ?`, [row.id]);
        if (slugRows.length > 0) row.slug = slugRows[0][slugCol];
      }
    } else {
      userType = reqUserType === 'supplier' ? 'supplier' : 'shop';
      const newId = uuidv4();
      const userName = name || email.split("@")[0];

      if (userType === 'supplier') {
        const businessName = `${userName}'s Business`;
        const slug = buildSlug(businessName, newId);
        dbName = `${process.env.SUPPLIER_DB_PREFIX}${newId.replace(/-/g, '').slice(0, 16)}`;
        await masterPool.execute(
          `INSERT INTO suppliers (supplier_id, business_name, slug, owner_name, owner_email, owner_phone, db_name, status)
           VALUES (?, ?, ?, ?, ?, NULL, ?, 'TRIAL')`,
          [newId, businessName, slug, userName, email, dbName]
        );
        await provisionSupplierTenant(newId, dbName);
      } else {
        const shopName = `${userName}'s Shop`;
        const slug = buildSlug(shopName, newId);
        dbName = `${process.env.TENANT_DB_PREFIX}${newId.replace(/-/g, '').slice(0, 16)}`;
        await masterPool.execute(
          `INSERT INTO tenants (tenant_id, shop_name, shop_slug, owner_name, owner_email, owner_phone, db_name, status)
           VALUES (?, ?, ?, ?, ?, NULL, ?, 'TRIAL')`,
          [newId, shopName, slug, userName, email, dbName]
        );
        await masterPool.execute(
          `INSERT INTO subscriptions (sub_id, tenant_id, plan, status, max_users, max_products, ai_enabled, reports_enabled, expires_at)
           SELECT ?, ?, plan_name, 'ACTIVE', max_users, max_products, ai_enabled, reports_enabled, DATE_ADD(NOW(), INTERVAL 30 DAY)
           FROM plans WHERE plan_name = 'FREE'`,
          [uuidv4(), newId]
        );
        await provisionTenant(newId, dbName, 'other');
      }

      // NEW: Create basic Discovery Profile
      const profileSlug = buildSlug(userType === 'supplier' ? `${userName}'s Business` : `${userName}'s Shop`, newId);
      const profileEntityId = userType === 'supplier' ? newId : dbName;
      await masterPool.execute(
        `INSERT IGNORE INTO profiles (profile_id, entity_id, entity_type, business_name, slug, business_type, is_public)
         VALUES (?, ?, ?, ?, ?, ?, TRUE)`,
        [uuidv4(), profileEntityId, userType, userType === 'supplier' ? `${userName}'s Business` : `${userName}'s Shop`, profileSlug, 'general']
      );

      db = await getTenantPool(dbName);
      row = { id: newId, db_name: dbName };
      await db.execute(
        `INSERT INTO users (user_id, name, email, password, provider, role, avatar, status, isActive, emailVerified)
         VALUES (?, ?, ?, NULL, 'google', 'OWNER', ?, 'APPROVED', TRUE, TRUE)`,
        [uuidv4(), userName, email, picture || null]
      );
      await masterPool.execute(
        `INSERT IGNORE INTO global_users (email, db_name, user_type) VALUES (?, ?, ?)`,
        [email, dbName, userType]
      );
    }

    const [rows] = await db.execute("SELECT * FROM users WHERE email = ?", [email]);
    if (rows.length === 0) return next(new AppError("User not found after provisioning.", 500));
    let user = rows[0];
    if (picture && user.avatar !== picture) {
      await db.execute("UPDATE users SET avatar = ? WHERE user_id = ?", [picture, user.user_id]);
      user.avatar = picture;
    }
    if (!user.isActive) return next(new AppError("Your account has been deactivated.", 403));

    const tokens = generateTokenPair({ ...user, dbName, userType });
    await db.execute("UPDATE users SET refreshToken = ? WHERE user_id = ?", [tokens.refreshToken, user.user_id]);

    const { password: _, refreshToken: __, verifyToken: ___, ...safeUser } = user;
    safeUser.role = safeUser.role.toLowerCase();
    safeUser.userType = userType;

    res.json({
      success: true, message: "Google sign-in successful.",
      data: {
        user: safeUser,
        ...tokens,
        userType,
        tenant: row ? { tenantId: row.id, dbName, slug: row.slug || row.shop_slug } : null
      },
    });
  } catch (error) { next(error); }
};

// REFRESH TOKEN
const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return next(new AppError("Refresh token is required.", 400));
    const decoded = verifyRefreshToken(refreshToken);
    const { db, dbName, userType } = await resolveDb(decoded.email);
    const targetDb = db || pool;
    const [rows] = await targetDb.execute(
      "SELECT user_id, name, email, role, refreshToken FROM users WHERE user_id = ?", [decoded.id]
    );
    if (rows.length === 0 || rows[0].refreshToken !== refreshToken)
      return next(new AppError("Invalid refresh token.", 401));
    const tokens = generateTokenPair({ ...rows[0], dbName, userType: userType || 'shop' });
    await targetDb.execute("UPDATE users SET refreshToken = ? WHERE user_id = ?", [tokens.refreshToken, rows[0].user_id]);
    res.json({ success: true, message: "Token refreshed.", data: tokens });
  } catch (error) { next(error); }
};

// LOGOUT
const logout = async (req, res, next) => {
  try {
    await req.db.execute("UPDATE users SET refreshToken = NULL WHERE user_id = ?", [req.user.user_id]);
    res.json({ success: true, message: "Logged out successfully." });
  } catch (error) { next(error); }
};

// GET ME
const getMe = async (req, res, next) => {
  try {
    const [rows] = await req.db.execute(
      `SELECT user_id, name, email, role, phone, avatar, provider, isActive, status, createdAt
       FROM users WHERE user_id = ?`, [req.user.user_id]
    );
    res.json({ success: true, data: { ...rows[0], userType: req.user.userType || 'shop' } });
  } catch (error) { next(error); }
};

// CHANGE PASSWORD
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return next(new AppError("Both passwords are required.", 400));
    if (newPassword.length < 6) return next(new AppError("New password must be at least 6 characters.", 400));
    const [rows] = await req.db.execute("SELECT password, provider FROM users WHERE user_id = ?", [req.user.user_id]);
    if (rows[0].provider === "google" && !rows[0].password)
      return next(new AppError("Google accounts cannot change password here.", 400));
    if (!await bcrypt.compare(currentPassword, rows[0].password))
      return next(new AppError("Current password is incorrect.", 400));
    const hashed = await bcrypt.hash(newPassword, 12);
    await req.db.execute("UPDATE users SET password = ? WHERE user_id = ?", [hashed, req.user.user_id]);
    res.json({ success: true, message: "Password changed successfully." });
  } catch (error) { next(error); }
};

// FORGOT PASSWORD
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return next(new AppError("Email is required.", 400));
    const { db, row } = await resolveDb(email);
    if (!row) return next(new AppError("Account not found.", 404));
    const [rows] = await db.execute("SELECT user_id, name, provider FROM users WHERE email = ?", [email]);
    if (rows.length === 0) return next(new AppError("Account not found.", 404));
    if (rows[0].provider === "google")
      return next(new AppError("Google accounts cannot reset password here. Please sign in with Google.", 400));
    const userId = rows[0].user_id;
    await db.execute("DELETE FROM email_otps WHERE user_id = ?", [userId]);
    const code = generateOtp();
    const expiry = new Date(Date.now() + 10 * 60 * 1000);
    await db.execute("INSERT INTO email_otps (id, user_id, code, expiry) VALUES (?, ?, ?, ?)", [uuidv4(), userId, code, expiry]);
    sendPasswordResetEmail(email, rows[0].name, code).catch(e => console.warn(e));
    res.json({ success: true, message: "Password reset code sent to your email." });
  } catch (error) { next(error); }
};

// VERIFY RESET OTP
const verifyResetOtp = async (req, res, next) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) return next(new AppError("Email and code are required.", 400));
    const { db, row } = await resolveDb(email);
    if (!row) return next(new AppError("Invalid or expired OTP.", 400));
    const [userRows] = await db.execute("SELECT user_id FROM users WHERE email = ?", [email]);
    if (!userRows.length) return next(new AppError("Invalid or expired OTP.", 400));
    const [otpRows] = await db.execute(
      "SELECT id, expiry FROM email_otps WHERE user_id = ? AND code = ? ORDER BY createdAt DESC LIMIT 1",
      [userRows[0].user_id, code]
    );
    if (!otpRows.length || new Date() > new Date(otpRows[0].expiry))
      return next(new AppError("Invalid or expired OTP.", 400));
    res.json({ success: true, message: "OTP verified." });
  } catch (error) { next(error); }
};

// RESET PASSWORD
const resetPassword = async (req, res, next) => {
  try {
    const { email, code, newPassword } = req.body;
    if (!email || !code || !newPassword)
      return next(new AppError("Email, code, and new password are required.", 400));
    if (newPassword.length < 6) return next(new AppError("Password must be at least 6 characters.", 400));
    const { db, row } = await resolveDb(email);
    if (!row) return next(new AppError("Invalid or expired OTP.", 400));
    const [userRows] = await db.execute("SELECT user_id FROM users WHERE email = ?", [email]);
    if (!userRows.length) return next(new AppError("Invalid or expired OTP.", 400));
    const userId = userRows[0].user_id;
    const [otpRows] = await db.execute(
      "SELECT id, expiry FROM email_otps WHERE user_id = ? AND code = ? ORDER BY createdAt DESC LIMIT 1",
      [userId, code]
    );
    if (!otpRows.length || new Date() > new Date(otpRows[0].expiry))
      return next(new AppError("Invalid or expired OTP.", 400));
    const hashed = await bcrypt.hash(newPassword, 12);
    await db.execute("UPDATE users SET password = ? WHERE user_id = ?", [hashed, userId]);
    await db.execute("DELETE FROM email_otps WHERE user_id = ?", [userId]);
    res.json({ success: true, message: "Password reset successfully. You can now sign in." });
  } catch (error) { next(error); }
};

// VERIFY MEMBER
const verifyMember = async (req, res, next) => {
  try {
    const { token } = req.body;
    if (!token) return next(new AppError("Verification token is required.", 400));
    const targetDb = await resolveDbFromToken(token);
    const [users] = await targetDb.execute(
      "SELECT user_id, emailVerified, verifyTokenExpiry FROM users WHERE verifyToken = ?", [token]
    );
    if (users.length === 0) return next(new AppError("Invalid verification link.", 400));
    if (users[0].emailVerified) return next(new AppError("Email is already verified.", 400));
    if (new Date() > new Date(users[0].verifyTokenExpiry)) return next(new AppError("Verification link has expired.", 400));
    await targetDb.execute(
      "UPDATE users SET emailVerified = TRUE, status = 'APPROVED', verifyToken = NULL WHERE user_id = ?",
      [users[0].user_id]
    );
    res.json({ success: true, message: "Email verified successfully. You can now log in." });
  } catch (error) { next(error); }
};

// GET INVITE DETAILS
const getInviteDetails = async (req, res, next) => {
  try {
    const { token } = req.params;
    const targetDb = await resolveDbFromToken(token);
    const [invitations] = await targetDb.execute(
      "SELECT email, role, status, expires_at FROM invitations WHERE token = ?", [token]
    );
    if (invitations.length === 0) return next(new AppError("Invitation not found.", 404));
    const invite = invitations[0];
    if (invite.status === 'ACCEPTED') return next(new AppError("Invitation has already been accepted.", 400));
    if (new Date() > new Date(invite.expires_at) || invite.status === 'EXPIRED')
      return next(new AppError("Invitation has expired.", 400));
    res.json({ success: true, data: { email: invite.email, role: invite.role } });
  } catch (error) { next(error); }
};

// ACCEPT INVITE
const acceptInvite = async (req, res, next) => {
  try {
    const { token, name, password, phone } = req.body;
    if (!token || !name || !password) return next(new AppError("Missing required fields.", 400));
    if (password.length < 6) return next(new AppError("Password must be at least 6 characters.", 400));
    const targetDb = await resolveDbFromToken(token);
    const [invitations] = await targetDb.execute(
      "SELECT invite_id, email, role, status, expires_at FROM invitations WHERE token = ?", [token]
    );
    if (invitations.length === 0) return next(new AppError("Invalid invitation token.", 400));
    const invite = invitations[0];
    if (invite.status === 'ACCEPTED') return next(new AppError("Invitation has already been accepted.", 400));
    if (new Date() > new Date(invite.expires_at)) return next(new AppError("Invitation has expired.", 400));
    const [existingRows] = await targetDb.execute("SELECT user_id, status FROM users WHERE email = ?", [invite.email]);
    if (existingRows.length > 0 && existingRows[0].status !== 'DELETED')
      return next(new AppError("Email is already registered.", 409));

    const hashed = await bcrypt.hash(password, 12);

    if (existingRows.length > 0 && existingRows[0].status === 'DELETED') {
      // Restore soft-deleted user
      await targetDb.execute(
        `UPDATE users SET name = ?, password = ?, role = ?, phone = ?, status = 'APPROVED', emailVerified = TRUE, isActive = TRUE WHERE user_id = ?`,
        [name, hashed, invite.role, phone || null, existingRows[0].user_id]
      );
    } else {
      // Insert new user
      const userId = uuidv4();
      await targetDb.execute(
        `INSERT INTO users (user_id, name, email, password, role, phone, status, emailVerified, isActive)
         VALUES (?, ?, ?, ?, ?, ?, 'APPROVED', TRUE, TRUE)`,
        [userId, name, invite.email, hashed, invite.role, phone || null]
      );
    }

    // Get dbName from token format (db_name::hex)
    let dbName = null;
    if (token.includes('::')) {
      dbName = token.split('::')[0];
    } else {
      const [tenants] = await masterPool.execute("SELECT db_name FROM tenants WHERE owner_email = ?", [invite.email]);
      if (tenants.length > 0) dbName = tenants[0].db_name;
    }

    if (dbName) {
      const userType = dbName.startsWith('supplier_') ? 'supplier' : 'shop';
      await masterPool.execute(
        `INSERT IGNORE INTO global_users (email, db_name, user_type) VALUES (?, ?, ?)`,
        [invite.email, dbName, userType]
      );
    }

    await targetDb.execute("UPDATE invitations SET status = 'ACCEPTED' WHERE invite_id = ?", [invite.invite_id]);
    res.status(201).json({ success: true, message: "Account created successfully. You can now log in." });
  } catch (error) { next(error); }
};

export {
  signup, verifyEmail, resendOtp, login, googleAuth,
  forgotPassword, verifyResetOtp, resetPassword,
  refreshToken, logout, getMe, changePassword,
  verifyMember, getInviteDetails, acceptInvite
};
