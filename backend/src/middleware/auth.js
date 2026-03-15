const { verifyAccessToken } = require("../config/jwt");
const { pool }              = require("../config/database");
const { AppError }          = require("./errorHandler");

// ─── Must be logged in ────────────────────────────────
const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next(new AppError("Access token required. Please login.", 401));
    }

    const token   = authHeader.split(" ")[1];
    const decoded = verifyAccessToken(token);

    const [rows] = await pool.execute(
      "SELECT user_id, name, email, role, isActive, status FROM users WHERE user_id = ?",
      [decoded.id]
    );

    if (rows.length === 0) {
      return next(new AppError("User not found.", 401));
    }

    const user = rows[0];

    if (!user.isActive) {
      return next(new AppError("Your account has been deactivated.", 403));
    }

    if (user.status !== "APPROVED") {
      return next(new AppError("Your account is not approved yet.", 403));
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return next(new AppError("Token expired. Please refresh.", 401));
    }
    return next(new AppError("Invalid token.", 401));
  }
};

// ─── Role guard ───────────────────────────────────────
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError(
          `Access denied. Required: ${roles.join(" or ")}. Your role: ${req.user.role}`,
          403
        )
      );
    }
    next();
  };
};

// ─── Shortcuts ────────────────────────────────────────
const adminOnly    = authorize("ADMIN");
const adminOrOwner = authorize("ADMIN", "OWNER");
const allRoles     = authorize("ADMIN", "OWNER", "CASHIER");

module.exports = { protect, authorize, adminOnly, adminOrOwner, allRoles };