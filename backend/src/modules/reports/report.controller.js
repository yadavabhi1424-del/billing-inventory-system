import { masterPool } from "../../config/masterDatabase.js";

// Standardized condition generator matching dashboard.controller.js
const getCondition = (col, req, params = []) => {
  const { startDate, endDate, period } = req.query;

  if (startDate && endDate) {
    params.push(`${startDate} 00:00:00`, `${endDate} 23:59:59`);
    return `${col} BETWEEN ? AND ?`;
  }

  if (period === 'today') return `DATE(${col}) = CURDATE()`;
  if (period === 'week') return `${col} >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)`;
  if (period === 'month') return `MONTH(${col}) = MONTH(CURDATE()) AND YEAR(${col}) = YEAR(CURDATE())`;

  return "1=1";
};

const getSalesReport = async (req, res, next) => {
  try {
    const userType = req.user.userType || 'shop';
    const statusFilter = userType === 'supplier'
      ? "status IN ('COMPLETED', 'PENDING')"
      : "status = 'COMPLETED'";

    const salesParams = [];
    const salesCond = getCondition('createdAt', req, salesParams);

    const [[summary]] = await req.db.execute(
      `SELECT COUNT(*) as totalTransactions,
              COALESCE(SUM(totalAmount), 0)    as totalSales,
              COALESCE(SUM(taxAmount), 0)      as totalTax,
              COALESCE(AVG(totalAmount), 0)    as avgOrderValue
       FROM transactions WHERE ${salesCond} AND ${statusFilter}`,
      salesParams
    );

    const productsParams = [];
    const productsCond = getCondition('t.createdAt', req, productsParams);
    const [topProducts] = await req.db.execute(
      `SELECT ti.productName, SUM(ti.quantity) as totalQty, SUM(ti.totalAmount) as totalRevenue
       FROM transaction_items ti
       JOIN transactions t ON t.transaction_id = ti.transaction_id
       WHERE ${productsCond} AND t.${statusFilter}
       GROUP BY ti.product_id, ti.productName
       ORDER BY totalRevenue DESC LIMIT 5`,
      productsParams
    );

    const paymentParams = [];
    const paymentCond = getCondition('createdAt', req, paymentParams);
    const [byPaymentMethod] = await req.db.execute(
      `SELECT paymentMethod, SUM(totalAmount) as total
       FROM transactions WHERE ${paymentCond} AND ${statusFilter}
       GROUP BY paymentMethod`,
      paymentParams
    );

    res.json({ success: true, data: { summary, topProducts, byPaymentMethod } });
  } catch (error) { next(error); }
};

const getCustomerReport = async (req, res, next) => {
  try {
    const userType = req.user.userType || 'shop';
    let summaryQuery, topCustomersQuery;
    const params = [];

    if (userType === 'supplier') {
      const cond = getCondition('createdAt', req, params);
      summaryQuery = `
        SELECT COUNT(DISTINCT customer_id) as totalCustomers,
               COUNT(DISTINCT CASE WHEN ${cond} THEN customer_id END) as newCustomers
        FROM customers WHERE isActive = TRUE AND shop_tenant_id IS NOT NULL`;

      topCustomersQuery = `
        SELECT customer_id, name, phone, totalSpent, shop_tenant_id as shopId,
               (SELECT COUNT(*) FROM transactions WHERE customer_id = c.customer_id) as totalOrders
        FROM customers c
        WHERE isActive = TRUE AND shop_tenant_id IS NOT NULL AND totalSpent > 0
        ORDER BY totalSpent DESC LIMIT 10`;
    } else {
      const cond = getCondition('createdAt', req, params);
      summaryQuery = `
        SELECT COUNT(*) as totalCustomers,
               SUM(CASE WHEN ${cond} THEN 1 ELSE 0 END) as newCustomers
        FROM customers WHERE isActive = TRUE AND shop_tenant_id IS NULL`;

      topCustomersQuery = `
        SELECT customer_id, name, phone, totalSpent, loyaltyPoints,
               (SELECT COUNT(*) FROM transactions WHERE customer_id = c.customer_id) as totalOrders
        FROM customers c
        WHERE isActive = TRUE AND shop_tenant_id IS NULL AND totalSpent > 0
        ORDER BY totalSpent DESC LIMIT 10`;
    }

    const [[summary]] = await req.db.execute(summaryQuery, params);
    const [topCustomers] = await req.db.execute(topCustomersQuery);

    res.json({ success: true, data: { summary, topCustomers } });
  } catch (error) { next(error); }
};

const getSupplierReport = async (req, res, next) => {
  try {
    const dbName = req.dbName || "";
    const slug = dbName.replace("stocksense_tenant_", "").replace("stocksense_supplier_", "").replace("shop_", "").replace("supplier_", "");

    // 1. Identify the shop in master DB (UUID, db_name, or slug)
    const [[shopMapping]] = await masterPool.execute(
      "SELECT tenant_id FROM tenants WHERE db_name = ? OR shop_slug = ?",
      [dbName, slug]
    );
    const shopUuid = shopMapping ? shopMapping.tenant_id : null;

    // 2. Fetch local suppliers and their local metrics (RECEIVED/PARTIAL)
    const localOrderParams = [];
    const localOrderCond = getCondition('COALESCE(receivedDate, createdAt)', req, localOrderParams);

    const [localSuppliers] = await req.db.execute(
      `SELECT s.supplier_id, s.name, s.phone, s.isActive, s.slug as networkSlug,
              (SELECT COUNT(*) FROM products WHERE supplier_id = s.supplier_id) as productCount,
              (SELECT COUNT(*) FROM purchase_orders WHERE supplier_id = s.supplier_id 
               AND status != 'CANCELLED' AND ${localOrderCond}) as localOrders,
              (SELECT COALESCE(SUM(totalAmount), 0) FROM purchase_orders WHERE supplier_id = s.supplier_id 
               AND status != 'CANCELLED' AND ${localOrderCond}) as localPurchased
       FROM suppliers s
       WHERE s.isActive = TRUE`,
      [...localOrderParams, ...localOrderParams]
    );

    // 3. Fetch network B2B orders summaries for this shop (if identity found)
    let networkOrders = [];
    if (shopUuid || slug || dbName) {
      const b2bParams = [shopUuid, dbName, slug];
      const b2bCond = getCondition('o.createdAt', req, b2bParams);
      const b2bStatusFilter = "('PENDING', 'ORDERED', 'ACCEPTED', 'BILLED', 'CLOSED')";

      [networkOrders] = await masterPool.execute(
        `SELECT ms.db_name as supplierDbName, COUNT(*) as count, SUM(o.total_amount) as total
         FROM b2b_orders o
         JOIN suppliers ms ON ms.supplier_id = o.supplier_id
         WHERE (o.shop_id = ? OR o.shop_id = ? OR o.shop_id = ?)
         AND o.status IN ${b2bStatusFilter} AND ${b2bCond}
         GROUP BY ms.db_name`,
        b2bParams
      );
    }

    // 4. Combine results: Local totals + Network B2B totals
    const combined = localSuppliers.map(s => {
      const nMatch = networkOrders.find(no => no.supplierDbName === s.supplier_id);
      return {
        ...s,
        totalOrders: parseInt(s.localOrders || 0) + (nMatch ? parseInt(nMatch.count) : 0),
        totalPurchased: parseFloat(s.localPurchased || 0) + (nMatch ? parseFloat(nMatch.total) : 0)
      };
    });

    res.json({
      success: true,
      data: combined.sort((a, b) => b.totalPurchased - a.totalPurchased)
    });
  } catch (error) { next(error); }
};

const getInventoryReport = async (req, res, next) => {
  try {
    const [[totals]] = await req.db.execute(
      `SELECT COUNT(*) as totalProducts,
              COALESCE(SUM(stock * costPrice), 0)    as totalCostValue,
              COALESCE(SUM(stock * sellingPrice), 0) as totalRetailValue,
              SUM(CASE WHEN stock <= minStockLevel THEN 1 ELSE 0 END) as lowStockCount,
              SUM(CASE WHEN stock = 0 THEN 1 ELSE 0 END) as outOfStockCount
       FROM products WHERE isActive = TRUE`
    );

    const [lowStockItems] = await req.db.execute(
      `SELECT p.product_id, p.name, p.sku, p.stock, p.minStockLevel,
              p.sellingPrice, s.name as supplierName, s.phone as supplierPhone
       FROM products p
       LEFT JOIN suppliers s ON s.supplier_id = p.supplier_id
       WHERE p.stock <= p.minStockLevel AND p.isActive = TRUE
       ORDER BY (p.stock - p.minStockLevel) ASC`
    );

    const [categoryWise] = await req.db.execute(
      `SELECT c.name as categoryName, COUNT(p.product_id) as productCount,
              SUM(p.stock) as totalStock, SUM(p.stock * p.costPrice) as stockValue
       FROM categories c
       LEFT JOIN products p ON p.category_id = c.category_id AND p.isActive = TRUE
       WHERE c.isActive = TRUE
       GROUP BY c.category_id, c.name ORDER BY stockValue DESC`
    );

    res.json({ success: true, data: { totals, lowStockItems, categoryWise } });
  } catch (error) { next(error); }
};

const getProfitLoss = async (req, res, next) => {
  try {
    const userType = req.user.userType || 'shop';
    const statusFilter = userType === 'supplier'
      ? "status IN ('COMPLETED', 'PENDING')"
      : "status = 'COMPLETED'";

    const salesParams = [];
    const salesCond = getCondition('t.createdAt', req, salesParams);

    // Revenue & COGS logic
    const [[revData]] = await req.db.execute(
      `SELECT COALESCE(SUM(ti.totalAmount), 0) as revenue,
              COALESCE(SUM(ti.costPrice * ti.quantity), 0) as cogs
       FROM transaction_items ti
       JOIN transactions t ON t.transaction_id = ti.transaction_id
       WHERE ${salesCond} AND t.${statusFilter}`,
      salesParams
    );

    const revenue = parseFloat(revData.revenue);
    const cogs = parseFloat(revData.cogs);
    const expenses = 0; // Expenses table not yet implemented in schema
    const grossProfit = revenue - cogs;
    const netProfit = grossProfit;

    res.json({
      success: true,
      data: { revenue, cogs, expenses, grossProfit, netProfit }
    });
  } catch (error) { next(error); }
};

const getSupplierOrderHistory = async (req, res, next) => {
  try {
    const { supplierId } = req.params; // local db format (e.g. supplier_123)
    const dbName = req.dbName || "";
    const slug = dbName.replace("stocksense_tenant_", "").replace("stocksense_supplier_", "").replace("shop_", "").replace("supplier_", "");

    // 1. Identify shop in master DB
    const [[shopMapping]] = await masterPool.execute(
      "SELECT tenant_id FROM tenants WHERE db_name = ? OR shop_slug = ?",
      [dbName, slug]
    );
    const shopUuid = shopMapping ? shopMapping.tenant_id : null;

    // 2. Fetch local orders
    const [localOrders] = await req.db.execute(
      `SELECT po_id as id, poNumber as orderNumber, totalAmount, status, createdAt as date,
              'LOCAL' as source, subtotal, taxAmount
       FROM purchase_orders WHERE supplier_id = ?
       ORDER BY createdAt DESC`,
      [supplierId]
    );

    const localOrderIds = localOrders.map(o => o.id);
    let localItemsMap = {};
    if (localOrderIds.length > 0) {
      const placeholders = localOrderIds.map(() => '?').join(',');
      const [allLocalItems] = await req.db.execute(
        `SELECT po_item_id as id, po_id, product_id, productName as name, quantity as qty, 
                receivedQty, costPrice as price, taxAmount, totalAmount
         FROM purchase_order_items WHERE po_id IN (${placeholders})`,
        localOrderIds
      );
      allLocalItems.forEach(item => {
        if (!localItemsMap[item.po_id]) localItemsMap[item.po_id] = [];
        localItemsMap[item.po_id].push(item);
      });
    }

    localOrders.forEach(o => { o.items = localItemsMap[o.id] || []; });

    // 3. Fetch B2B network orders
    let networkOrders = [];
    if (shopUuid || slug || dbName) {
      const b2bParams = [shopUuid, dbName, slug, supplierId];
      const [rows] = await masterPool.execute(
        `SELECT o.order_id as id, o.order_number as orderNumber, o.total_amount as totalAmount, 
                o.status, o.createdAt as date, 'B2B' as source, o.notes
         FROM b2b_orders o
         JOIN suppliers ms ON ms.supplier_id = o.supplier_id
         WHERE (o.shop_id = ? OR o.shop_id = ? OR o.shop_id = ?)
         AND ms.db_name = ?
         ORDER BY o.createdAt DESC`,
        b2bParams
      );

      networkOrders = rows;
      
      const b2bOrderIds = networkOrders.map(o => o.id);
      let b2bItemsMap = {};
      if (b2bOrderIds.length > 0) {
        const placeholders = b2bOrderIds.map(() => '?').join(',');
        const [allB2BItems] = await masterPool.execute(
          `SELECT id, order_id, product_id, name, qty,
                  price, total as totalAmount
           FROM b2b_order_items WHERE order_id IN (${placeholders})`,
          b2bOrderIds
        );
        allB2BItems.forEach(item => {
          if (!b2bItemsMap[item.order_id]) b2bItemsMap[item.order_id] = [];
          b2bItemsMap[item.order_id].push(item);
        });
      }
      
      networkOrders.forEach(o => { o.items = b2bItemsMap[o.id] || []; });
    }

    const combined = [...localOrders, ...networkOrders].sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json({
      success: true,
      data: combined
    });
  } catch (error) { next(error); }
};

export {
  getSalesReport,
  getCustomerReport,
  getSupplierReport,
  getInventoryReport,
  getProfitLoss,
  getSupplierOrderHistory
};