import bcrypt            from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { pool }          from "../../config/database.js";
import { masterPool }    from "../../config/masterDatabase.js";
import { getTenantPool } from "../../middleware/tenant.middleware.js";
import { generateTokenPair, verifyRefreshToken } from "../../config/jwt.js";
import { sendVerificationEmail } from "../../config/email.js";
import { AppError }      from "../../middleware/errorHandler.js";

// ─── SIGNUP (legacy — single tenant) ─────────────────
const signup = async (req, res, next) => {
  try {
    const { name, email, password, role, phone } = req.body;

    if (!name || !email || !password)
      return next(new AppError("Name, email and password are required.", 400));

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email))
      return next(new AppError("Please enter a valid email address.", 400));

    if (password.length < 6)
      return next(new AppError("Password must be at least 6 characters.", 400));

    const validRoles = ["admin", "owner", "cashier"];
    const userRole   = validRoles.includes(role) ? role : "cashier";

    const [existing] = await pool.execute(
      "SELECT user_id FROM users WHERE email = ?", [email]
    );
    if (existing.length > 0)
      return next(new AppError("Email already registered.", 409));

    const hashedPassword    = await bcrypt.hash(password, 12);
    const verifyToken       = uuidv4().replace(/-/g, "");
    const verifyTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const userId            = uuidv4();

    await pool.execute(
      `INSERT INTO users 
        (user_id, name, email, password, role, phone, status, emailVerified, verifyToken, verifyTokenExpiry)
       VALUES (?, ?, ?, ?, ?, ?, 'PENDING', FALSE, ?, ?)`,
      [userId, name, email, hashedPassword, userRole, phone || null, verifyToken, verifyTokenExpiry]
    );

    try {
      await sendVerificationEmail(email, name, verifyToken);
    } catch (emailError) {
      console.warn("Email sending failed:", emailError.message);
    }

    res.status(201).json({
      success: true,
      message: "Account created! Please check your email to verify your account.",
    });
  } catch (error) { next(error); }
};

// ─── VERIFY EMAIL ─────────────────────────────────────
const verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.query;
    if (!token) return next(new AppError("Verification token is required.", 400));

    const [rows] = await pool.execute(
      `SELECT user_id, name, email, verifyTokenExpiry 
       FROM users WHERE verifyToken = ? AND emailVerified = FALSE`,
      [token]
    );

    if (rows.length === 0)
      return next(new AppError("Invalid or already used verification link.", 400));

    const user = rows[0];
    if (new Date() > new Date(user.verifyTokenExpiry))
      return next(new AppError("Verification link has expired. Please signup again.", 400));

    await pool.execute(
      `UPDATE users SET emailVerified = TRUE, verifyToken = NULL, verifyTokenExpiry = NULL 
       WHERE user_id = ?`,
      [user.user_id]
    );

    res.json({
      success: true,
      message: "Email verified successfully!",
    });
  } catch (error) { next(error); }
};

// ─── LOGIN ────────────────────────────────────────────
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return next(new AppError("Email and password are required.", 400));

    // Find which tenant this email belongs to
    const [tenantRows] = await masterPool.execute(
      `SELECT t.tenant_id, t.db_name, t.status
       FROM tenants t
       WHERE t.owner_email = ?`,
      [email]
    );

    let db;
    let dbName = null;

    if (tenantRows.length > 0) {
      if (tenantRows[0].status === 'SUSPENDED')
        return next(new AppError("Your shop has been suspended.", 403));
      dbName = tenantRows[0].db_name;
      db     = await getTenantPool(dbName);
    } else {
      // Staff login — use default pool for now
      db = pool;
    }

    const [rows] = await db.execute(
      "SELECT * FROM users WHERE email = ?", [email]
    );

    if (rows.length === 0)
      return next(new AppError("Invalid email or password.", 401));

    const user = rows[0];

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid)
      return next(new AppError("Invalid email or password.", 401));

    if (user.status === "PENDING")
      return next(new AppError("Your account is pending approval.", 403));
    if (user.status === "REJECTED")
      return next(new AppError("Your account was rejected.", 403));
    if (!user.isActive)
      return next(new AppError("Your account has been deactivated.", 403));

    // Include dbName in token so middleware knows which DB to use
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
        tenant: tenantRows.length > 0 ? {
          tenantId: tenantRows[0].tenant_id,
          dbName:   tenantRows[0].db_name,
        } : null,
      },
    });
  } catch (error) { next(error); }
};

// ─── REFRESH TOKEN ────────────────────────────────────
const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken)
      return next(new AppError("Refresh token is required.", 400));

    const decoded = verifyRefreshToken(refreshToken);

    // Find correct DB from master
    const [tenantRows] = await masterPool.execute(
      "SELECT db_name FROM tenants WHERE owner_email = ?",
      [decoded.email]
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

// ─── LOGOUT ───────────────────────────────────────────
const logout = async (req, res, next) => {
  try {
    await req.db.execute(
      "UPDATE users SET refreshToken = NULL WHERE user_id = ?",
      [req.user.user_id]
    );
    res.json({ success: true, message: "Logged out successfully." });
  } catch (error) { next(error); }
};

// ─── GET ME ───────────────────────────────────────────
const getMe = async (req, res, next) => {
  try {
    const [rows] = await req.db.execute(
      `SELECT user_id, name, email, role, phone, avatar, 
              isActive, status, createdAt 
       FROM users WHERE user_id = ?`,
      [req.user.user_id]
    );
    res.json({ success: true, data: rows[0] });
  } catch (error) { next(error); }
};

// ─── CHANGE PASSWORD ──────────────────────────────────
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword)
      return next(new AppError("Both passwords are required.", 400));

    if (newPassword.length < 6)
      return next(new AppError("New password must be at least 6 characters.", 400));

    const [rows] = await req.db.execute(
      "SELECT password FROM users WHERE user_id = ?", [req.user.user_id]
    );

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
  signup, verifyEmail, login, refreshToken, logout, getMe, changePassword,
};