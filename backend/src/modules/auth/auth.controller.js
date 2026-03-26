import bcrypt            from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { OAuth2Client }  from "google-auth-library";
import { pool }          from "../../config/database.js";
import { masterPool }    from "../../config/masterDatabase.js";
import { getTenantPool, provisionTenant } from "../../middleware/tenant.middleware.js";
import { generateTokenPair, verifyRefreshToken } from "../../config/jwt.js";
import { sendOtpEmail }  from "../../config/email.js";
import { AppError }      from "../../middleware/errorHandler.js";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ── Helper: generate 6-digit numeric OTP ──────────────────────
function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// ── Helper: upsert OTP (delete old + insert new) ──────────────
async function saveOtp(db, userId) {
  await db.execute("DELETE FROM email_otps WHERE user_id = ?", [userId]);
  const code   = generateOtp();
  const expiry = new Date(Date.now() + 5 * 60 * 1000); // 5 min
  await db.execute(
    "INSERT INTO email_otps (id, user_id, code, expiry) VALUES (?, ?, ?, ?)",
    [uuidv4(), userId, code, expiry]
  );
  return code;
}

// ── Helper: resolve DB for a given owner email ─────────────────
async function resolveDb(email) {
  const [rows] = await masterPool.execute(
    `SELECT t.tenant_id, t.db_name, t.status
     FROM tenants t WHERE t.owner_email = ?`,
    [email]
  );
  if (rows.length > 0) {
    if (rows[0].status === "SUSPENDED")
      throw new AppError("Your shop has been suspended.", 403);
    const db = await getTenantPool(rows[0].db_name);
    return { db, tenantRow: rows[0], dbName: rows[0].db_name };
  }
  return { db: pool, tenantRow: null, dbName: null };
}

// ══════════════════════════════════════════════════════════════
//  SIGNUP  →  create pending user in default DB + send OTP
//  (no tenant DB created here)
// ══════════════════════════════════════════════════════════════
const signup = async (req, res, next) => {
  try {
    const { name, email, password, phone, shopType = 'other' } = req.body;

    if (!name || !email || !password)
      return next(new AppError("Name, email, and password are required.", 400));

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email))
      return next(new AppError("Please enter a valid email address.", 400));

    if (password.length < 6)
      return next(new AppError("Password must be at least 6 characters.", 400));

    // Check if tenant already exists for this email (fully registered)
    const [tenantCheck] = await masterPool.execute(
      "SELECT tenant_id FROM tenants WHERE owner_email = ?", [email]
    );
    if (tenantCheck.length > 0)
      return next(new AppError("Email already registered.", 409));

    // Check if a pending (unverified) user already exists in the staging pool
    const [existing] = await pool.execute(
      "SELECT user_id, emailVerified FROM users WHERE email = ?", [email]
    );

    if (existing.length > 0) {
      if (existing[0].emailVerified)
        return next(new AppError("Email already registered.", 409));
      // Unverified — resend a fresh OTP
      const code = await saveOtp(pool, existing[0].user_id);
      try { await sendOtpEmail(email, name, code); } catch {}
      return res.status(200).json({
        success: true,
        message: "A new verification code has been sent to your email.",
      });
    }

    // Create a new pending user in the default (staging) pool
    const hashedPassword = await bcrypt.hash(password, 12);
    const userId         = uuidv4();

    await pool.execute(
      `INSERT INTO users
        (user_id, name, email, password, provider, role, phone, status, emailVerified, isActive)
       VALUES (?, ?, ?, ?, 'local', 'OWNER', ?, 'PENDING', FALSE, FALSE)`,
      [userId, name, email, hashedPassword, phone || null]
    );

    // Store shopName and shopType for use after OTP verification
    // We store them in a temp column or alongside OTP — simplest: store in OTP table as metadata
    // Instead we save to a JSON column on the user record by updating a notes/meta column
    // Simplest clean approach: store shopName in the users table verifyToken field temporarily
    await pool.execute(
      "UPDATE users SET verifyToken = ? WHERE user_id = ?",
      [JSON.stringify({ shopName, shopType }), userId]
    );

    const code = await saveOtp(pool, userId);
    try {
      await sendOtpEmail(email, name, code);
    } catch (emailError) {
      console.warn("OTP email failed:", emailError.message);
    }

    res.status(201).json({
      success: true,
      message: "Account created! Please enter the verification code sent to your email.",
    });
  } catch (error) { next(error); }
};

// ══════════════════════════════════════════════════════════════
//  VERIFY EMAIL  →  POST { email, code }
//  OTP check  →  provision tenant DB  →  create real user
// ══════════════════════════════════════════════════════════════
const verifyEmail = async (req, res, next) => {
  try {
    const { email, code } = req.body;
    if (!email || !code)
      return next(new AppError("Email and verification code are required.", 400));

    // ── Step 1: find the pending (staging) user ───────────────
    const [userRows] = await pool.execute(
      "SELECT user_id, name, email, password, phone, verifyToken FROM users WHERE email = ? AND emailVerified = FALSE",
      [email]
    );
    if (userRows.length === 0)
      return next(new AppError("Account not found or already verified.", 404));

    const stagingUser = userRows[0];

    // ── Step 2: validate OTP ──────────────────────────────────
    const [otpRows] = await pool.execute(
      "SELECT id, expiry FROM email_otps WHERE user_id = ? AND code = ? ORDER BY createdAt DESC LIMIT 1",
      [stagingUser.user_id, code]
    );

    if (otpRows.length === 0)
      return next(new AppError("Invalid verification code.", 400));

    if (new Date() > new Date(otpRows[0].expiry))
      return next(new AppError("Verification code has expired. Please request a new one.", 400));

    // ── Step 3: provision tenant (idempotent) ─────────────────
    const [existingTenant] = await masterPool.execute(
      "SELECT tenant_id, db_name FROM tenants WHERE owner_email = ?", [email]
    );

    let tenantId, dbName;

    if (existingTenant.length > 0) {
      // Already provisioned (edge case: verify called twice)
      tenantId = existingTenant[0].tenant_id;
      dbName   = existingTenant[0].db_name;
    } else {
      // Parse shop metadata stored in verifyToken during signup
      let shopName = stagingUser.name + "'s Shop";
      let shopType = 'other';
      try {
        const meta = JSON.parse(stagingUser.verifyToken || '{}');
        if (meta.shopName) shopName = meta.shopName;
        if (meta.shopType) shopType = meta.shopType;
      } catch {}

      tenantId      = uuidv4();
      const shopSlug = shopName.toLowerCase()
        .replace(/[^a-z0-9]/g, '_').slice(0, 40) + '_' + tenantId.slice(0, 6);
      dbName        = `${process.env.TENANT_DB_PREFIX}${tenantId.replace(/-/g,'').slice(0, 16)}`;

      // Insert tenant record in master DB
      await masterPool.execute(
        `INSERT INTO tenants
          (tenant_id, shop_name, shop_slug, owner_name, owner_email, owner_phone, db_name, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'TRIAL')`,
        [tenantId, shopName, shopSlug, stagingUser.name, email, stagingUser.phone || null, dbName]
      );

      // Attach a FREE subscription
      await masterPool.execute(
        `INSERT INTO subscriptions
          (sub_id, tenant_id, plan, status, max_users, max_products, ai_enabled, reports_enabled, expires_at)
         SELECT ?, ?, plan_name, 'ACTIVE', max_users, max_products, ai_enabled, reports_enabled,
                DATE_ADD(NOW(), INTERVAL 30 DAY)
         FROM plans WHERE plan_name = 'FREE'`,
        [uuidv4(), tenantId]
      );

      // Create the tenant's MySQL database and run all schema migrations
      await provisionTenant(tenantId, dbName, shopType);
    }

    // ── Step 4: create the verified user in the tenant DB ─────
    const tenantDb = await getTenantPool(dbName);

    const [existingUser] = await tenantDb.execute(
      "SELECT user_id FROM users WHERE email = ?", [email]
    );

    if (existingUser.length === 0) {
      await tenantDb.execute(
        `INSERT INTO users
          (user_id, name, email, password, provider, role, phone, status, emailVerified, isActive)
         VALUES (?, ?, ?, ?, 'local', 'OWNER', ?, 'APPROVED', TRUE, TRUE)`,
        [stagingUser.user_id, stagingUser.name, email, stagingUser.password, stagingUser.phone || null]
      );
    }

    // ── Step 5: clean up staging records ─────────────────────
    await pool.execute("DELETE FROM email_otps WHERE user_id = ?", [stagingUser.user_id]);
    await pool.execute("DELETE FROM users WHERE user_id = ? AND emailVerified = FALSE", [stagingUser.user_id]);

    res.json({
      success: true,
      message: "Email verified! Your shop is ready. You can now sign in.",
    });
  } catch (error) { next(error); }
};

// ══════════════════════════════════════════════════════════════
//  RESEND OTP  →  POST { email }
// ══════════════════════════════════════════════════════════════
const resendOtp = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return next(new AppError("Email is required.", 400));

    // Pending users live in the default pool until verified
    const [rows] = await pool.execute(
      "SELECT user_id, name, emailVerified FROM users WHERE email = ? AND emailVerified = FALSE",
      [email]
    );
    if (rows.length === 0)
      return next(new AppError("Account not found or already verified.", 404));

    const code = await saveOtp(pool, rows[0].user_id);
    try {
      await sendOtpEmail(email, rows[0].name, code);
    } catch (emailError) {
      console.warn("OTP email failed:", emailError.message);
    }

    res.json({ success: true, message: "A new verification code has been sent." });
  } catch (error) { next(error); }
};

// ══════════════════════════════════════════════════════════════
//  LOGIN  →  email + password
// ══════════════════════════════════════════════════════════════
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return next(new AppError("Email and password are required.", 400));

    const { db, tenantRow, dbName } = await resolveDb(email);

    const [rows] = await db.execute("SELECT * FROM users WHERE email = ?", [email]);

    if (rows.length === 0)
      return next(new AppError("Account not found. Please sign up.", 404));

    const user = rows[0];

    // Google-only account trying to use password login
    if (user.provider === "google" && !user.password)
      return next(new AppError("This account uses Google Sign-In. Please sign in with Google.", 400));

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid)
      return next(new AppError("Incorrect password.", 401));

    if (!user.emailVerified)
      return next(new AppError("Email not verified. Please check your inbox for the verification code.", 403));

    if (user.status === "PENDING")
      return next(new AppError("Your account is pending approval.", 403));
    if (user.status === "REJECTED")
      return next(new AppError("Your account was rejected. Contact your administrator.", 403));
    if (!user.isActive)
      return next(new AppError("Your account has been deactivated.", 403));

    const tokens = generateTokenPair({ ...user, dbName });

    await db.execute(
      "UPDATE users SET refreshToken = ? WHERE user_id = ?",
      [tokens.refreshToken, user.user_id]
    );

    const { password: _, refreshToken: __, verifyToken: ___, ...safeUser } = user;
    safeUser.role = safeUser.role.toLowerCase();

    res.json({
      success: true,
      message: "Login successful.",
      data: {
        user: safeUser,
        ...tokens,
        tenant: tenantRow ? { tenantId: tenantRow.tenant_id, dbName: tenantRow.db_name } : null,
      },
    });
  } catch (error) { next(error); }
};

// ══════════════════════════════════════════════════════════════
//  GOOGLE AUTH  →  POST { idToken }
// ══════════════════════════════════════════════════════════════
const googleAuth = async (req, res, next) => {
  try {
    const { idToken } = req.body;
    if (!idToken) return next(new AppError("Google ID token is required.", 400));

    // Cryptographically verify the ID token signature, audience, and expiry
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { email, name, picture } = payload;

    if (!email) return next(new AppError("Could not retrieve email from Google.", 400));

    // Try to find the tenant for this email
    const [tenantRows] = await masterPool.execute(
      "SELECT tenant_id, db_name, status FROM tenants WHERE owner_email = ?",
      [email]
    );

    let db     = pool;
    let dbName = null;
    let tenantRow = null;

    if (tenantRows.length > 0) {
      if (tenantRows[0].status === "SUSPENDED")
        return next(new AppError("Your shop has been suspended.", 403));
      dbName    = tenantRows[0].db_name;
      tenantRow = tenantRows[0];
      db        = await getTenantPool(dbName);
    }
    console.log("Using DB:", dbName);

    const [rows] = await db.execute(
      "SELECT * FROM users WHERE email = ?", [email]
    );

    let user;
    if (rows.length > 0) {
      user = rows[0];
      if (picture && user.avatar !== picture) {
        await db.execute("UPDATE users SET avatar = ? WHERE user_id = ?", [picture, user.user_id]);
        user.avatar = picture;
      }
    } else {
      // New Google user
      const userId   = uuidv4();
      const userName = name || email.split("@")[0];
      await db.execute(
        `INSERT INTO users
          (user_id, name, email, password, provider, role, avatar, status, isActive, emailVerified)
         VALUES (?, ?, ?, NULL, 'google', 'OWNER', ?, 'APPROVED', TRUE, TRUE)`,
        [userId, userName, email, picture || null]
      );
      const [newRows] = await db.execute("SELECT * FROM users WHERE user_id = ?", [userId]);
      user = newRows[0];
    }

    if (!user.isActive)
      return next(new AppError("Your account has been deactivated.", 403));

    const tokens = generateTokenPair({ ...user, dbName });
    await db.execute(
      "UPDATE users SET refreshToken = ? WHERE user_id = ?",
      [tokens.refreshToken, user.user_id]
    );

    const { password: _, refreshToken: __, verifyToken: ___, ...safeUser } = user;
    safeUser.role = safeUser.role.toLowerCase();

    res.json({
      success: true,
      message: "Google sign-in successful.",
      data: {
        user: safeUser,
        ...tokens,
        tenant: tenantRow ? { tenantId: tenantRow.tenant_id, dbName: tenantRow.db_name } : null,
      },
    });
  } catch (error) { next(error); }
};

// ══════════════════════════════════════════════════════════════
//  REFRESH TOKEN
// ══════════════════════════════════════════════════════════════
const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken)
      return next(new AppError("Refresh token is required.", 400));

    const decoded = verifyRefreshToken(refreshToken);

    const [tenantRows] = await masterPool.execute(
      "SELECT db_name FROM tenants WHERE owner_email = ?", [decoded.email]
    );
    const dbName = tenantRows.length > 0 ? tenantRows[0].db_name : null;
    const db     = dbName ? await getTenantPool(dbName) : pool;

    const [rows] = await db.execute(
      "SELECT user_id, name, email, role, refreshToken FROM users WHERE user_id = ?",
      [decoded.id]
    );

    if (rows.length === 0 || rows[0].refreshToken !== refreshToken)
      return next(new AppError("Invalid refresh token.", 401));

    const tokens = generateTokenPair({ ...rows[0], dbName });
    await db.execute(
      "UPDATE users SET refreshToken = ? WHERE user_id = ?",
      [tokens.refreshToken, rows[0].user_id]
    );

    res.json({ success: true, message: "Token refreshed.", data: tokens });
  } catch (error) { next(error); }
};

// ══════════════════════════════════════════════════════════════
//  LOGOUT
// ══════════════════════════════════════════════════════════════
const logout = async (req, res, next) => {
  try {
    await req.db.execute(
      "UPDATE users SET refreshToken = NULL WHERE user_id = ?",
      [req.user.user_id]
    );
    res.json({ success: true, message: "Logged out successfully." });
  } catch (error) { next(error); }
};

// ══════════════════════════════════════════════════════════════
//  GET ME
// ══════════════════════════════════════════════════════════════
const getMe = async (req, res, next) => {
  try {
    const [rows] = await req.db.execute(
      `SELECT user_id, name, email, role, phone, avatar, provider,
              isActive, status, createdAt
       FROM users WHERE user_id = ?`,
      [req.user.user_id]
    );
    res.json({ success: true, data: rows[0] });
  } catch (error) { next(error); }
};

// ══════════════════════════════════════════════════════════════
//  CHANGE PASSWORD
// ══════════════════════════════════════════════════════════════
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword)
      return next(new AppError("Both passwords are required.", 400));
    if (newPassword.length < 6)
      return next(new AppError("New password must be at least 6 characters.", 400));

    const [rows] = await req.db.execute(
      "SELECT password, provider FROM users WHERE user_id = ?", [req.user.user_id]
    );

    if (rows[0].provider === "google" && !rows[0].password)
      return next(new AppError("Google accounts cannot change password here.", 400));

    const isValid = await bcrypt.compare(currentPassword, rows[0].password);
    if (!isValid)
      return next(new AppError("Current password is incorrect.", 400));

    const hashed = await bcrypt.hash(newPassword, 12);
    await req.db.execute(
      "UPDATE users SET password = ? WHERE user_id = ?",
      [hashed, req.user.user_id]
    );

    res.json({ success: true, message: "Password changed successfully." });
  } catch (error) { next(error); }
};

export {
  signup, verifyEmail, resendOtp, login, googleAuth,
  refreshToken, logout, getMe, changePassword,
};