import { v4 as uuidv4 } from "uuid";
import { AppError }      from "../../middleware/errorHandler.js";

const generateInvoiceNumber = async (conn) => {
  const today  = new Date();
  const prefix = `INV-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}`;

  const [rows] = await conn.execute(
    "SELECT invoiceNumber as last FROM transactions WHERE invoiceNumber LIKE ? ORDER BY invoiceNumber DESC LIMIT 1",
    [`${prefix}%`]
  );

  if (!rows || rows.length === 0) return `${prefix}-0001`;
  const lastNum = parseInt(rows[0].last.split("-").pop());
  return `${prefix}-${String(lastNum + 1).padStart(4, "0")}`;
};

const createTransaction = async (req, res, next) => {
  try {
    const { customerId, items, paymentMethod = "CASH", payments,
            discountType, discountValue = 0, notes, amountPaid } = req.body;

    if (!items || items.length === 0)
      return next(new AppError("At least one item is required.", 400));

    const conn = await req.db.getConnection();
    try {
      // Compatibility check: Ensure required billing columns exist
      const [columns] = await conn.query("SHOW COLUMNS FROM transactions");
      const columnNames = columns.map(c => c.Field);
      
      if (!columnNames.includes('roundOff')) {
        await conn.query("ALTER TABLE transactions ADD COLUMN roundOff DECIMAL(5,2) DEFAULT 0 AFTER taxAmount");
      }
      if (!columnNames.includes('discountType')) {
        await conn.query("ALTER TABLE transactions ADD COLUMN discountType ENUM('PERCENT','FIXED') AFTER subtotal");
      }
      if (!columnNames.includes('discountValue')) {
        await conn.query("ALTER TABLE transactions ADD COLUMN discountValue DECIMAL(10,2) DEFAULT 0 AFTER discountType");
      }
      if (!columnNames.includes('discountAmount')) {
        await conn.query("ALTER TABLE transactions ADD COLUMN discountAmount DECIMAL(10,2) DEFAULT 0 AFTER discountValue");
      }
      if (!columnNames.includes('changeGiven')) {
        await conn.query("ALTER TABLE transactions ADD COLUMN changeGiven DECIMAL(10,2) DEFAULT 0 AFTER amountPaid");
      }

      const [itemColumns] = await conn.query("SHOW COLUMNS FROM transaction_items");
      const itemColNames = itemColumns.map(c => c.Field);
      if (!itemColNames.includes('discountAmount')) {
        await conn.query("ALTER TABLE transaction_items ADD COLUMN discountAmount DECIMAL(10,2) DEFAULT 0 AFTER taxAmount");
      }

      await conn.beginTransaction();

      const enrichedItems = [];
      let subtotal = 0;
      let totalTax = 0;

      for (const item of items) {
        const [[product]] = await conn.execute(
          "SELECT * FROM products WHERE product_id = ? AND isActive = TRUE",
          [item.productId]
        );

        if (!product) throw new AppError(`Product not found: ${item.productId}`, 404);
        if (product.stock < item.quantity)
          throw new AppError(`Insufficient stock for "${product.name}". Available: ${product.stock}, Requested: ${item.quantity}`, 400);

        const itemPrice    = parseFloat(item.sellingPrice || product.sellingPrice);
        const itemDiscount = parseFloat(item.discountAmount || 0);
        const taxAmount    = ((itemPrice - itemDiscount) * item.quantity * product.taxRate) / 100;
        const totalAmount  = (itemPrice - itemDiscount) * item.quantity + taxAmount;

        subtotal += itemPrice * item.quantity;
        totalTax += taxAmount;

        enrichedItems.push({
          itemId: uuidv4(), productId: product.product_id,
          productName: product.name, sku: product.sku,
          quantity: item.quantity, unit: product.unit,
          costPrice: product.costPrice, sellingPrice: itemPrice,
          taxRate: product.taxRate, taxAmount,
          discountAmount: itemDiscount * item.quantity,
          totalAmount, stock: product.stock,
        });
      }

      let discountAmount = 0;
      if (discountType === "PERCENT")    discountAmount = (subtotal * parseFloat(discountValue)) / 100;
      else if (discountType === "FIXED") discountAmount = parseFloat(discountValue);

      const preRound    = subtotal - discountAmount + totalTax;
      const roundOff    = Math.round(preRound) - preRound;
      const totalAmount = Math.round(preRound);
      const paid        = parseFloat(amountPaid) || totalAmount;
      const changeGiven = Math.max(0, paid - totalAmount);

      const invoiceNumber = await generateInvoiceNumber(conn);
      const transactionId = uuidv4();

      await conn.execute(
        `INSERT INTO transactions
          (transaction_id, invoiceNumber, customer_id, user_id,
           paymentMethod, paymentStatus, subtotal,
           discountType, discountValue, discountAmount,
           taxAmount, roundOff, totalAmount,
           amountPaid, changeGiven, notes, status)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'COMPLETED')`,
        [transactionId, invoiceNumber, customerId || null, req.user.user_id,
         paymentMethod,
         paid >= totalAmount ? "PAID" : paid > 0 ? "PARTIAL" : "UNPAID",
         subtotal, discountType || null, parseFloat(discountValue),
         discountAmount, totalTax, roundOff, totalAmount,
         paid, changeGiven, notes || null]
      );

      for (const item of enrichedItems) {
        await conn.execute(
          `INSERT INTO transaction_items
            (item_id, transaction_id, product_id, productName,
             sku, quantity, unit, costPrice, sellingPrice,
             taxRate, taxAmount, discountAmount, totalAmount)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [item.itemId, transactionId, item.productId, item.productName,
           item.sku, item.quantity, item.unit, item.costPrice, item.sellingPrice,
           item.taxRate, item.taxAmount, item.discountAmount, item.totalAmount]
        );

        const newStock = item.stock - item.quantity;
        await conn.execute("UPDATE products SET stock = ? WHERE product_id = ?", [newStock, item.productId]);
        await conn.execute(
          `INSERT INTO stock_movements
            (movement_id, product_id, user_id, type, quantity, reason, reference, balanceBefore, balanceAfter)
           VALUES (?,?,?,'SALE',?,?,?,?,?)`,
          [uuidv4(), item.productId, req.user.user_id, -item.quantity,
           "POS Sale", invoiceNumber, item.stock, newStock]
        );
      }

      const paymentList = payments?.length ? payments : [{ method: paymentMethod, amount: paid }];
      for (const p of paymentList) {
        await conn.execute(
          `INSERT INTO payments (payment_id, transaction_id, method, amount, reference) VALUES (?,?,?,?,?)`,
          [uuidv4(), transactionId, p.method, parseFloat(p.amount), p.reference || null]
        );
      }

      if (customerId) {
        const loyaltyEarned = Math.floor(totalAmount / 100);
        await conn.execute(
          `UPDATE customers SET totalSpent = totalSpent + ?, loyaltyPoints = loyaltyPoints + ?
           WHERE customer_id = ?`,
          [totalAmount, loyaltyEarned, customerId]
        );
      }

      await conn.commit();
      res.status(201).json({
        success: true, message: "Transaction completed successfully.",
        data: { transactionId, invoiceNumber, totalAmount, changeGiven,
                paymentStatus: paid >= totalAmount ? "PAID" : "PARTIAL" },
      });
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  } catch (error) { next(error); }
};

const getAllTransactions = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, status,
            paymentMethod, startDate, endDate, period, customerId } = req.query;

    const offset     = (parseInt(page) - 1) * parseInt(limit);
    const conditions = ["1=1"];
    const params     = [];

    if (status)        { conditions.push("t.status = ?");          params.push(status); }
    if (paymentMethod) { conditions.push("t.paymentMethod = ?");   params.push(paymentMethod); }
    if (customerId)    { conditions.push("t.customer_id = ?");     params.push(customerId); }
    if (search)        { conditions.push("(t.invoiceNumber LIKE ? OR c.name LIKE ?)"); params.push(`%${search}%`, `%${search}%`); }

    // Date Filtering using period, startDate, endDate
    if (startDate && endDate) {
      const s = startDate.includes(':') ? startDate : `${startDate} 00:00:00`;
      const e = endDate.includes(':')   ? endDate   : `${endDate} 23:59:59`;
      conditions.push(`t.createdAt BETWEEN ? AND ?`);
      params.push(s, e);
    } else if (period === 'today') {
      conditions.push(`DATE(t.createdAt) = CURDATE()`);
    } else if (period === 'yesterday') {
      conditions.push(`DATE(t.createdAt) = DATE_SUB(CURDATE(), INTERVAL 1 DAY)`);
    } else if (period === 'week') {
      conditions.push(`DATE(t.createdAt) >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)`);
    } else if (period === 'month') {
      conditions.push(`MONTH(t.createdAt) = MONTH(CURDATE()) AND YEAR(t.createdAt) = YEAR(CURDATE())`);
    } else if (period === 'year') {
      conditions.push(`YEAR(t.createdAt) = YEAR(CURDATE())`);
    }

    const where = conditions.join(" AND ");

    const [transactions] = await req.db.execute(
      `SELECT t.*, c.name as customerName, u.name as cashierName,
              COUNT(ti.item_id) as itemCount
       FROM transactions t
       LEFT JOIN customers c ON c.customer_id = t.customer_id
       LEFT JOIN users     u ON u.user_id = t.user_id
       LEFT JOIN transaction_items ti ON ti.transaction_id = t.transaction_id
       WHERE ${where} GROUP BY t.transaction_id ORDER BY t.createdAt DESC
       LIMIT ${parseInt(limit)} OFFSET ${offset}`,
      params
    );

    const [[{ total }]] = await req.db.execute(
      `SELECT COUNT(*) as total FROM transactions t
       LEFT JOIN customers c ON c.customer_id = t.customer_id WHERE ${where}`,
      params
    );

    res.json({
      success: true, data: transactions,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (error) { next(error); }
};

const getTransactionById = async (req, res, next) => {
  try {
    const [rows] = await req.db.execute(
      `SELECT t.*, c.name as customerName, c.phone as customerPhone, u.name as cashierName
       FROM transactions t
       LEFT JOIN customers c ON c.customer_id = t.customer_id
       LEFT JOIN users     u ON u.user_id = t.user_id
       WHERE t.transaction_id = ?`,
      [req.params.id]
    );
    if (rows.length === 0) return next(new AppError("Transaction not found.", 404));

    const [items]    = await req.db.execute("SELECT * FROM transaction_items WHERE transaction_id = ?", [req.params.id]);
    const [payments] = await req.db.execute("SELECT * FROM payments WHERE transaction_id = ?", [req.params.id]);

    res.json({ success: true, data: { ...rows[0], items, payments } });
  } catch (error) { next(error); }
};

const getByInvoiceNumber = async (req, res, next) => {
  try {
    const [rows] = await req.db.execute(
      `SELECT t.*, c.name as customerName, c.phone as customerPhone, u.name as cashierName
       FROM transactions t
       LEFT JOIN customers c ON c.customer_id = t.customer_id
       LEFT JOIN users     u ON u.user_id = t.user_id
       WHERE t.invoiceNumber = ?`,
      [req.params.invoiceNumber]
    );
    if (rows.length === 0) return next(new AppError("Invoice not found.", 404));

    const [items]    = await req.db.execute("SELECT * FROM transaction_items WHERE transaction_id = ?", [rows[0].transaction_id]);
    const [payments] = await req.db.execute("SELECT * FROM payments WHERE transaction_id = ?", [rows[0].transaction_id]);

    res.json({ success: true, data: { ...rows[0], items, payments } });
  } catch (error) { next(error); }
};

// ── Ensure return columns exist (one-time migration) ──────────────────────────
const migrateReturnColumns = async (conn) => {
  const [cols] = await conn.query("SHOW COLUMNS FROM transactions");
  const names  = cols.map(c => c.Field);
  
  if (!names.includes('transaction_type'))
    await conn.query("ALTER TABLE transactions ADD COLUMN transaction_type ENUM('SALE','RETURN') NOT NULL DEFAULT 'SALE' AFTER status");
  if (!names.includes('reference_invoice_id'))
    await conn.query("ALTER TABLE transactions ADD COLUMN reference_invoice_id VARCHAR(36) NULL AFTER transaction_type");
  if (!names.includes('returnReason'))
    await conn.query("ALTER TABLE transactions ADD COLUMN returnReason TEXT NULL AFTER status");

  // Dynamically append 'RETURNED' to status enum if missing
  const statusCol = cols.find(c => c.Field === 'status');
  if (statusCol && statusCol.Type.startsWith('enum') && !statusCol.Type.includes("'RETURNED'")) {
    const newType = statusCol.Type.replace(")", ",'RETURNED')");
    await conn.query(`ALTER TABLE transactions MODIFY COLUMN status ${newType} DEFAULT 'COMPLETED'`);
  }

  // Dynamically append 'REFUNDED' to paymentStatus enum if missing
  const paymentStatusCol = cols.find(c => c.Field === 'paymentStatus');
  if (paymentStatusCol && paymentStatusCol.Type.startsWith('enum') && !paymentStatusCol.Type.includes("'REFUNDED'")) {
    const newType = paymentStatusCol.Type.replace(")", ",'REFUNDED')");
    await conn.query(`ALTER TABLE transactions MODIFY COLUMN paymentStatus ${newType} DEFAULT 'PAID'`);
  }

  const [iCols] = await conn.query("SHOW COLUMNS FROM transaction_items");
  const iNames  = iCols.map(c => c.Field);
  if (!iNames.includes('returnedQty'))
    await conn.query("ALTER TABLE transaction_items ADD COLUMN returnedQty INT NOT NULL DEFAULT 0 AFTER quantity");
};

// ── Generate return invoice number ─────────────────────────────────────────────
// INV-20250423-0001  →  RET-20250423-0001-1, RET-20250423-0001-2 …
const generateReturnInvoiceNumber = async (conn, originalInvoiceNumber) => {
  const base  = originalInvoiceNumber.replace(/^INV-/, 'RET-');
  const [rows] = await conn.execute(
    "SELECT COUNT(*) as cnt FROM transactions WHERE invoiceNumber LIKE ?",
    [`${base}%`]
  );
  const suffix = (rows[0].cnt || 0) + 1;
  return `${base}-${suffix}`;
};

// ── Partial / Full Return ──────────────────────────────────────────────────────
const returnTransaction = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { returnItems, returnReason, refundMethod = 'CASH' } = req.body;
    // returnItems: [{ product_id, returnQty }]

    const conn = await req.db.getConnection();
    try {
      await conn.beginTransaction();
      await migrateReturnColumns(conn);

      // 1 ── Load original transaction
      const [[original]] = await conn.execute(
        `SELECT t.*, c.name as customerName
         FROM transactions t
         LEFT JOIN customers c ON c.customer_id = t.customer_id
         WHERE t.transaction_id = ?`, [id]
      );
      if (!original) throw new AppError("Transaction not found.", 404);
      if (original.status === 'CANCELLED') throw new AppError("Cannot return a cancelled transaction.", 400);
      if (original.transaction_type === 'RETURN') throw new AppError("Cannot return a return transaction.", 400);

      // 2 ── Load original items with already-returned quantities
      const [origItems] = await conn.execute(
        "SELECT * FROM transaction_items WHERE transaction_id = ?", [id]
      );

      // Build map: product_id → { item, remainingQty }
      const itemMap = {};
      for (const item of origItems) {
        itemMap[item.product_id] = { item, remainingQty: item.quantity - (item.returnedQty || 0) };
      }

      // 3 ── Build validated returnList
      if (!returnItems || returnItems.length === 0)
        throw new AppError("No items specified for return.", 400);

      const returnList = [];
      for (const ri of returnItems) {
        const entry = itemMap[ri.product_id];
        if (!entry) throw new AppError(`Product ${ri.product_id} not on original invoice.`, 400);
        const rQty = parseInt(ri.returnQty);
        if (rQty <= 0) continue;
        if (rQty > entry.remainingQty)
          throw new AppError(`Return qty (${rQty}) exceeds available qty (${entry.remainingQty}) for ${entry.item.productName}.`, 400);
        returnList.push({ ...entry.item, returnQty: rQty });
      }
      if (returnList.length === 0) throw new AppError("No valid items to return.", 400);

      // 4 ── Calculate refund amounts (proportional to original invoice)
      const origTotal = parseFloat(original.totalAmount);
      let   returnSubtotal = 0;
      let   returnTax      = 0;

      for (const ri of returnList) {
        const unitNet   = parseFloat(ri.sellingPrice) - (parseFloat(ri.discountAmount || 0) / ri.quantity);
        const unitTax   = unitNet * (parseFloat(ri.taxRate || 0) / 100);
        returnSubtotal += unitNet * ri.returnQty;
        returnTax      += unitTax * ri.returnQty;
      }

      // Apply invoice-level discount proportionally
      const origSubtotal       = parseFloat(original.subtotal);
      const origDiscountAmount = parseFloat(original.discountAmount || 0);
      const discountRatio      = origSubtotal > 0 ? origDiscountAmount / origSubtotal : 0;
      const returnDiscount     = returnSubtotal * discountRatio;
      const refundTotal        = Math.round((returnSubtotal - returnDiscount + returnTax) * 100) / 100;

      // 5 ── Create return invoice
      const returnInvNum = await generateReturnInvoiceNumber(conn, original.invoiceNumber);
      const returnTxnId  = uuidv4();

      await conn.execute(
        `INSERT INTO transactions
          (transaction_id, invoiceNumber, customer_id, user_id, transaction_type,
           reference_invoice_id, status, paymentMethod, paymentStatus,
           subtotal, discountAmount, taxAmount, roundOff, totalAmount,
           amountPaid, changeGiven, notes, returnReason)
         VALUES (?,?,?,?,'RETURN',?,  'RETURNED',?,  'REFUNDED',
                 ?,?,?,0,?,
                 ?,0,?,?)`,
        [returnTxnId, returnInvNum,
         original.customer_id || null, req.user.user_id,
         id,                               // reference_invoice_id
         refundMethod,
         returnSubtotal, returnDiscount, returnTax,
         refundTotal,
         refundTotal,                      // amountPaid = refund amount
         `Return for ${original.invoiceNumber}`,
         returnReason || null]
      );

      // 6 ── Insert return items (negative qty) + restock + update returnedQty
      for (const ri of returnList) {
        const unitNet    = parseFloat(ri.sellingPrice) - (parseFloat(ri.discountAmount || 0) / ri.quantity);
        const unitTax    = unitNet * (parseFloat(ri.taxRate || 0) / 100);
        const unitDisc   = parseFloat(ri.discountAmount || 0) / ri.quantity;
        const lineRefund = (unitNet - unitDisc * 0 + unitTax) * ri.returnQty; // discountAmount already in unitNet

        await conn.execute(
          `INSERT INTO transaction_items
            (item_id, transaction_id, product_id, productName,
             sku, quantity, unit, costPrice, sellingPrice,
             taxRate, taxAmount, discountAmount, totalAmount)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [uuidv4(), returnTxnId, ri.product_id, ri.productName,
           ri.sku, -ri.returnQty, ri.unit, ri.costPrice, ri.sellingPrice,
           ri.taxRate, -(unitTax * ri.returnQty), -(unitDisc * ri.returnQty) * 0,
           -Math.round(lineRefund * 100) / 100]
        );

        // Update returnedQty on original item
        await conn.execute(
          "UPDATE transaction_items SET returnedQty = returnedQty + ? WHERE transaction_id = ? AND product_id = ?",
          [ri.returnQty, id, ri.product_id]
        );

        // Restock
        const [[prod]] = await conn.execute("SELECT stock FROM products WHERE product_id = ?", [ri.product_id]);
        const newStock = prod.stock + ri.returnQty;
        await conn.execute("UPDATE products SET stock = ? WHERE product_id = ?", [newStock, ri.product_id]);
        await conn.execute(
          `INSERT INTO stock_movements
            (movement_id, product_id, user_id, type, quantity, reason, reference, balanceBefore, balanceAfter)
           VALUES (?,?,?,'RETURN_IN',?,?,?,?,?)`,
          [uuidv4(), ri.product_id, req.user.user_id, ri.returnQty,
           returnReason || "Customer return", returnInvNum, prod.stock, newStock]
        );
      }

      // 7 ── Check if original is now fully returned; update status if so
      const [updatedItems] = await conn.execute(
        "SELECT SUM(quantity) as total, SUM(returnedQty) as returned FROM transaction_items WHERE transaction_id = ?", [id]
      );
      const allReturned = updatedItems[0].total <= updatedItems[0].returned;
      if (allReturned) {
        await conn.execute(
          "UPDATE transactions SET status='RETURNED', returnReason=? WHERE transaction_id=?",
          [returnReason || null, id]
        );
      }

      // 8 ── Customer loyalty adjustment (proportional)
      if (original.customer_id) {
        const loyaltyToDeduct = Math.floor(refundTotal / 100);
        await conn.execute(
          `UPDATE customers SET totalSpent = GREATEST(0, totalSpent - ?),
           loyaltyPoints = GREATEST(0, loyaltyPoints - ?) WHERE customer_id = ?`,
          [refundTotal, loyaltyToDeduct, original.customer_id]
        );
      }

      await conn.commit();
      res.json({
        success: true,
        message: `Return processed. ${returnInvNum} created.`,
        data: { returnInvoiceNumber: returnInvNum, refundTotal, refundMethod }
      });
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  } catch (error) { next(error); }
};

// ── Get all returns linked to an original invoice ──────────────────────────────
const getReturnsByInvoice = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Ensure columns exist before querying them
    const conn = await req.db.getConnection();
    try {
      await migrateReturnColumns(conn);
    } finally {
      conn.release();
    }

    const [returns] = await req.db.execute(
      `SELECT t.*, u.name as cashierName
       FROM transactions t
       LEFT JOIN users u ON u.user_id = t.user_id
       WHERE t.reference_invoice_id = ? AND t.transaction_type = 'RETURN'
       ORDER BY t.createdAt ASC`, [id]
    );
    for (const ret of returns) {
      const [items] = await req.db.execute(
        "SELECT * FROM transaction_items WHERE transaction_id = ?", [ret.transaction_id]
      );
      ret.items = items;
    }
    res.json({ success: true, data: returns });
  } catch (error) { next(error); }
};

const getTodaySummary = async (req, res, next) => {
  try {
    const { period, startDate, endDate } = req.query;
    let dateCondition = "DATE(createdAt) = CURDATE()";
    const params = [];

    if (startDate && endDate) {
      dateCondition = "DATE(createdAt) BETWEEN ? AND ?";
      params.push(startDate, endDate);
    } else if (period === 'yesterday') {
      dateCondition = "DATE(createdAt) = DATE_SUB(CURDATE(), INTERVAL 1 DAY)";
    } else if (period === 'week') {
      dateCondition = "DATE(createdAt) >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)";
    } else if (period === 'month') {
      dateCondition = "MONTH(createdAt) = MONTH(CURDATE()) AND YEAR(createdAt) = YEAR(CURDATE())";
    } else if (period === 'all') {
      dateCondition = "1=1";
    }

    const [[summary]] = await req.db.execute(
      `SELECT COUNT(*) as totalTransactions,
              COALESCE(SUM(totalAmount), 0) as totalSales,
              COALESCE(SUM(taxAmount), 0) as totalTax,
              COALESCE(SUM(discountAmount), 0) as totalDiscount,
              COALESCE(SUM(CASE WHEN paymentMethod='CASH' THEN totalAmount END), 0) as cashSales,
              COALESCE(SUM(CASE WHEN paymentMethod='UPI'  THEN totalAmount END), 0) as upiSales,
              COALESCE(SUM(CASE WHEN paymentMethod='CARD' THEN totalAmount END), 0) as cardSales
       FROM transactions WHERE ${dateCondition} AND status = 'COMPLETED'`, params
    );
    res.json({ success: true, data: summary });
  } catch (error) { next(error); }
};

export { createTransaction, getAllTransactions, getTransactionById,
         getByInvoiceNumber, returnTransaction, getReturnsByInvoice, getTodaySummary };