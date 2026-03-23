import bcrypt            from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { AppError }      from "../../middleware/errorHandler.js";

const getAllUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, role, status, search } = req.query;
    const offset     = (parseInt(page) - 1) * parseInt(limit);
    const conditions = ["1=1"];
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
      "SELECT user_id FROM users WHERE email = ?", [email]
    );
    if (existing.length > 0)
      return next(new AppError("Email already registered.", 409));

    const hashed = await bcrypt.hash(password, 12);
    const userId = uuidv4();

    await req.db.execute(
      `INSERT INTO users
        (user_id, name, email, password, role, phone, status, emailVerified, isActive)
       VALUES (?, ?, ?, ?, ?, ?, 'APPROVED', TRUE, TRUE)`,
      [userId, name, email, hashed, role || "CASHIER", phone || null]
    );

    res.status(201).json({
      success: true, message: "User created successfully.",
      data: { user_id: userId, name, email, role: role || "CASHIER" },
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
      "SELECT role FROM users WHERE user_id = ?", [req.params.id]
    );
    if (rows.length === 0)
      return next(new AppError("User not found.", 404));
    if (rows[0].role === 'OWNER')
      return next(new AppError("Cannot delete the shop owner.", 400));

    await req.db.execute(
      "DELETE FROM users WHERE user_id = ?", [req.params.id]
    );
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

export { getAllUsers, getUserById, createUser, updateUser, deleteUser, updateMyProfile };