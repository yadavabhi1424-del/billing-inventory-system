import { masterPool } from "../../config/masterDatabase.js";

const getDashboard = async (req, res, next) => {
  try {
    const { period = 'week' } = req.query;
    const isOverall = period === 'overall';

    // Helper to generate date conditions with proper column prefixing
    const getCondition = (col, p) => {
      if (p === 'today') return `DATE(${col}) = CURDATE()`;
      if (p === 'week') return `${col} >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)`;
      if (p === 'month') return `MONTH(${col}) = MONTH(CURDATE()) AND YEAR(${col}) = YEAR(CURDATE())`;
      return "1=1";
    };

    const getPrevCondition = (col, p) => {
      if (p === 'today') return `DATE(${col}) = DATE_SUB(CURDATE(), INTERVAL 1 DAY)`;
      if (p === 'week') return `${col} >= DATE_SUB(CURDATE(), INTERVAL 13 DAY) AND ${col} < DATE_SUB(CURDATE(), INTERVAL 6 DAY)`;
      if (p === 'month') return `MONTH(${col}) = MONTH(DATE_SUB(CURDATE(), INTERVAL 1 MONTH)) AND YEAR(${col}) = YEAR(DATE_SUB(CURDATE(), INTERVAL 1 MONTH))`;
      return "1=1";
    };

    // 1. Transactions & Revenue
    const [[currentStats]] = await req.db.execute(
      `SELECT COUNT(*) as totalTransactions,
              COALESCE(SUM(totalAmount), 0) as totalRevenue,
              COALESCE(SUM(taxAmount), 0)   as totalTax
       FROM transactions
       WHERE ${getCondition('createdAt', period)} AND status = 'COMPLETED'`
    );

    // 2. Growth (Previous Period Revenue)
    let growth = null;
    if (!isOverall) {
      growth = 0;
      const [[prevStats]] = await req.db.execute(
        `SELECT COALESCE(SUM(totalAmount), 0) as totalRevenue
         FROM transactions
         WHERE ${getPrevCondition('createdAt', period)} AND status = 'COMPLETED'`
      );
      const currentRev = parseFloat(currentStats.totalRevenue);
      const prevRev = parseFloat(prevStats.totalRevenue);
      growth = prevRev > 0 ? (((currentRev - prevRev) / prevRev) * 100).toFixed(1) : 0;
    }

    // 3. Net Profit (SUM(totalAmount - (costPrice * quantity)))
    const [[profitData]] = await req.db.execute(
      `SELECT COALESCE(SUM(ti.totalAmount - (ti.costPrice * ti.quantity)), 0) as netProfit
       FROM transaction_items ti
       JOIN transactions t ON t.transaction_id = ti.transaction_id
       WHERE ${getCondition('t.createdAt', period)} AND t.status = 'COMPLETED'`
    );

    // 4. Procurement Stats (Ultimate Consolidation: Local + Network B2B)
    let procurementSpend = 0;
    let itemsPurchased    = 0;

    try {
      // 4a. LOCAL Manual Purchase Orders (Marked Received)
      const [[localSpend]] = await req.db.execute(
        `SELECT COALESCE(SUM(totalAmount), 0) as spend FROM purchase_orders
         WHERE ${getCondition('COALESCE(receivedDate, createdAt)', period)} AND status IN ('RECEIVED', 'PARTIAL')`
      );
      const [[localItems]] = await req.db.execute(
        `SELECT COALESCE(SUM(poi.receivedQty), 0) as items FROM purchase_order_items poi
         JOIN purchase_orders po ON po.po_id = poi.po_id
         WHERE ${getCondition('COALESCE(po.receivedDate, po.createdAt)', period)} AND po.status IN ('RECEIVED', 'PARTIAL')`
      );

      // 4b. NETWORK B2B Orders (Shop as Buyer)
      let networkSpend = 0;
      let networkItems = 0;

      // Identify the shop by everything possible: UUID, db_name, or slug
      const dbName   = req.dbName;
      const slug     = req.dbName.replace('shop_', '').replace('supplier_', '');
      const [[mapping]] = await masterPool.execute(
        "SELECT tenant_id FROM tenants WHERE db_name = ? OR shop_slug = ?",
        [dbName, slug]
      );

      if (mapping) {
        const uuid = mapping.tenant_id;
        const b2bStatusFilter = "('ACCEPTED', 'BILLED', 'CLOSED')";
        
        const [[nSpend]] = await masterPool.execute(
          `SELECT COALESCE(SUM(total_amount), 0) as spend FROM b2b_orders
           WHERE (shop_id = ? OR shop_id = ? OR shop_id = ?) 
           AND status IN ${b2bStatusFilter} AND ${getCondition('updatedAt', period)}`,
          [uuid, dbName, slug]
        );
        const [[nItems]] = await masterPool.execute(
          `SELECT COALESCE(SUM(oi.qty), 0) as items FROM b2b_order_items oi
           JOIN b2b_orders o ON o.order_id = oi.order_id
           WHERE (o.shop_id = ? OR o.shop_id = ? OR o.shop_id = ?) 
           AND o.status IN ${b2bStatusFilter} AND ${getCondition('o.updatedAt', period)}`,
          [uuid, dbName, slug]
        );

        networkSpend = parseFloat(nSpend.spend) || 0;
        networkItems = parseInt(nItems.items)    || 0;
      }

      procurementSpend = (parseFloat(localSpend.spend) || 0) + networkSpend;
      itemsPurchased    = (parseInt(localItems.items)    || 0) + networkItems;
    } catch (err) {
      console.error("Dashboard Procurement Stats Error:", err);
    }

    // 5. Static Inventory Stats (Always total)
    const [[inventoryStats]] = await req.db.execute(
      `SELECT COUNT(*) as totalProducts,
              SUM(CASE WHEN stock <= minStockLevel THEN 1 ELSE 0 END) as lowStockCount
       FROM products WHERE isActive = TRUE`
    );

    // 6. Charts logic
    // 6a. 7-Day Revenue (Always 7 days padded)
    const [last7DaysRaw] = await req.db.execute(
      `SELECT DATE(createdAt) as date, SUM(totalAmount) as sales
       FROM transactions
       WHERE createdAt >= DATE_SUB(CURDATE(), INTERVAL 6 DAY) AND status = 'COMPLETED'
       GROUP BY DATE(createdAt) ORDER BY date ASC`
    );
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const match = last7DaysRaw.find(r => {
        const rDate = new Date(r.date);
        return rDate.toISOString().split('T')[0] === dateStr;
      });
      const sales = match ? parseFloat(match.sales) : 0;
      const prevSales = last7Days[last7Days.length - 1]?.sales || 0;
      let barGrowth = 0;
      if (prevSales > 0) barGrowth = ((sales - prevSales) / prevSales) * 100;
      else if (sales > 0) barGrowth = 100;

      last7Days.push({ date: dateStr, sales, growth: parseFloat(barGrowth.toFixed(1)) });
    }

    // 6b. 12-Month Revenue (Padded)
    const [last12MonthsRaw] = await req.db.execute(
      `SELECT DATE_FORMAT(createdAt, '%Y-%m') as date, SUM(totalAmount) as sales
       FROM transactions
       WHERE createdAt >= DATE_SUB(CURDATE(), INTERVAL 11 MONTH) AND status = 'COMPLETED'
       GROUP BY date ORDER BY date ASC`
    );
    const last12Months = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const dateStr = d.toISOString().split('T')[0].substring(0, 7);
      const match = last12MonthsRaw.find(r => r.date === dateStr);
      const sales = match ? parseFloat(match.sales) : 0;
      const prevSales = last12Months[last12Months.length - 1]?.sales || 0;
      let barGrowth = 0;
      if (prevSales > 0) barGrowth = ((sales - prevSales) / prevSales) * 100;
      else if (sales > 0) barGrowth = 100;

      last12Months.push({ date: dateStr, sales, growth: parseFloat(barGrowth.toFixed(1)) });
    }

    // 6c. Drilldown Handle (Weekly breakdown of a specific month)
    let weekDrilldown = null;
    const { drillDownMonth } = req.query; // Expects YYYY-MM
    if (drillDownMonth) {
      const [drillDownRaw] = await req.db.execute(
        `SELECT WEEK(createdAt, 1) - WEEK(DATE_FORMAT(createdAt, '%Y-%m-01'), 1) + 1 as week,
                SUM(totalAmount) as sales
         FROM transactions
         WHERE DATE_FORMAT(createdAt, '%Y-%m') = ? AND status = 'COMPLETED'
         GROUP BY week ORDER BY week ASC`,
        [drillDownMonth]
      );
      // Pad to 5 weeks for safety
      weekDrilldown = Array.from({ length: 5 }, (_, i) => {
        const weekNum = i + 1;
        const match = drillDownRaw.find(r => r.week === weekNum);
        const sales = match ? parseFloat(match.sales) : 0;
        return { week: `Week ${weekNum}`, sales };
      });
    }

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
       ORDER BY t.createdAt DESC LIMIT 4`
    );

    res.json({
      success: true,
      data: {
        stats: {
          revenue: parseFloat(currentStats.totalRevenue),
          transactions: currentStats.totalTransactions,
          netProfit: parseFloat(profitData.netProfit),
          salesGrowth: isOverall ? null : parseFloat(growth),
          itemsPurchased: itemsPurchased,
          procurementSpend: procurementSpend,
          totalProducts: inventoryStats.totalProducts,
          lowStockCount: inventoryStats.lowStockCount,
        },
        charts: { last7Days, last12Months, topProducts, weekDrilldown },
        recentTransactions,
      },
    });
  } catch (error) { next(error); }
};

export { getDashboard };