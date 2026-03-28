import { v4 as uuidv4 } from 'uuid';
import { masterPool } from "../../config/masterDatabase.js";
import { getTenantPool } from "../../middleware/tenant.middleware.js";
import { AppError } from "../../middleware/errorHandler.js";

export const createB2BOrder = async (req, res, next) => {
  try {
    const { items, notes } = req.body;
    if (!items || items.length === 0) return next(new AppError("Order items are required.", 400));

    const shopDbName = req.dbName;
    const shopDb = req.db;
    const userId = req.user.user_id;

    // 1. Group items by supplier
    const ordersBySupplier = items.reduce((acc, item) => {
      if (!acc[item.supplier_id]) acc[item.supplier_id] = [];
      acc[item.supplier_id].push(item);
      return acc;
    }, {});

    const results = [];

    // 2. Process each supplier order
    for (const [supplierId, supplierItems] of Object.entries(ordersBySupplier)) {
      const b2bOrderId = uuidv4();
      const poNumber = `B2B-PO-${Date.now().toString().slice(-6)}`;
      
      // Calculate totals
      const subtotal = supplierItems.reduce((sum, i) => sum + (i.sellingPrice * i.quantity), 0);
      const totalAmount = subtotal; // Simplified tax for now

      // A. Create Purchase Order in SHOP DB
      await shopDb.execute(
        `INSERT INTO purchase_orders 
          (po_id, poNumber, supplier_id, user_id, status, subtotal, totalAmount, notes)
         VALUES (?, ?, ?, ?, 'ORDERED', ?, ?, ?)`,
        [b2bOrderId, poNumber, supplierId, userId, subtotal, totalAmount, notes || `B2B Order via Marketplace`]
      );

      for (const item of supplierItems) {
        await shopDb.execute(
          `INSERT INTO purchase_order_items (po_item_id, po_id, product_id, productName, quantity, costPrice, totalAmount)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [uuidv4(), b2bOrderId, item.product_id, item.name, item.quantity, item.sellingPrice, item.sellingPrice * item.quantity]
        );
      }

      // B. Create Sales Order (Transaction) in SUPPLIER DB
      try {
        const supplierDb = await getTenantPool(supplierId);
        const invoiceNumber = `B2C-SO-${Date.now().toString().slice(-6)}`;
        
        // Find the customer record for this shop in the supplier's DB
        const [customerRows] = await supplierDb.execute(
          "SELECT customer_id FROM customers WHERE shop_tenant_id = ?", [shopDbName]
        );
        
        if (customerRows.length > 0) {
          const supplierCustomerId = customerRows[0].customer_id;
          
          await supplierDb.execute(
            `INSERT INTO transactions 
              (transaction_id, invoiceNumber, customer_id, status, subtotal, totalAmount, notes)
             VALUES (?, ?, ?, 'PENDING', ?, ?, ?)`,
            [b2bOrderId, invoiceNumber, supplierCustomerId, subtotal, totalAmount, `Incoming B2B Order from Shop ${shopDbName}`]
          );

          for (const item of supplierItems) {
            await supplierDb.execute(
              `INSERT INTO transaction_items 
                (item_id, transaction_id, product_id, productName, quantity, sellingPrice, totalAmount)
               VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [uuidv4(), b2bOrderId, item.product_id, item.name, item.quantity, item.sellingPrice, item.sellingPrice * item.quantity]
            );
          }
        }
      } catch (supplierErr) {
        console.error(`Failed to push SO to supplier ${supplierId}`, supplierErr);
        // We still created the PO locally, but marked it as "Push Failed" in notes?
        await shopDb.execute(
          "UPDATE purchase_orders SET notes = CONCAT(notes, '\n[!] Warning: Could not push to supplier system.') WHERE po_id = ?",
          [b2bOrderId]
        );
      }

      results.push({ supplierId, po_id: b2bOrderId, poNumber });
    }

    res.status(201).json({ 
      success: true, 
      message: "B2B Orders placed successfully.",
      orders: results
    });
  } catch (error) { next(error); }
};

export const getB2BOrders = async (req, res, next) => {
  try {
    const shopDb = req.db;
    const [orders] = await shopDb.execute(
      `SELECT po.*, s.name as supplierName 
       FROM purchase_orders po
       LEFT JOIN suppliers s ON s.supplier_id = po.supplier_id
       ORDER BY po.createdAt DESC`
    );
    res.json({ success: true, data: orders });
  } catch (error) { next(error); }
};
