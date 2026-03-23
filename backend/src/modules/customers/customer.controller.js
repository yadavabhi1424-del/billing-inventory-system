import { v4 as uuidv4 } from "uuid";
import { AppError }      from "../../middleware/errorHandler.js";

const getAllCustomers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, isActive = "true" } = req.query;
    const offset     = (parseInt(page) - 1) * parseInt(limit);
    const conditions = ["1=1"];
    const params     = [];

    if (isActive !== "all") { conditions.push("isActive = ?"); params.push(isActive === "true" ? 1 : 0); }
    if (search) { conditions.push("(name LIKE ? OR phone LIKE ? OR email LIKE ?)"); params.push(`%${search}%`, `%${search}%`, `%${search}%`); }

    const where = conditions.join(" AND ");

    const [customers] = await req.db.execute(
      `SELECT *, (SELECT COUNT(*) FROM transactions WHERE customer_id = c.customer_id) as totalTransactions
       FROM customers c WHERE ${where} ORDER BY name ASC
       LIMIT ${parseInt(limit)} OFFSET ${offset}`,
      params
    );

    const [[{ total }]] = await req.db.execute(
      `SELECT COUNT(*) as total FROM customers c WHERE ${where}`, params
    );

    res.json({
      success: true, data: customers,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (error) { next(error); }
};

const getCustomerById = async (req, res, next) => {
  try {
    const [rows] = await req.db.execute(
      "SELECT * FROM customers WHERE customer_id = ?", [req.params.id]
    );
    if (rows.length === 0) return next(new AppError("Customer not found.", 404));

    const [transactions] = await req.db.execute(
      `SELECT transaction_id, invoiceNumber, totalAmount, paymentMethod, status, createdAt
       FROM transactions WHERE customer_id = ? ORDER BY createdAt DESC LIMIT 10`,
      [req.params.id]
    );

    res.json({ success: true, data: { ...rows[0], recentTransactions: transactions } });
  } catch (error) { next(error); }
};

const createCustomer = async (req, res, next) => {
  try {
    const { name, email, phone, address, city, gstin, notes } = req.body;
    if (!name) return next(new AppError("Customer name is required.", 400));

    const customerId = uuidv4();
    await req.db.execute(
      `INSERT INTO customers (customer_id, name, email, phone, address, city, gstin, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [customerId, name, email || null, phone || null,
       address || null, city || null, gstin || null, notes || null]
    );

    res.status(201).json({
      success: true, message: "Customer created successfully.",
      data: { customer_id: customerId, name },
    });
  } catch (error) { next(error); }
};

const updateCustomer = async (req, res, next) => {
  try {
    const { name, email, phone, address, city, gstin, notes, isActive } = req.body;

    const [existing] = await req.db.execute(
      "SELECT customer_id FROM customers WHERE customer_id = ?", [req.params.id]
    );
    if (existing.length === 0) return next(new AppError("Customer not found.", 404));

    await req.db.execute(
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
      [name || null, email || null, phone || null, address || null,
       city || null, gstin || null, notes || null,
       isActive !== undefined ? isActive : null, req.params.id]
    );

    res.json({ success: true, message: "Customer updated successfully." });
  } catch (error) { next(error); }
};

const deleteCustomer = async (req, res, next) => {
  try {
    await req.db.execute(
      "UPDATE customers SET isActive = FALSE WHERE customer_id = ?", [req.params.id]
    );
    res.json({ success: true, message: "Customer deactivated." });
  } catch (error) { next(error); }
};

export { getAllCustomers, getCustomerById, createCustomer, updateCustomer, deleteCustomer };