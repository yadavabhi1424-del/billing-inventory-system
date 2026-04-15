import bcrypt            from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import crypto            from "crypto";
import { AppError }      from "../../middleware/errorHandler.js";
import { sendVerificationEmail, sendInvitationEmail } from "../../config/email.js";

const getAllUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, role, status, search } = req.query;
    const offset     = (parseInt(page) - 1) * parseInt(limit);
    const conditions = ["status != 'DELETED'"];
    const params     = [];

    if (role)   { conditions.push("role = ?");                                        params.push(role); }
    if (status) { conditions.push("status = ?");                                      params.push(status); }
    if (search) { conditions.push("(name LIKE ? OR email LIKE ? OR phone LIKE ?)");  params.push(`%${search}%`, `%${search}%`, `%${search}%`); }

    const where = conditions.join(" AND ");

    const [users] = await req.db.execute(
      `SELECT user_id, name, email, role, phone, avatar,
              isActive, status, emailVerified, createdAt
       FROM users WHERE ${where}
       ORDER BY createdAt DESC
       LIMIT ${parseInt(limit)} OFFSET ${offset}`,
      params
    );

    const [[{ total }]] = await req.db.execute(
      `SELECT COUNT(*) as total FROM users WHERE ${where}`, params
    );

    res.json({
      success: true, data: users,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (error) { next(error); }
};

const getUserById = async (req, res, next) => {
  try {
    const [rows] = await req.db.execute(
      `SELECT user_id, name, email, role, phone, avatar,
              isActive, status, emailVerified, createdAt
       FROM users WHERE user_id = ?`,
      [req.params.id]
    );
    if (rows.length === 0) return next(new AppError("User not found.", 404));
    res.json({ success: true, data: rows[0] });
  } catch (error) { next(error); }
};

const createUser = async (req, res, next) => {
  try {
    const { name, email, password, role, phone } = req.body;
    if (!name || !email || !password)
      return next(new AppError("Name, email and password are required.", 400));

    const [existing] = await req.db.execute(
      "SELECT user_id, status FROM users WHERE email = ?", [email]
    );
    
    if (existing.length > 0) {
      const user = existing[0];
      if (user.status === 'DELETED') {
        // RESTORE: Update existing record instead of throwing error
        const hashed = await bcrypt.hash(password, 12);
        await req.db.execute(
          `UPDATE users SET name = ?, password = ?, role = ?, phone = ?, status = 'APPROVED', emailVerified = TRUE, isActive = TRUE WHERE user_id = ?`,
          [name, hashed, role || "CASHIER", phone || null, user.user_id]
        );
        
        // Ensure they are in global mapping
        await req.masterPool.execute(
          `INSERT IGNORE INTO global_users (email, db_name, user_type) VALUES (?, ?, 'shop')`,
          [email, req.dbName]
        );

        return res.status(200).json({
          success: true, message: "User account restored and updated.",
          data: { user_id: user.user_id, name, email, role: role || "CASHIER", status: 'APPROVED' }
        });
      }
      return next(new AppError("Email already registered.", 409));
    }

    const hashed = await bcrypt.hash(password, 12);
    const userId = uuidv4();
    let dbMarker = req.dbName ? `${req.dbName}::` : '';
    const token = dbMarker + crypto.randomBytes(32).toString('hex');

    await req.db.execute(
      `INSERT INTO users
        (user_id, name, email, password, role, phone, status, emailVerified, isActive, verifyToken, verifyTokenExpiry)
       VALUES (?, ?, ?, ?, ?, ?, 'PENDING', FALSE, TRUE, ?, DATE_ADD(NOW(), INTERVAL 24 HOUR))`,
      [userId, name, email, hashed, role || "CASHIER", phone || null, token]
    );

    await sendVerificationEmail(email, name, token);

    res.status(201).json({
      success: true, message: "User created successfully. Verification email sent.",
      data: { user_id: userId, name, email, role: role || "CASHIER", status: 'PENDING' },
    });
  } catch (error) { next(error); }
};

const updateUser = async (req, res, next) => {
  try {
    const { name, email, role, phone, isActive } = req.body;

    const [existing] = await req.db.execute(
      "SELECT user_id FROM users WHERE user_id = ?", [req.params.id]
    );
    if (existing.length === 0)
      return next(new AppError("User not found.", 404));

    await req.db.execute(
      `UPDATE users SET
        name     = COALESCE(?, name),
        email    = COALESCE(?, email),
        role     = COALESCE(?, role),
        phone    = COALESCE(?, phone),
        isActive = COALESCE(?, isActive)
       WHERE user_id = ?`,
      [name || null, email || null, role || null, phone || null,
       isActive !== undefined ? isActive : null, req.params.id]
    );

    res.json({ success: true, message: "User updated successfully." });
  } catch (error) { next(error); }
};

const deleteUser = async (req, res, next) => {
  try {
    if (req.params.id === req.user.user_id)
      return next(new AppError("You cannot delete your own account.", 400));

    // Prevent deleting OWNER
    const [rows] = await req.db.execute(
      "SELECT email, role FROM users WHERE user_id = ?", [req.params.id]
    );
    if (rows.length === 0)
      return next(new AppError("User not found.", 404));
    
    const userToDelete = rows[0];
    if (userToDelete.role === 'OWNER')
      return next(new AppError("Cannot delete the shop owner.", 400));

    // Remove from global mapping to stop routing to this DB
    for (const pool of [req.db, req.masterPool].filter(Boolean)) {
       // Just being safe, usually req.dbName is what we need
    }
    await req.masterPool.execute(
      "DELETE FROM global_users WHERE email = ? AND db_name = ?",
      [userToDelete.email, req.dbName]
    );

    // 2. EXPLICIT CHECK: Check for history in critical tables even if FKs are missing
    const [movements] = await req.db.execute("SELECT movement_id FROM stock_movements WHERE user_id = ? LIMIT 1", [req.params.id]);
    const [sales]     = await req.db.execute("SELECT transaction_id FROM transactions WHERE user_id = ? LIMIT 1", [req.params.id]);
    const [purchases] = await req.db.execute("SELECT po_id FROM purchase_orders WHERE user_id = ? LIMIT 1", [req.params.id]);
    
    const hasHistory = movements.length > 0 || sales.length > 0 || purchases.length > 0;

    if (hasHistory) {
      await req.db.execute(
        "UPDATE users SET status = 'DELETED', isActive = FALSE WHERE user_id = ?",
        [req.params.id]
      );
    } else {
      try {
        await req.db.execute(
          "DELETE FROM users WHERE user_id = ?", [req.params.id]
        );
      } catch (err) {
        if (err.code === 'ER_ROW_IS_REFERENCED_2') {
          await req.db.execute(
            "UPDATE users SET status = 'DELETED', isActive = FALSE WHERE user_id = ?",
            [req.params.id]
          );
        } else { throw err; }
      }
    }
    res.json({ success: true, message: "User deleted successfully." });
  } catch (error) { next(error); }
};

const updateMyProfile = async (req, res, next) => {
  try {
    const { name, phone } = req.body;
    await req.db.execute(
      `UPDATE users SET
        name  = COALESCE(?, name),
        phone = COALESCE(?, phone)
       WHERE user_id = ?`,
      [name || null, phone || null, req.user.user_id]
    );
    res.json({ success: true, message: "Profile updated." });
  } catch (error) { next(error); }
};

const inviteUser = async (req, res, next) => {
  try {
    const { email, role } = req.body;
    if (!email || !role) return next(new AppError("Email and role are required.", 400));

    const [existingUser] = await req.db.execute("SELECT user_id FROM users WHERE email = ? AND status != 'DELETED'", [email]);
    if (existingUser.length > 0) return next(new AppError("User is already registered.", 409));

    await req.db.execute("DELETE FROM invitations WHERE email = ?", [email]);

    let dbMarker = req.dbName ? `${req.dbName}::` : '';
    const token = dbMarker + crypto.randomBytes(32).toString('hex');
    const inviteId = uuidv4();

    await req.db.execute(
      `INSERT INTO invitations
        (invite_id, email, role, token, invited_by, status, expires_at)
       VALUES (?, ?, ?, ?, ?, 'PENDING', DATE_ADD(NOW(), INTERVAL 7 DAY))`,
      [inviteId, email, role, token, req.user.user_id]
    );

    await sendInvitationEmail(email, req.user.name, role, token);

    res.status(201).json({
      success: true, message: "Invitation sent successfully."
    });
  } catch (error) { next(error); }
};

export { getAllUsers, getUserById, createUser, updateUser, deleteUser, updateMyProfile, inviteUser };