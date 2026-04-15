import { masterPool } from "../../config/masterDatabase.js";
import { getTenantPool } from "../../middleware/tenant.middleware.js";
import { v4 as uuidv4 } from "uuid";

// POST /api/b2b/orders — Place a new order (from Discovery)
export const createB2BOrder = async (req, res, next) => {
  const connection = await masterPool.getConnection();
  try {
    const { supplier_id, items, notes } = req.body;
    const db_id = req.dbName;
    const order_id = uuidv4();

    if (!supplier_id) return res.status(400).json({ success: false, message: "Supplier identifier is missing." });
    if (!items || !items.length) return res.status(400).json({ success: false, message: "Order must have at least one item." });

    let finalSupplierId = supplier_id;
    let finalShopId = db_id;

    const [supRows] = await masterPool.execute(
      "SELECT s.supplier_id FROM suppliers s WHERE s.supplier_id = ? OR s.db_name = ? OR s.slug = ?",
      [supplier_id, supplier_id, supplier_id]
    );
    if (supRows.length > 0) finalSupplierId = supRows[0].supplier_id;

    const [selfRows] = await masterPool.execute(
      "SELECT s.supplier_id FROM suppliers s WHERE s.db_name = ?", [db_id]
    );
    if (selfRows.length > 0) finalShopId = selfRows[0].supplier_id;

    let totalAmount = 0;
    for (const item of items) totalAmount += Number(item.price) * Number(item.qty);

    await connection.beginTransaction();

    await connection.execute(
      `INSERT INTO b2b_orders (order_id, shop_id, supplier_id, status, total_amount, notes)
       VALUES (?, ?, ?, 'PENDING', ?, ?)`,
      [order_id, finalShopId, finalSupplierId, totalAmount, notes || null]
    );

    for (const item of items) {
      const item_id = uuidv4();
      const lineTotal = Number(item.price) * Number(item.qty);
      await connection.execute(
        `INSERT INTO b2b_order_items (id, order_id, product_id, name, sku, price, qty, total)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [item_id, order_id, item.product_id, item.name, item.sku, item.price, item.qty, lineTotal]
      );
    }

    await connection.execute(
      `INSERT IGNORE INTO shop_supplier_map (map_id, shop_id, supplier_id, status, initiated_by)
       VALUES (?, ?, ?, 'PENDING', 'shop')`,
      [uuidv4(), finalShopId, finalSupplierId]
    );

    await connection.commit();
    res.json({ success: true, order_id, message: "Order placed successfully!" });
  } catch (error) {
    await connection.rollback();
    res.status(error.status || 500).json({ success: false, message: error.message, detail: error.code || null });
  } finally {
    connection.release();
  }
};

// GET /api/b2b/orders — List orders
export const getB2BOrders = async (req, res, next) => {
  try {
    const myId = req.dbName;
    const userType = req.user.userType;

    let finalMyId = myId;
    const [selfRows] = await masterPool.execute(
      "SELECT s.supplier_id FROM suppliers s WHERE s.db_name = ?", [myId]
    );
    if (selfRows.length > 0) finalMyId = selfRows[0].supplier_id;

    let query, params;
    if (userType === 'supplier') {
      query = `SELECT o.*, p.business_name, p.logo,
                 (SELECT r.status FROM b2b_returns r WHERE r.order_id = o.order_id ORDER BY r.createdAt DESC LIMIT 1) as latest_return_status
               FROM b2b_orders o
               JOIN profiles p ON p.entity_id = o.shop_id
               WHERE o.supplier_id = ? ORDER BY o.createdAt DESC`;
      params = [finalMyId];
    } else {
      query = `SELECT o.*, p.business_name, p.logo,
                 (SELECT r.status FROM b2b_returns r WHERE r.order_id = o.order_id ORDER BY r.createdAt DESC LIMIT 1) as latest_return_status
               FROM b2b_orders o
               JOIN profiles p ON p.entity_id = o.supplier_id
               WHERE o.shop_id = ? ORDER BY o.createdAt DESC`;
      params = [finalMyId];
    }

    const [rows] = await masterPool.execute(query, params);
    res.json({ success: true, data: rows });
  } catch (error) { next(error); }
};

// GET /api/b2b/orders/:id — Detail with items + returns
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

    const [items] = await masterPool.execute("SELECT * FROM b2b_order_items WHERE order_id = ?", [id]);

    // Fetch returns with their items
    const [returns] = await masterPool.execute(
      `SELECT r.* FROM b2b_returns r WHERE r.order_id = ? ORDER BY r.createdAt DESC`, [id]
    );
    for (const r of returns) {
      const [ritems] = await masterPool.execute(
        "SELECT * FROM b2b_return_items WHERE return_id = ?", [r.return_id]
      );
      r.items = ritems;
    }

    res.json({ success: true, data: { ...orders[0], items, returns } });
  } catch (error) { next(error); }
};

// PATCH /api/b2b/orders/:id/status — Update status
export const updateB2BOrderStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, rejection_reason, updated_items } = req.body;

    const [order] = await masterPool.execute("SELECT * FROM b2b_orders WHERE order_id = ?", [id]);
    if (!order.length) return res.status(404).json({ success: false, message: "Order not found." });

    if (status === 'REJECTED' && rejection_reason) {
      await masterPool.execute(
        "UPDATE b2b_orders SET status = ?, rejection_reason = ? WHERE order_id = ?",
        [status, rejection_reason, id]
      );
    } else {
      await masterPool.execute("UPDATE b2b_orders SET status = ? WHERE order_id = ?", [status, id]);
    }

    if (status === 'ACCEPTED') {
      await masterPool.execute(
        "UPDATE shop_supplier_map SET status = 'ACCEPTED' WHERE shop_id = ? AND supplier_id = ?",
        [order[0].shop_id, order[0].supplier_id]
      );
    }

    if (status === 'BILLED' && Array.isArray(updated_items) && updated_items.length > 0) {
      for (const item of updated_items) {
        if (item.product_id && item.qty > 0) {
          await masterPool.execute(
            "UPDATE b2b_order_items SET qty = ?, total = price * ? WHERE order_id = ? AND product_id = ?",
            [item.qty, item.qty, id, item.product_id]
          );
        }
      }
    }

    res.json({ success: true, message: `Order status updated to ${status}` });
  } catch (error) { next(error); }
};

// ══════════════════════════════════════════════════════
// RETURN SYSTEM
// ══════════════════════════════════════════════════════

// POST /api/b2b/orders/:id/return — Shop requests a return
// NOTE: Inventory NOT updated here. Inventories update ONLY when supplier processes/approves.
export const createB2BReturn = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { items, reason } = req.body;

    if (!items || !items.length)
      return res.status(400).json({ success: false, message: "No items specified for return." });

    const [orders] = await masterPool.execute("SELECT * FROM b2b_orders WHERE order_id = ?", [id]);
    if (!orders.length) return res.status(404).json({ success: false, message: "Order not found." });
    const order = orders[0];

    if (!['CLOSED', 'BILLED'].includes(order.status))
      return res.status(400).json({ success: false, message: "Returns can only be initiated for CLOSED or BILLED orders." });

    // Enforce one return per order
    const [existingReturns] = await masterPool.execute("SELECT return_id FROM b2b_returns WHERE order_id = ?", [id]);
    if (existingReturns.length > 0) {
      return res.status(400).json({ success: false, message: "A return request has already been processed for this order." });
    }

    // Validate quantities
    const [orderItems] = await masterPool.execute("SELECT * FROM b2b_order_items WHERE order_id = ?", [id]);
    for (const retItem of items) {
      const orig = orderItems.find(oi => oi.id === retItem.order_item_id);
      if (!orig) return res.status(400).json({ success: false, message: `Item "${retItem.name}" not found in original order.` });
      if (retItem.return_qty > orig.qty)
        return res.status(400).json({ success: false, message: `Return qty for "${retItem.name}" (${retItem.return_qty}) exceeds ordered qty (${orig.qty}).` });
    }

    const totalRefund = items.reduce((s, i) => s + Number(i.return_qty) * Number(i.unit_price), 0);

    // Create return record (status: PENDING — awaiting supplier action)
    const return_id = uuidv4();
    await masterPool.execute(
      `INSERT INTO b2b_returns (return_id, order_id, shop_id, supplier_id, status, total_refund_amount, reason)
       VALUES (?, ?, ?, ?, 'PENDING', ?, ?)`,
      [return_id, id, order.shop_id, order.supplier_id, totalRefund, reason || null]
    );

    for (const item of items) {
      await masterPool.execute(
        `INSERT INTO b2b_return_items (id, return_id, order_item_id, product_id, name, sku, return_qty, unit_price, refund_amount)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [uuidv4(), return_id, item.order_item_id, item.product_id, item.name, item.sku,
          item.return_qty, item.unit_price, Number(item.return_qty) * Number(item.unit_price)]
      );
    }

    // Mark the order as RETURN_REQUESTED so supplier can see it
    await masterPool.execute(
      "UPDATE b2b_orders SET status = 'RETURN_REQUESTED' WHERE order_id = ?", [id]
    );

    // Deduct stock immediately from shop inventory so they don't sell it
    try {
      const shopPool = await getTenantPool(req.dbName);
      for (const item of items) {
        if (item.name) {
          await shopPool.execute(
            "UPDATE products SET stock = GREATEST(0, stock - ?) WHERE LOWER(trim(name)) = LOWER(?)",
            [item.return_qty, item.name.trim()]
          );
        }
      }
      console.log(`✅ Shop inventory initially deducted for return request ${return_id}`);
    } catch (e) {
      console.warn("⚠️ Initial Shop inventory deduction failed:", e.message);
    }

    res.json({ success: true, return_id, total_refund: totalRefund, message: "Return request submitted. Awaiting supplier approval." });
  } catch (error) { next(error); }
};

// PATCH /api/b2b/orders/:id/returns/:returnId/process — Supplier processes (approves) a return
// Supplier can edit final quantities before confirming.
export const processB2BReturn = async (req, res, next) => {
  try {
    const { id, returnId } = req.params;
    const { final_items } = req.body;
    // final_items: [{ return_item_id, return_qty }] — supplier's confirmed quantities

    const [ret] = await masterPool.execute(
      `SELECT r.*, s_sup.db_name as supplier_db_name, s_shop.db_name as shop_db_name
       FROM b2b_returns r
       LEFT JOIN suppliers s_sup ON s_sup.supplier_id = r.supplier_id
       LEFT JOIN suppliers s_shop ON s_shop.supplier_id = r.shop_id
       WHERE r.return_id = ? AND r.order_id = ?`,
      [returnId, id]
    );
    if (!ret.length) return res.status(404).json({ success: false, message: "Return not found." });
    const returnRec = ret[0];

    if (returnRec.status !== 'PENDING')
      return res.status(400).json({ success: false, message: "This return has already been processed." });

    // Get return items
    const [retItems] = await masterPool.execute(
      "SELECT * FROM b2b_return_items WHERE return_id = ?", [returnId]
    );

    // Apply supplier-edited quantities if provided
    let finalReturnItems = retItems.map(ri => ({ ...ri, orig_return_qty: ri.return_qty }));
    if (Array.isArray(final_items) && final_items.length > 0) {
      finalReturnItems = retItems.map(ri => {
        let qty = ri.return_qty;
        const override = final_items.find(f => f.return_item_id === ri.id);
        if (override) qty = Math.max(0, Math.min(override.return_qty, ri.return_qty));
        return { ...ri, orig_return_qty: ri.return_qty, return_qty: qty, refund_amount: qty * Number(ri.unit_price) };
      }).filter(ri => ri.return_qty > 0);

      // Update return items with final quantities
      for (const ri of finalReturnItems) {
        await masterPool.execute(
          "UPDATE b2b_return_items SET return_qty = ?, refund_amount = ? WHERE id = ?",
          [ri.return_qty, ri.refund_amount, ri.id]
        );
      }
    }

    const totalRefund = finalReturnItems.reduce((s, ri) => s + Number(ri.refund_amount), 0);

    // Update return status to APPROVED
    await masterPool.execute(
      "UPDATE b2b_returns SET status = 'APPROVED', total_refund_amount = ? WHERE return_id = ?",
      [totalRefund, returnId]
    );

    // Restore order status to CLOSED
    await masterPool.execute(
      "UPDATE b2b_orders SET status = 'CLOSED' WHERE order_id = ?", [id]
    );

    // Update SUPPLIER inventory — restock returned items
    if (returnRec.supplier_db_name) {
      try {
        const supPool = await getTenantPool(returnRec.supplier_db_name);
        for (const ri of finalReturnItems) {
          if (ri.product_id) {
            await supPool.execute(
              "UPDATE products SET stock = stock + ? WHERE product_id = ?",
              [ri.return_qty, ri.product_id]
            );
          }
        }
        console.log(`✅ Supplier inventory restocked for return ${returnId}`);
      } catch (e) { console.warn("⚠️ Supplier inventory update failed:", e.message); }
    }

    // Update SHOP inventory — add back any rejected/reduced differences
    // Fallback to shop_id if not present in the master mapping table (e.g., local tests)
    const shopDbName = returnRec.shop_db_name || returnRec.shop_id;
    if (shopDbName) {
      try {
        const shopPool = await getTenantPool(shopDbName);
        for (const ri of finalReturnItems) {
          const diff = Number(ri.orig_return_qty) - Number(ri.return_qty);
          if (diff > 0 && ri.name) {
            await shopPool.execute(
              "UPDATE products SET stock = stock + ? WHERE LOWER(trim(name)) = LOWER(?)",
              [diff, ri.name.trim()]
            );
          }
        }
        console.log(`✅ Shop inventory partial restored (if any) for return ${returnId}`);
      } catch (e) { console.warn("⚠️ Shop inventory differential update failed:", e.message); }
    }

    res.json({ success: true, total_refund: totalRefund, message: `Return approved. Refund: ₹${totalRefund.toLocaleString('en-IN')}` });
  } catch (error) { next(error); }
};

// PATCH /api/b2b/orders/:id/returns/:returnId/reject — Supplier rejects a return
export const rejectB2BReturn = async (req, res, next) => {
  try {
    const { id, returnId } = req.params;
    const { reason } = req.body;

    const [ret] = await masterPool.execute(
      `SELECT r.*, s_shop.db_name as shop_db_name 
       FROM b2b_returns r 
       LEFT JOIN suppliers s_shop ON s_shop.supplier_id = r.shop_id 
       WHERE r.return_id = ? AND r.order_id = ?`, [returnId, id]
    );
    if (!ret.length) return res.status(404).json({ success: false, message: "Return not found." });
    const returnRec = ret[0];
    if (returnRec.status !== 'PENDING')
      return res.status(400).json({ success: false, message: "This return has already been processed." });

    await masterPool.execute(
      "UPDATE b2b_returns SET status = 'REJECTED' WHERE return_id = ?", [returnId]
    );

    // Restore order to CLOSED
    await masterPool.execute("UPDATE b2b_orders SET status = 'CLOSED' WHERE order_id = ?", [id]);

    // Release frozen inventory back to shop since return is rejected
    const shopDbName = returnRec.shop_db_name || returnRec.shop_id;
    if (shopDbName) {
      try {
        const shopPool = await getTenantPool(shopDbName);
        const [origReturnItems] = await masterPool.execute("SELECT name, return_qty FROM b2b_return_items WHERE return_id = ?", [returnId]);
        for (const ri of origReturnItems) {
          if (ri.name) {
            await shopPool.execute(
              "UPDATE products SET stock = stock + ? WHERE LOWER(trim(name)) = LOWER(?)",
              [ri.return_qty, ri.name.trim()]
            );
          }
        }
        console.log(`✅ Restored shop stock after return rejection ${returnId}`);
      } catch(e) { console.warn("⚠️ Failed to restore shop stock after rejection:", e.message); }
    }

    res.json({ success: true, message: "Return request rejected." });
  } catch (error) { next(error); }
};

// GET /api/b2b/orders/:id/returns — List returns for an order
export const getB2BReturns = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [returns] = await masterPool.execute(
      "SELECT * FROM b2b_returns WHERE order_id = ? ORDER BY createdAt DESC", [id]
    );
    for (const r of returns) {
      const [items] = await masterPool.execute("SELECT * FROM b2b_return_items WHERE return_id = ?", [r.return_id]);
      r.items = items;
    }
    res.json({ success: true, data: returns });
  } catch (error) { next(error); }
};
