import { verifyAccessToken }  from "../config/jwt.js";
import { masterPool }         from "../config/masterDatabase.js";
import { getTenantPool }      from "./tenant.middleware.js";
import { pool }               from "../config/database.js";
import { AppError }           from "./errorHandler.js";

const protect = async (req, res, next) => {
  try {
    console.log("USING DB:", req.dbName);
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer "))
      return next(new AppError("Access token required. Please login.", 401));

    const token   = authHeader.split(" ")[1];
    const decoded = verifyAccessToken(token);

    // Get correct DB — use dbName from token if present
    let db;
    if (decoded.dbName) {
      db = await getTenantPool(decoded.dbName);
      req.dbName = decoded.dbName;
    } else {
      // Fallback — find tenant by email from master
      const [tenantRows] = await masterPool.execute(
        `SELECT t.db_name FROM tenants t
         WHERE t.owner_email = ? AND t.status != 'SUSPENDED'`,
        [decoded.email]
      );
      if (tenantRows.length > 0) {
        req.dbName = tenantRows[0].db_name;
        db = await getTenantPool(tenantRows[0].db_name);
      } else {
        req.dbName = process.env.DB_NAME;
        db = pool;
      }
    }

    const [rows] = await db.execute(
      "SELECT user_id, name, email, role, isActive, status FROM users WHERE user_id = ?",
      [decoded.id]
    );

    if (rows.length === 0)
      return next(new AppError("User not found.", 401));

    const user = rows[0];
    if (!user.isActive)
      return next(new AppError("Your account has been deactivated.", 403));
    if (user.status !== "APPROVED")
      return next(new AppError("Your account is not approved yet.", 403));

    req.user          = user;
    req.user.userType = decoded.userType || 'shop';
    req.db            = db;
    // req.dbName is already set in the if/else block above
    req.masterPool    = masterPool;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError")
      return next(new AppError("Token expired. Please refresh.", 401));
    return next(new AppError("Invalid token.", 401));
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.map(r => r.toLowerCase()).includes(req.user.role.toLowerCase())) {
      return next(new AppError(
        `Access denied. Required: ${roles.join(" or ")}. Your role: ${req.user.role}`, 403
      ));
    }
    next();
  };
};

const adminOnly    = authorize("ADMIN", "OWNER");
const adminOrOwner = authorize("ADMIN", "OWNER");
const allRoles     = authorize("ADMIN", "OWNER", "MANAGER", "CASHIER", "STAFF");

export { protect, authorize, adminOnly, adminOrOwner, allRoles };
