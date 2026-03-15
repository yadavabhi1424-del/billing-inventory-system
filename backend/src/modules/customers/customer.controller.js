const { v4: uuidv4 } = require("uuid");
const { pool }       = require("../../config/database");
const { AppError }   = require("../../middleware/errorHandler");

// ─── GET ALL ──────────────────────────────────────────
const getAllCustomers = async (req, res, next) => {
  try {
    const {
      page     = 1,
      limit    = 20,
      search,
      isActive = "true",
    } = req.query;

    const offset     = (parseInt(page) - 1) * parseInt(limit);
    const conditions = ["1=1"];
    const params     = [];

    if (isActive !== "all") {
      conditions.push("isActive = ?");
      params.push(isActive === "true" ? 1 : 0);
    }

    if (search) {
      conditions.push("(name LIKE ? OR phone LIKE ? OR email LIKE ?)");
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const where = conditions.join(" AND ");

    const [customers] = await pool.execute(
      `SELECT *,
              (SELECT COUNT(*) FROM transactions
               WHERE customer_id = c.customer_id) as totalTransactions
       FROM customers c
       WHERE ${where}
       ORDER BY name ASC
       LIMIT ${parseInt(limit)} OFFSET ${offset}`,
      params
    );

    const [[{ total }]] = await pool.execute(
      `SELECT COUNT(*) as total FROM customers c WHERE ${where}`,
      params
    );

    res.json({
      success: true,
      data: customers,
      pagination: {
        page:  parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET BY ID ────────────────────────────────────────
const getCustomerById = async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      "SELECT * FROM customers WHERE customer_id = ?",
      [req.params.id]
    );

    if (rows.length === 0) {
      return next(new AppError("Customer not found.", 404));
    }

    // Get recent transactions
    const [transactions] = await pool.execute(
      `SELECT transaction_id, invoiceNumber,
              totalAmount, paymentMethod,
              status, createdAt
       FROM transactions
       WHERE customer_id = ?
       ORDER BY createdAt DESC
       LIMIT 10`,
      [req.params.id]
    );

    res.json({
      success: true,
      data: { ...rows[0], recentTransactions: transactions },
    });
  } catch (error) {
    next(error);
  }
};

// ─── CREATE ───────────────────────────────────────────
const createCustomer = async (req, res, next) => {
  try {
    const { name, email, phone, address, city, gstin, notes } = req.body;

    if (!name) {
      return next(new AppError("Customer name is required.", 400));
    }

    const customerId = uuidv4();

    await pool.execute(
      `INSERT INTO customers
        (customer_id, name, email, phone, address, city, gstin, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        customerId, name,
        email   || null, phone   || null,
        address || null, city    || null,
        gstin   || null, notes   || null,
      ]
    );

    res.status(201).json({
      success: true,
      message: "Customer created successfully.",
      data: { customer_id: customerId, name },
    });
  } catch (error) {
    next(error);
  }
};

// ─── UPDATE ───────────────────────────────────────────
const updateCustomer = async (req, res, next) => {
  try {
    const {
      name, email, phone,
      address, city, gstin,
      notes, isActive,
    } = req.body;

    const [existing] = await pool.execute(
      "SELECT customer_id FROM customers WHERE customer_id = ?",
      [req.params.id]
    );

    if (existing.length === 0) {
      return next(new AppError("Customer not found.", 404));
    }

    await pool.execute(
      `UPDATE customers SET
        name     = COALESCE(?, name),
        email    = COALESCE(?, email),
        phone    = COALESCE(?, phone),
        address  = COALESCE(?, address),
        city     = COALESCE(?, city),
        gstin    = COALESCE(?, gstin),
        notes    = COALESCE(?, notes),
        isActive = COALESCE(?, isActive)
       WHERE customer_id = ?`,
      [
        name    || null, email   || null,
        phone   || null, address || null,
        city    || null, gstin   || null,
        notes   || null,
        isActive !== undefined ? isActive : null,
        req.params.id,
      ]
    );

    res.json({ success: true, message: "Customer updated successfully." });
  } catch (error) {
    next(error);
  }
};

// ─── DELETE (soft) ────────────────────────────────────
const deleteCustomer = async (req, res, next) => {
  try {
    await pool.execute(
      "UPDATE customers SET isActive = FALSE WHERE customer_id = ?",
      [req.params.id]
    );

    res.json({ success: true, message: "Customer deactivated." });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
};