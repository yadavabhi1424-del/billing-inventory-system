import bcrypt                from "bcryptjs";
import { v4 as uuidv4 }     from "uuid";
import { pool }              from "../../config/database.js";
import { AppError }          from "../../middleware/errorHandler.js";
import { sendApprovalEmail, sendRejectionEmail } from "../../config/email.js";

// ─── GET ALL USERS ────────────────────────────────────
const getAllUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, role, status, search } = req.query;
    const offset     = (parseInt(page) - 1) * parseInt(limit);
    const conditions = ["1=1"];
    const params     = [];

    if (role)   { conditions.push("role = ?");                                          params.push(role); }
    if (status) { conditions.push("status = ?");                                        params.push(status); }
    if (search) { conditions.push("(name LIKE ? OR email LIKE ? OR phone LIKE ?)");    params.push(`%${search}%`, `%${search}%`, `%${search}%`); }

    const where = conditions.join(" AND ");

    const [users] = await pool.execute(
      `SELECT user_id, name, email, role, phone, avatar,
              isActive, status, emailVerified,
              approvedBy, approvedAt, createdAt
       FROM users WHERE ${where}
       ORDER BY createdAt DESC
       LIMIT ${parseInt(limit)} OFFSET ${offset}`,
      params
    );

    const [[{ total }]] = await pool.execute(
      `SELECT COUNT(*) as total FROM users WHERE ${where}`, params
    );

    res.json({
      success: true,
      data: users,
      pagination: {
        page: parseInt(page), limit: parseInt(limit), total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) { next(error); }
};

// ─── GET PENDING USERS ────────────────────────────────
const getPendingUsers = async (req, res, next) => {
  try {
    const [users] = await pool.execute(
      `SELECT user_id, name, email, role, phone,
              emailVerified, status, createdAt
       FROM users WHERE status = 'PENDING' ORDER BY createdAt ASC`
    );
    res.json({ success: true, data: users, count: users.length });
  } catch (error) { next(error); }
};

// ─── GET USER BY ID ───────────────────────────────────
const getUserById = async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      `SELECT user_id, name, email, role, phone, avatar,
              isActive, status, emailVerified, createdAt
       FROM users WHERE user_id = ?`,
      [req.params.id]
    );
    if (rows.length === 0) return next(new AppError("User not found.", 404));
    res.json({ success: true, data: rows[0] });
  } catch (error) { next(error); }
};

// ─── CREATE USER ──────────────────────────────────────
const createUser = async (req, res, next) => {
  try {
    const { name, email, password, role, phone } = req.body;
    if (!name || !email || !password)
      return next(new AppError("Name, email and password are required.", 400));

    const [existing] = await pool.execute(
      "SELECT user_id FROM users WHERE email = ?", [email]
    );
    if (existing.length > 0)
      return next(new AppError("Email already registered.", 409));

    const hashed = await bcrypt.hash(password, 12);
    const userId = uuidv4();

    await pool.execute(
      `INSERT INTO users
        (user_id, name, email, password, role, phone, status, emailVerified, isActive)
       VALUES (?, ?, ?, ?, ?, ?, 'APPROVED', TRUE, TRUE)`,
      [userId, name, email, hashed, role || "CASHIER", phone || null]
    );

    res.status(201).json({
      success: true,
      message: "User created successfully.",
      data: { user_id: userId, name, email, role: role || "CASHIER" },
    });
  } catch (error) { next(error); }
};

// ─── UPDATE USER ──────────────────────────────────────
const updateUser = async (req, res, next) => {
  try {
    const { name, email, role, phone, isActive } = req.body;

    const [existing] = await pool.execute(
      "SELECT user_id FROM users WHERE user_id = ?", [req.params.id]
    );
    if (existing.length === 0)
      return next(new AppError("User not found.", 404));

    await pool.execute(
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

// ─── APPROVE USER ─────────────────────────────────────
const approveUser = async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      "SELECT * FROM users WHERE user_id = ?", [req.params.id]
    );
    if (rows.length === 0) return next(new AppError("User not found.", 404));

    const user = rows[0];
    if (user.status === "APPROVED")
      return next(new AppError("User is already approved.", 400));

    await pool.execute(
      `UPDATE users SET status = 'APPROVED', approvedBy = ?, approvedAt = NOW()
       WHERE user_id = ?`,
      [req.user.user_id, req.params.id]
    );

    try { await sendApprovalEmail(user.email, user.name, user.role); }
    catch (e) { console.warn("Approval email failed:", e.message); }

    res.json({ success: true, message: `${user.name} has been approved.` });
  } catch (error) { next(error); }
};

// ─── REJECT USER ──────────────────────────────────────
const rejectUser = async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      "SELECT * FROM users WHERE user_id = ?", [req.params.id]
    );
    if (rows.length === 0) return next(new AppError("User not found.", 404));

    const user = rows[0];
    if (user.status === "REJECTED")
      return next(new AppError("User is already rejected.", 400));
    if (user.user_id === req.user.user_id)
      return next(new AppError("You cannot reject yourself.", 400));

    await pool.execute(
      "UPDATE users SET status = 'REJECTED' WHERE user_id = ?", [req.params.id]
    );

    try { await sendRejectionEmail(user.email, user.name); }
    catch (e) { console.warn("Rejection email failed:", e.message); }

    res.json({ success: true, message: `${user.name} has been rejected.` });
  } catch (error) { next(error); }
};

// ─── DELETE USER ──────────────────────────────────────
const deleteUser = async (req, res, next) => {
  try {
    if (req.params.id === req.user.user_id)
      return next(new AppError("You cannot deactivate your own account.", 400));

    await pool.execute(
      "UPDATE users SET isActive = FALSE WHERE user_id = ?", [req.params.id]
    );
    res.json({ success: true, message: "User deactivated successfully." });
  } catch (error) { next(error); }
};

export {
  getAllUsers, getPendingUsers, getUserById,
  createUser, updateUser, approveUser, rejectUser, deleteUser,
};