const { pool } = require("../../config/database");

const getDashboard = async (req, res, next) => {
  try {
    // Today's sales
    const [[todaySales]] = await pool.execute(
      `SELECT
        COUNT(*)                      as totalTransactions,
        COALESCE(SUM(totalAmount), 0) as totalSales,
        COALESCE(SUM(taxAmount), 0)   as totalTax
       FROM transactions
       WHERE DATE(createdAt) = CURDATE()
         AND status = 'COMPLETED'`
    );

    // This month vs last month
    const [[monthSales]] = await pool.execute(
      `SELECT COALESCE(SUM(totalAmount), 0) as total
       FROM transactions
       WHERE MONTH(createdAt) = MONTH(CURDATE())
         AND YEAR(createdAt)  = YEAR(CURDATE())
         AND status = 'COMPLETED'`
    );

    const [[lastMonthSales]] = await pool.execute(
      `SELECT COALESCE(SUM(totalAmount), 0) as total
       FROM transactions
       WHERE MONTH(createdAt) = MONTH(DATE_SUB(CURDATE(), INTERVAL 1 MONTH))
         AND YEAR(createdAt)  = YEAR(DATE_SUB(CURDATE(), INTERVAL 1 MONTH))
         AND status = 'COMPLETED'`
    );

    // Products stats
    const [[productStats]] = await pool.execute(
      `SELECT
        COUNT(*)                                                    as totalProducts,
        SUM(CASE WHEN stock <= minStockLevel THEN 1 ELSE 0 END)    as lowStockCount,
        SUM(CASE WHEN stock = 0 THEN 1 ELSE 0 END)                 as outOfStockCount
       FROM products WHERE isActive = TRUE`
    );

    // Customer stats
    const [[customerStats]] = await pool.execute(
      `SELECT
        COUNT(*)                                                         as totalCustomers,
        SUM(CASE WHEN DATE(createdAt) = CURDATE() THEN 1 ELSE 0 END)   as newToday
       FROM customers WHERE isActive = TRUE`
    );

    // Sales growth %
    const thisMonth  = parseFloat(monthSales.total);
    const lastMonth  = parseFloat(lastMonthSales.total);
    const growth     = lastMonth > 0
      ? (((thisMonth - lastMonth) / lastMonth) * 100).toFixed(1)
      : 0;

    // Last 7 days chart data
    const [last7Days] = await pool.execute(
      `SELECT
        DATE(createdAt)          as date,
        COUNT(*)                 as transactions,
        SUM(totalAmount)         as sales
       FROM transactions
       WHERE createdAt >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
         AND status = 'COMPLETED'
       GROUP BY DATE(createdAt)
       ORDER BY date ASC`
    );

    // Top 5 products this month
    const [topProducts] = await pool.execute(
      `SELECT ti.productName,
              SUM(ti.quantity)    as totalQty,
              SUM(ti.totalAmount) as totalRevenue
       FROM transaction_items ti
       JOIN transactions t ON t.transaction_id = ti.transaction_id
       WHERE MONTH(t.createdAt) = MONTH(CURDATE())
         AND t.status = 'COMPLETED'
       GROUP BY ti.product_id, ti.productName
       ORDER BY totalRevenue DESC
       LIMIT 5`
    );

    // Recent 5 transactions
    const [recentTransactions] = await pool.execute(
      `SELECT t.transaction_id, t.invoiceNumber,
              t.totalAmount, t.paymentMethod,
              t.status, t.createdAt,
              c.name as customerName,
              u.name as cashierName
       FROM transactions t
       LEFT JOIN customers c ON c.customer_id = t.customer_id
       LEFT JOIN users     u ON u.user_id     = t.user_id
       ORDER BY t.createdAt DESC
       LIMIT 5`
    );

    // Pending approvals count
    const [[{ pendingApprovals }]] = await pool.execute(
      `SELECT COUNT(*) as pendingApprovals
       FROM users
       WHERE status = 'PENDING' AND emailVerified = TRUE`
    );

    res.json({
      success: true,
      data: {
        stats: {
          todaySales:       parseFloat(todaySales.totalSales),
          todayTransactions: todaySales.totalTransactions,
          monthSales:       thisMonth,
          salesGrowth:      parseFloat(growth),
          totalProducts:    productStats.totalProducts,
          lowStockCount:    productStats.lowStockCount,
          outOfStockCount:  productStats.outOfStockCount,
          totalCustomers:   customerStats.totalCustomers,
          newCustomersToday: customerStats.newToday,
          pendingApprovals,
        },
        charts: { last7Days, topProducts },
        recentTransactions,
      },
    });
  } catch (error) { next(error); }
};

module.exports = { getDashboard };