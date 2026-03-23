const getDashboard = async (req, res, next) => {
  try {
    const [[todaySales]] = await req.db.execute(
      `SELECT COUNT(*) as totalTransactions,
              COALESCE(SUM(totalAmount), 0) as totalSales,
              COALESCE(SUM(taxAmount), 0)   as totalTax
       FROM transactions
       WHERE DATE(createdAt) = CURDATE() AND status = 'COMPLETED'`
    );

    const [[monthSales]] = await req.db.execute(
      `SELECT COALESCE(SUM(totalAmount), 0) as total
       FROM transactions
       WHERE MONTH(createdAt) = MONTH(CURDATE())
         AND YEAR(createdAt)  = YEAR(CURDATE())
         AND status = 'COMPLETED'`
    );

    const [[lastMonthSales]] = await req.db.execute(
      `SELECT COALESCE(SUM(totalAmount), 0) as total
       FROM transactions
       WHERE MONTH(createdAt) = MONTH(DATE_SUB(CURDATE(), INTERVAL 1 MONTH))
         AND YEAR(createdAt)  = YEAR(DATE_SUB(CURDATE(), INTERVAL 1 MONTH))
         AND status = 'COMPLETED'`
    );

    const [[productStats]] = await req.db.execute(
      `SELECT COUNT(*) as totalProducts,
              SUM(CASE WHEN stock <= minStockLevel THEN 1 ELSE 0 END) as lowStockCount,
              SUM(CASE WHEN stock = 0 THEN 1 ELSE 0 END)              as outOfStockCount
       FROM products WHERE isActive = TRUE`
    );

    const [[customerStats]] = await req.db.execute(
      `SELECT COUNT(*) as totalCustomers,
              SUM(CASE WHEN DATE(createdAt) = CURDATE() THEN 1 ELSE 0 END) as newToday
       FROM customers WHERE isActive = TRUE`
    );

    const thisMonth = parseFloat(monthSales.total);
    const lastMonth = parseFloat(lastMonthSales.total);
    const growth    = lastMonth > 0 ? (((thisMonth - lastMonth) / lastMonth) * 100).toFixed(1) : 0;

    const [last7Days] = await req.db.execute(
      `SELECT DATE(createdAt) as date, COUNT(*) as transactions, SUM(totalAmount) as sales
       FROM transactions
       WHERE createdAt >= DATE_SUB(CURDATE(), INTERVAL 6 DAY) AND status = 'COMPLETED'
       GROUP BY DATE(createdAt) ORDER BY date ASC`
    );

    const [topProducts] = await req.db.execute(
      `SELECT ti.productName, SUM(ti.quantity) as totalQty, SUM(ti.totalAmount) as totalRevenue
       FROM transaction_items ti
       JOIN transactions t ON t.transaction_id = ti.transaction_id
       WHERE MONTH(t.createdAt) = MONTH(CURDATE()) AND t.status = 'COMPLETED'
       GROUP BY ti.product_id, ti.productName
       ORDER BY totalRevenue DESC LIMIT 5`
    );

    const [recentTransactions] = await req.db.execute(
      `SELECT t.transaction_id, t.invoiceNumber, t.totalAmount,
              t.paymentMethod, t.status, t.createdAt,
              c.name as customerName, u.name as cashierName
       FROM transactions t
       LEFT JOIN customers c ON c.customer_id = t.customer_id
       LEFT JOIN users     u ON u.user_id     = t.user_id
       ORDER BY t.createdAt DESC LIMIT 5`
    );

    const [[{ pendingApprovals }]] = await req.db.execute(
      `SELECT COUNT(*) as pendingApprovals FROM users
       WHERE status = 'PENDING' AND emailVerified = TRUE`
    );

    res.json({
      success: true,
      data: {
        stats: {
          todaySales:        parseFloat(todaySales.totalSales),
          todayTransactions: todaySales.totalTransactions,
          monthSales:        thisMonth,
          salesGrowth:       parseFloat(growth),
          totalProducts:     productStats.totalProducts,
          lowStockCount:     productStats.lowStockCount,
          outOfStockCount:   productStats.outOfStockCount,
          totalCustomers:    customerStats.totalCustomers,
          newCustomersToday: customerStats.newToday,
          pendingApprovals,
        },
        charts: { last7Days, topProducts },
        recentTransactions,
      },
    });
  } catch (error) { next(error); }
};

export { getDashboard };