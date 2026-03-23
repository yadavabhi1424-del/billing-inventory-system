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
            paymentMethod, startDate, endDate, customerId } = req.query;

    const offset     = (parseInt(page) - 1) * parseInt(limit);
    const conditions = ["1=1"];
    const params     = [];

    if (status)        { conditions.push("t.status = ?");          params.push(status); }
    if (paymentMethod) { conditions.push("t.paymentMethod = ?");   params.push(paymentMethod); }
    if (customerId)    { conditions.push("t.customer_id = ?");     params.push(customerId); }
    if (search)        { conditions.push("(t.invoiceNumber LIKE ? OR c.name LIKE ?)"); params.push(`%${search}%`, `%${search}%`); }
    if (startDate)     { conditions.push("DATE(t.createdAt) >= ?"); params.push(startDate); }
    if (endDate)       { conditions.push("DATE(t.createdAt) <= ?"); params.push(endDate); }

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

const returnTransaction = async (req, res, next) => {
  try {
    const { returnReason } = req.body;
    const [rows] = await req.db.execute(
      "SELECT * FROM transactions WHERE transaction_id = ?", [req.params.id]
    );
    if (rows.length === 0) return next(new AppError("Transaction not found.", 404));

    const transaction = rows[0];
    if (transaction.status === "RETURNED")  return next(new AppError("Transaction already returned.", 400));
    if (transaction.status === "CANCELLED") return next(new AppError("Cannot return a cancelled transaction.", 400));

    const conn = await req.db.getConnection();
    try {
      await conn.beginTransaction();

      const [items] = await conn.execute(
        "SELECT * FROM transaction_items WHERE transaction_id = ?", [req.params.id]
      );

      for (const item of items) {
        const [[product]] = await conn.execute("SELECT stock FROM products WHERE product_id = ?", [item.product_id]);
        const newStock = product.stock + item.quantity;
        await conn.execute("UPDATE products SET stock = ? WHERE product_id = ?", [newStock, item.product_id]);
        await conn.execute(
          `INSERT INTO stock_movements
            (movement_id, product_id, user_id, type, quantity, reason, reference, balanceBefore, balanceAfter)
           VALUES (?,?,?,'RETURN_IN',?,?,?,?,?)`,
          [uuidv4(), item.product_id, req.user.user_id, item.quantity,
           returnReason || "Customer return", transaction.invoiceNumber, product.stock, newStock]
        );
      }

      await conn.execute(
        `UPDATE transactions SET status = 'RETURNED', returnReason = ?, paymentStatus = 'REFUNDED'
         WHERE transaction_id = ?`,
        [returnReason || null, req.params.id]
      );

      if (transaction.customer_id) {
        const loyaltyToDeduct = Math.floor(transaction.totalAmount / 100);
        await conn.execute(
          `UPDATE customers SET totalSpent = totalSpent - ?, loyaltyPoints = GREATEST(0, loyaltyPoints - ?)
           WHERE customer_id = ?`,
          [transaction.totalAmount, loyaltyToDeduct, transaction.customer_id]
        );
      }

      await conn.commit();
      res.json({ success: true, message: "Transaction returned successfully." });
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  } catch (error) { next(error); }
};

const getTodaySummary = async (req, res, next) => {
  try {
    const [[summary]] = await req.db.execute(
      `SELECT COUNT(*) as totalTransactions,
              COALESCE(SUM(totalAmount), 0) as totalSales,
              COALESCE(SUM(taxAmount), 0) as totalTax,
              COALESCE(SUM(discountAmount), 0) as totalDiscount,
              COALESCE(SUM(CASE WHEN paymentMethod='CASH' THEN totalAmount END), 0) as cashSales,
              COALESCE(SUM(CASE WHEN paymentMethod='UPI'  THEN totalAmount END), 0) as upiSales,
              COALESCE(SUM(CASE WHEN paymentMethod='CARD' THEN totalAmount END), 0) as cardSales
       FROM transactions WHERE DATE(createdAt) = CURDATE() AND status = 'COMPLETED'`
    );
    res.json({ success: true, data: summary });
  } catch (error) { next(error); }
};

export { createTransaction, getAllTransactions, getTransactionById,
         getByInvoiceNumber, returnTransaction, getTodaySummary };