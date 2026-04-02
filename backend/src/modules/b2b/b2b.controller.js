import { masterPool } from "../../config/masterDatabase.js";
import { v4 as uuidv4 } from "uuid";

// POST /api/b2b/orders — Place a new order (from Discovery)
export const createB2BOrder = async (req, res, next) => {
  const connection = await masterPool.getConnection();
  try {
    console.log("🔥 CREATE ORDER HIT");
    console.log("👉 DB NAME:", req.dbName);
    console.log("👉 BODY:", req.body);
    const { supplier_id, items, notes } = req.body;
    const db_id = req.dbName;
    const order_id = uuidv4();

    if (!supplier_id) {
      return res.status(400).json({ success: false, message: "Supplier identifier is missing." });
    }

    if (!items || !items.length) {
      return res.status(400).json({ success: false, message: "Order must have at least one item." });
    }

    // Resolve IDs to official master entity_ids for consistency
    let finalSupplierId = supplier_id;
    let finalShopId = db_id;

    // 1. Resolve Target (Supplier)
    const [supRows] = await masterPool.execute(
      "SELECT s.supplier_id FROM suppliers s WHERE s.supplier_id = ? OR s.db_name = ? OR s.slug = ?",
      [supplier_id, supplier_id, supplier_id]
    );
    if (supRows.length > 0) finalSupplierId = supRows[0].supplier_id;

    // 2. Resolve Self (Shop/Supplier)
    const [selfRows] = await masterPool.execute(
      "SELECT s.supplier_id FROM suppliers s WHERE s.db_name = ?",
      [db_id]
    );
    if (selfRows.length > 0) finalShopId = selfRows[0].supplier_id;

    // 1. Pre-calculate totalAmount
    let totalAmount = 0;
    for (const item of items) {
      totalAmount += Number(item.price) * Number(item.qty);
    }

    await connection.beginTransaction();

    // 2. Insert Parent Order FIRST (to satisfy Foreign Key in order_items)
    await connection.execute(
      `INSERT INTO b2b_orders (order_id, shop_id, supplier_id, status, total_amount, notes)
       VALUES (?, ?, ?, 'PENDING', ?, ?)`,
      [order_id, finalShopId, finalSupplierId, totalAmount, notes || null]
    );

    // 3. Insert Order Items
    for (const item of items) {
      const item_id = uuidv4();
      const lineTotal = Number(item.price) * Number(item.qty);

      await connection.execute(
        `INSERT INTO b2b_order_items (id, order_id, product_id, name, sku, price, qty, total)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [item_id, order_id, item.product_id, item.name, item.sku, item.price, item.qty, lineTotal]
      );
    }

    // 4. Auto-create/Update relationship
    await connection.execute(
      `INSERT IGNORE INTO shop_supplier_map (map_id, shop_id, supplier_id, status, initiated_by)
       VALUES (?, ?, ?, 'PENDING', 'shop')`,
      [uuidv4(), finalShopId, finalSupplierId]
    );

    await connection.commit();
    res.json({ success: true, order_id, message: "Order placed successfully!" });
  } catch (error) {
    await connection.rollback();
    console.error("❌ CREATE ORDER ERROR:", error);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to place order due to a system error.",
      detail: error.code || null
    });
  } finally {
    connection.release();
  }
};

// GET /api/b2b/orders — List orders (Incoming for Supplier, Outgoing for Shop)
export const getB2BOrders = async (req, res, next) => {
  try {
    const myId = req.dbName;
    const userType = req.user.userType;
    let query = "";
    let params = [];

    // Resolve myId to master UUID if it's a supplier's db_name
    let finalMyId = myId;
    const [selfRows] = await masterPool.execute(
      "SELECT s.supplier_id FROM suppliers s WHERE s.db_name = ?", [myId]
    );
    if (selfRows.length > 0) finalMyId = selfRows[0].supplier_id;

    if (userType === 'supplier') {
      // Incoming orders: Join with Profiles to get Shop Name
      query = `
        SELECT o.*, p.business_name as business_name, p.logo
        FROM b2b_orders o
        JOIN profiles p ON p.entity_id = o.shop_id
        WHERE o.supplier_id = ?
        ORDER BY o.createdAt DESC
      `;
      params = [finalMyId];
    } else {
      // Outgoing orders: Join with Profiles to get Supplier Name
      query = `
        SELECT o.*, p.business_name as business_name, p.logo
        FROM b2b_orders o
        JOIN profiles p ON p.entity_id = o.supplier_id
        WHERE o.shop_id = ?
        ORDER BY o.createdAt DESC
      `;
      params = [finalMyId];
    }

    const [rows] = await masterPool.execute(query, params);
    res.json({ success: true, data: rows });
  } catch (error) { next(error); }
};

// GET /api/b2b/orders/:id — Detail with items
export const getB2BOrderById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [orders] = await masterPool.execute(
      `SELECT o.*, 
              p_shop.business_name as shop_name, p_shop.phone as shop_phone, p_shop.email as shop_email, p_shop.address as shop_address,
              p_sup.business_name as supplier_name, p_sup.phone as supplier_phone, p_sup.email as supplier_email, p_sup.address as supplier_address,
              s_master.db_name as supplier_db_name
       FROM b2b_orders o
       LEFT JOIN profiles p_shop ON p_shop.entity_id = o.shop_id
       LEFT JOIN profiles p_sup ON p_sup.entity_id = o.supplier_id
       LEFT JOIN suppliers s_master ON s_master.supplier_id = o.supplier_id
       WHERE o.order_id = ?`,
      [id]
    );

    if (!orders.length) return res.status(404).json({ success: false, message: "Order not found." });

    const [items] = await masterPool.execute(
      "SELECT * FROM b2b_order_items WHERE order_id = ?", [id]
    );

    res.json({ success: true, data: { ...orders[0], items } });
  } catch (error) { next(error); }
};

// PATCH /api/b2b/orders/:id/status — Update status (Accept, Reject, etc.)
export const updateB2BOrderStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const [order] = await masterPool.execute("SELECT * FROM b2b_orders WHERE order_id = ?", [id]);
    if (!order.length) return res.status(404).json({ success: false, message: "Order not found." });

    await masterPool.execute(
      "UPDATE b2b_orders SET status = ? WHERE order_id = ?",
      [status, id]
    );

    // If order is ACCEPTED, also ensure relationship is ACCEPTED
    if (status === 'ACCEPTED') {
      await masterPool.execute(
        "UPDATE shop_supplier_map SET status = 'ACCEPTED' WHERE shop_id = ? AND supplier_id = ?",
        [order[0].shop_id, order[0].supplier_id]
      );
    }

    res.json({ success: true, message: `Order status updated to ${status}` });
  } catch (error) { next(error); }
};
