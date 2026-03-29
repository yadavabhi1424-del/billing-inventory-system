const getDateRange = (req) => {
  const start = req.query.startDate
    ? `${req.query.startDate} 00:00:00`
    : new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        .toISOString().slice(0, 19).replace("T", " ");
  const end = req.query.endDate
    ? `${req.query.endDate} 23:59:59`
    : new Date().toISOString().slice(0, 19).replace("T", " ");
  return { start, end };
};

const getSalesReport = async (req, res, next) => {
  try {
    const { start, end } = getDateRange(req);
    const userType = req.user.userType || 'shop';
    
    // Suppliers include PENDING (B2B orders), Shops only COMPLETED (POS)
    const statusFilter = userType === 'supplier' 
      ? "status IN ('COMPLETED', 'PENDING')" 
      : "status = 'COMPLETED'";

    const [[summary]] = await req.db.execute(
      `SELECT COUNT(*) as totalTransactions,
              COALESCE(SUM(totalAmount),0)    as totalSales,
              COALESCE(SUM(taxAmount),0)      as totalTax,
              COALESCE(SUM(discountAmount),0) as totalDiscount,
              COALESCE(AVG(totalAmount),0)    as avgOrderValue
       FROM transactions WHERE createdAt BETWEEN ? AND ? AND ${statusFilter}`,
      [start, end]
    );

    const [byPaymentMethod] = await req.db.execute(
      `SELECT paymentMethod, COUNT(*) as count, SUM(totalAmount) as total
       FROM transactions WHERE createdAt BETWEEN ? AND ? AND ${statusFilter}
       GROUP BY paymentMethod`,
      [start, end]
    );

    const [topProducts] = await req.db.execute(
      `SELECT ti.productName, ti.product_id,
              SUM(ti.quantity) as totalQty, SUM(ti.totalAmount) as totalRevenue
       FROM transaction_items ti
       JOIN transactions t ON t.transaction_id = ti.transaction_id
       WHERE t.createdAt BETWEEN ? AND ? AND t.${statusFilter}
       GROUP BY ti.product_id, ti.productName
       ORDER BY totalRevenue DESC LIMIT 10`,
      [start, end]
    );

    const [dailyBreakdown] = await req.db.execute(
      `SELECT DATE(createdAt) as date, COUNT(*) as transactions,
              SUM(totalAmount) as sales, SUM(taxAmount) as tax, SUM(discountAmount) as discount
       FROM transactions WHERE createdAt BETWEEN ? AND ? AND ${statusFilter}
       GROUP BY DATE(createdAt) ORDER BY date ASC`,
      [start, end]
    );

    res.json({ success: true, data: { summary, byPaymentMethod, topProducts, dailyBreakdown } });
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

const getCustomerReport = async (req, res, next) => {
  try {
    const { start, end } = getDateRange(req);
    const userType = req.user.userType || 'shop';

    let summaryQuery, topCustomersQuery;

    if (userType === 'supplier') {
      // For Suppliers: "Customers" are Shops that placed B2B orders
      summaryQuery = `
        SELECT COUNT(DISTINCT customer_id) as totalCustomers,
               COUNT(DISTINCT CASE WHEN createdAt BETWEEN ? AND ? THEN customer_id END) as newCustomers
        FROM customers WHERE isActive = TRUE AND shop_tenant_id IS NOT NULL`;
      
      topCustomersQuery = `
        SELECT customer_id, name, phone, totalSpent, shop_tenant_id as shopId,
               (SELECT COUNT(*) FROM transactions WHERE customer_id = c.customer_id) as totalOrders
        FROM customers c
        WHERE isActive = TRUE AND shop_tenant_id IS NOT NULL AND totalSpent > 0
        ORDER BY totalSpent DESC LIMIT 10`;
    } else {
      // For Shops: Normal Retail Customers
      summaryQuery = `
        SELECT COUNT(*) as totalCustomers,
               SUM(CASE WHEN createdAt BETWEEN ? AND ? THEN 1 ELSE 0 END) as newCustomers
        FROM customers WHERE isActive = TRUE AND shop_tenant_id IS NULL`;
      
      topCustomersQuery = `
        SELECT customer_id, name, phone, totalSpent, loyaltyPoints,
               (SELECT COUNT(*) FROM transactions WHERE customer_id = c.customer_id) as totalOrders
        FROM customers c
        WHERE isActive = TRUE AND shop_tenant_id IS NULL AND totalSpent > 0
        ORDER BY totalSpent DESC LIMIT 10`;
    }

    const [[summary]] = await req.db.execute(summaryQuery, [start, end]);
    const [topCustomers] = await req.db.execute(topCustomersQuery);


    res.json({ success: true, data: { summary, topCustomers } });
  } catch (error) { next(error); }
};

const getSupplierReport = async (req, res, next) => {
  try {
    const { start, end } = getDateRange(req);

    const [suppliers] = await req.db.execute(
      `SELECT s.supplier_id, s.name, s.phone,
              COUNT(DISTINCT p.product_id)     as productCount,
              COUNT(DISTINCT po.po_id)         as totalOrders,
              COALESCE(SUM(po.totalAmount), 0) as totalPurchased
       FROM suppliers s
       LEFT JOIN products        p  ON p.supplier_id  = s.supplier_id AND p.isActive = TRUE
       LEFT JOIN purchase_orders po ON po.supplier_id = s.supplier_id
         AND po.createdAt BETWEEN ? AND ?
       WHERE s.isActive = TRUE
       GROUP BY s.supplier_id, s.name, s.phone ORDER BY totalPurchased DESC`,
      [start, end]
    );

    res.json({ success: true, data: suppliers });
  } catch (error) { next(error); }
};

const getProfitLoss = async (req, res, next) => {
  try {
    const { start, end } = getDateRange(req);

    const [[result]] = await req.db.execute(
      `SELECT COALESCE(SUM(ti.totalAmount), 0)             as totalRevenue,
              COALESCE(SUM(ti.costPrice * ti.quantity), 0) as totalCost,
              COALESCE(SUM(ti.taxAmount), 0)               as totalTax,
              COALESCE(SUM(ti.discountAmount), 0)          as totalDiscount,
              COALESCE(SUM(ti.quantity), 0)                as totalItemsSold
       FROM transaction_items ti
       JOIN transactions t ON t.transaction_id = ti.transaction_id
       WHERE t.createdAt BETWEEN ? AND ? AND t.status = 'COMPLETED'`,
      [start, end]
    );

    const grossProfit  = result.totalRevenue - result.totalCost - result.totalTax;
    const profitMargin = result.totalRevenue > 0
      ? ((grossProfit / result.totalRevenue) * 100).toFixed(2) : 0;

    res.json({
      success: true,
      data: { ...result, grossProfit, profitMargin: parseFloat(profitMargin) },
    });
  } catch (error) { next(error); }
};

export { getSalesReport, getInventoryReport, getCustomerReport, getSupplierReport, getProfitLoss };