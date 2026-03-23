import { v4 as uuidv4 } from "uuid";
import { AppError }      from "../../middleware/errorHandler.js";

const generatePONumber = async (conn) => {
  const today  = new Date();
  const prefix = `PO-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}`;

  const [[{ last }]] = await conn.execute(
    "SELECT poNumber as last FROM purchase_orders WHERE poNumber LIKE ? ORDER BY poNumber DESC LIMIT 1",
    [`${prefix}%`]
  );

  if (!last) return `${prefix}-0001`;
  const num = parseInt(last.split("-").pop());
  return `${prefix}-${String(num + 1).padStart(4, "0")}`;
};

const getAllOrders = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, supplierId, startDate, endDate } = req.query;
    const offset     = (parseInt(page) - 1) * parseInt(limit);
    const conditions = ["1=1"];
    const params     = [];

    if (status)     { conditions.push("po.status = ?");           params.push(status); }
    if (supplierId) { conditions.push("po.supplier_id = ?");      params.push(supplierId); }
    if (startDate)  { conditions.push("DATE(po.createdAt) >= ?"); params.push(startDate); }
    if (endDate)    { conditions.push("DATE(po.createdAt) <= ?"); params.push(endDate); }

    const where = conditions.join(" AND ");

    const [orders] = await req.db.execute(
      `SELECT po.*, s.name as supplierName, s.phone as supplierPhone,
              u.name as createdBy, COUNT(poi.po_item_id) as itemCount
       FROM purchase_orders po
       LEFT JOIN suppliers            s   ON s.supplier_id = po.supplier_id
       LEFT JOIN users                u   ON u.user_id     = po.user_id
       LEFT JOIN purchase_order_items poi ON poi.po_id     = po.po_id
       WHERE ${where} GROUP BY po.po_id ORDER BY po.createdAt DESC
       LIMIT ${parseInt(limit)} OFFSET ${offset}`,
      params
    );

    const [[{ total }]] = await req.db.execute(
      `SELECT COUNT(*) as total FROM purchase_orders po WHERE ${where}`, params
    );

    res.json({
      success: true, data: orders,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (error) { next(error); }
};

const getOrderById = async (req, res, next) => {
  try {
    const [rows] = await req.db.execute(
      `SELECT po.*, s.name as supplierName, s.phone as supplierPhone, u.name as createdBy
       FROM purchase_orders po
       LEFT JOIN suppliers s ON s.supplier_id = po.supplier_id
       LEFT JOIN users     u ON u.user_id     = po.user_id
       WHERE po.po_id = ?`,
      [req.params.id]
    );
    if (rows.length === 0) return next(new AppError("Purchase order not found.", 404));

    const [items] = await req.db.execute(
      `SELECT poi.*, p.sku, p.unit, p.stock as currentStock
       FROM purchase_order_items poi
       LEFT JOIN products p ON p.product_id = poi.product_id
       WHERE poi.po_id = ?`,
      [req.params.id]
    );

    res.json({ success: true, data: { ...rows[0], items } });
  } catch (error) { next(error); }
};

const createOrder = async (req, res, next) => {
  try {
    const { supplierId, items, expectedDate, notes } = req.body;
    if (!supplierId || !items?.length)
      return next(new AppError("Supplier and items are required.", 400));

    const conn = await req.db.getConnection();
    try {
      await conn.beginTransaction();

      const poNumber = await generatePONumber(conn);
      const poId     = uuidv4();
      let subtotal   = 0;
      let totalTax   = 0;

      const enrichedItems = items.map((item) => {
        const itemTotal = item.costPrice * item.quantity;
        const taxAmt    = (itemTotal * (item.taxRate || 0)) / 100;
        subtotal += itemTotal;
        totalTax += taxAmt;
        return { ...item, taxAmount: taxAmt, totalAmount: itemTotal + taxAmt };
      });

      await conn.execute(
        `INSERT INTO purchase_orders
          (po_id, poNumber, supplier_id, user_id, subtotal, taxAmount, totalAmount, expectedDate, notes)
         VALUES (?,?,?,?,?,?,?,?,?)`,
        [poId, poNumber, supplierId, req.user.user_id,
         subtotal, totalTax, subtotal + totalTax, expectedDate || null, notes || null]
      );

      for (const item of enrichedItems) {
        await conn.execute(
          `INSERT INTO purchase_order_items
            (po_item_id, po_id, product_id, productName, quantity, costPrice, taxRate, taxAmount, totalAmount)
           VALUES (?,?,?,?,?,?,?,?,?)`,
          [uuidv4(), poId, item.productId, item.productName,
           item.quantity, item.costPrice, item.taxRate || 0, item.taxAmount, item.totalAmount]
        );
      }

      await conn.commit();
      res.status(201).json({
        success: true, message: "Purchase order created.",
        data: { po_id: poId, poNumber, totalAmount: subtotal + totalTax },
      });
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  } catch (error) { next(error); }
};

const receiveOrder = async (req, res, next) => {
  try {
    const { receivedItems } = req.body;

    const [[po]] = await req.db.execute(
      "SELECT * FROM purchase_orders WHERE po_id = ?", [req.params.id]
    );
    if (!po)                       return next(new AppError("Purchase order not found.", 404));
    if (po.status === "RECEIVED")  return next(new AppError("Order already received.", 400));
    if (po.status === "CANCELLED") return next(new AppError("Cannot receive cancelled order.", 400));

    const conn = await req.db.getConnection();
    try {
      await conn.beginTransaction();

      const [poItems] = await conn.execute(
        "SELECT * FROM purchase_order_items WHERE po_id = ?", [req.params.id]
      );

      const toReceive = receivedItems ||
        poItems.map((i) => ({ productId: i.product_id, receivedQty: i.quantity - i.receivedQty }));

      let allReceived = true;

      for (const recv of toReceive) {
        if (recv.receivedQty <= 0) continue;

        const poItem = poItems.find((i) => i.product_id === recv.productId);
        if (!poItem) continue;

        const newReceivedQty = poItem.receivedQty + recv.receivedQty;
        if (newReceivedQty < poItem.quantity) allReceived = false;

        await conn.execute(
          "UPDATE purchase_order_items SET receivedQty = ? WHERE po_item_id = ?",
          [newReceivedQty, poItem.po_item_id]
        );

        const [[product]] = await conn.execute(
          "SELECT stock FROM products WHERE product_id = ?", [recv.productId]
        );

        const newStock = product.stock + recv.receivedQty;
        await conn.execute("UPDATE products SET stock = ? WHERE product_id = ?", [newStock, recv.productId]);
        await conn.execute(
          `INSERT INTO stock_movements
            (movement_id, product_id, user_id, type, quantity, reason, reference, balanceBefore, balanceAfter)
           VALUES (?,?,?,'PURCHASE',?,?,?,?,?)`,
          [uuidv4(), recv.productId, req.user.user_id, recv.receivedQty,
           "Purchase order received", po.poNumber, product.stock, newStock]
        );
      }

      await conn.execute(
        `UPDATE purchase_orders SET status = ?, receivedDate = NOW() WHERE po_id = ?`,
        [allReceived ? "RECEIVED" : "PARTIAL", req.params.id]
      );

      await conn.commit();
      res.json({ success: true, message: "Stock received and updated." });
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  } catch (error) { next(error); }
};

const updateStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const valid = ["PENDING", "ORDERED", "CANCELLED"];
    if (!valid.includes(status))
      return next(new AppError(`Use: ${valid.join(", ")}`, 400));

    await req.db.execute(
      "UPDATE purchase_orders SET status = ? WHERE po_id = ?", [status, req.params.id]
    );
    res.json({ success: true, message: "Status updated." });
  } catch (error) { next(error); }
};

export { getAllOrders, getOrderById, createOrder, receiveOrder, updateStatus };