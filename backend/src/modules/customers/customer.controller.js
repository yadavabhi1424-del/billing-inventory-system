import { v4 as uuidv4 } from "uuid";
import { AppError }      from "../../middleware/errorHandler.js";
import { masterPool } from "../../config/masterDatabase.js";
import { getTenantPool } from "../../middleware/tenant.middleware.js";

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

    const allIds = customers.map(c => c.customer_id);
    if (allIds.length > 0) {
      const placeholders = allIds.map(() => '?').join(',');
      const [b2bStats] = await masterPool.execute(
        `SELECT shop_id, 
                COUNT(DISTINCT order_id) as orderCount,
                (SELECT COUNT(DISTINCT product_id) FROM b2b_order_items oi JOIN b2b_orders o2 ON oi.order_id=o2.order_id WHERE o2.shop_id = o.shop_id AND (o2.supplier_id = ? OR o2.supplier_id = (SELECT supplier_id FROM suppliers WHERE db_name = ?))) as productCount
         FROM b2b_orders o
         WHERE (supplier_id = ? OR supplier_id = (SELECT supplier_id FROM suppliers WHERE db_name = ?)) AND shop_id IN (${placeholders})
         GROUP BY shop_id`,
        [req.dbName, req.dbName, req.dbName, req.dbName, ...allIds]
      );

      const [masterData] = await masterPool.execute(
        `SELECT t.db_name, t.owner_name, p.address 
         FROM tenants t 
         LEFT JOIN profiles p ON p.entity_id = t.db_name 
         WHERE t.db_name IN (${placeholders})`,
        [...allIds]
      );

      const statsMap = b2bStats.reduce((acc, row) => ({ ...acc, [row.shop_id]: row }), {});
      const masterMap = masterData.reduce((acc, row) => ({ ...acc, [row.db_name]: row }), {});
      
      // Use Promise.all to handle async tenant fallback
      await Promise.all(customers.map(async c => {
        const b2bOrders = statsMap[c.customer_id]?.orderCount || 0;
        const posOrders = c.totalTransactions || 0;
        c.orderCount = b2bOrders + posOrders;
        c.productCount = statsMap[c.customer_id]?.productCount || 0;

        const m = masterMap[c.customer_id];
        if (m) {
          c.contactPerson = m.owner_name || 'Owner';
          c.address = m.address || c.address;
          
          // Tenant DB Fallback if out-of-sync
          if (!c.address && c.customer_id) {
            try {
              const shopDb = await getTenantPool(c.customer_id);
              const [sp] = await shopDb.execute("SELECT address FROM shop_profile LIMIT 1");
              if (sp.length > 0 && sp[0].address) c.address = sp[0].address;
            } catch(e) {}
          }
        } else {
          c.contactPerson = c.name; 
        }
        
        if (b2bOrders > 0) c.is_network = 1;
      }));
    }

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