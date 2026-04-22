import { masterPool } from "../../config/masterDatabase.js";

// ── Standardized condition generator ─────────────────────────────────────────
const getCondition = (col, req, params = []) => {
  const { startDate, endDate, period, month, year } = req.query;
  // Use DATE_ADD(..., INTERVAL 330 MINUTE) for IST (+5:30) as it is most compatible
  const tzCol = `DATE_ADD(${col}, INTERVAL 330 MINUTE)`;
  const nowTz = `DATE_ADD(NOW(), INTERVAL 330 MINUTE)`;

  if (startDate && endDate) {
    const s = startDate.includes(':') ? startDate : `${startDate} 00:00:00`;
    const e = endDate.includes(':')   ? endDate   : `${endDate} 23:59:59`;
    params.push(s, e);
    return `${tzCol} BETWEEN ? AND ?`;
  }

  if (period === 'today') return `DATE(${tzCol}) = DATE(${nowTz})`;
  if (period === 'yesterday') return `DATE(${tzCol}) = DATE_SUB(DATE(${nowTz}), INTERVAL 1 DAY)`;
  if (period === 'week')  return `DATE(${tzCol}) >= DATE_SUB(DATE(${nowTz}), INTERVAL 6 DAY)`;
  if (period === 'month') return `MONTH(${tzCol}) = MONTH(${nowTz}) AND YEAR(${tzCol}) = YEAR(${nowTz})`;
  if (period === 'year')  return `YEAR(${tzCol}) = YEAR(${nowTz})`;

  if (month && year) {
    params.push(parseInt(month), parseInt(year));
    return `MONTH(${tzCol}) = ? AND YEAR(${tzCol}) = ?`;
  }

  if (year) {
    params.push(parseInt(year));
    return `YEAR(${tzCol}) = ?`;
  }

  return "1=1";
};

// Internal helper to get all possible IDs for a tenant (UUIDs + dbName)
const getTenantIds = async (dbName) => {
  const ids = new Set([dbName]);
  try {
    const [[sup]] = await masterPool.execute("SELECT supplier_id FROM suppliers WHERE db_name = ?", [dbName]);
    if (sup?.supplier_id) ids.add(sup.supplier_id);
    const [[ten]] = await masterPool.execute("SELECT tenant_id FROM tenants WHERE db_name = ?", [dbName]);
    if (ten?.tenant_id) ids.add(ten.tenant_id);
  } catch (e) { console.error("ID lookup error", e); }
  return Array.from(ids);
};

// ── 1. Sales Report (Retail) ─────────────────────────────────────────────────
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

    const { limit = 5, sortBy = 'revenue', order = 'top' } = req.query;
    const sortCol = sortBy === 'qty' ? 'totalQty' : 'totalRevenue';
    const sortDir = order === 'bottom' ? 'ASC' : 'DESC';
    const limitNum = Math.max(1, Math.min(100, parseInt(limit) || 5));

    const productsParams = [];
    const productsCond = getCondition('t.createdAt', req, productsParams);
    const [topProducts] = await req.db.execute(
      `SELECT ti.productName, SUM(ti.quantity) as totalQty, SUM(ti.totalAmount) as totalRevenue
       FROM transaction_items ti
       JOIN transactions t ON t.transaction_id = ti.transaction_id
       WHERE ${productsCond} AND t.${statusFilter}
       GROUP BY ti.product_id, ti.productName
       ORDER BY ${sortCol} ${sortDir} LIMIT ${limitNum}`,
      productsParams
    );

    const paymentParams = [];
    const paymentCond = getCondition('createdAt', req, paymentParams);
    const [byPaymentMethod] = await req.db.execute(
      `SELECT paymentMethod, SUM(totalAmount) as total, COUNT(*) as count
       FROM transactions WHERE ${paymentCond} AND ${statusFilter}
       GROUP BY paymentMethod`,
      paymentParams
    );

    res.json({ success: true, data: { summary, topProducts, byPaymentMethod } });
  } catch (error) { next(error); }
};

// ── 2. Detailed Date-wise Sales Dashboard ─────────────────────────────────────
const getDetailedSalesReport = async (req, res, next) => {
  try {
    const userType = req.user.userType || 'shop';
    const statusFilter = userType === 'supplier'
      ? "status IN ('COMPLETED', 'PENDING')"
      : "status = 'COMPLETED'";

    const p = [];
    const cond = getCondition('t.createdAt', req, p);

    const [[agg]] = await req.db.execute(
      `SELECT
         COUNT(DISTINCT t.transaction_id)            AS totalTransactions,
         COALESCE(SUM(ti.quantity), 0)              AS totalItemsSold,
         COALESCE(SUM(ti.totalAmount), 0)           AS totalRevenue,
         COALESCE(SUM(ti.costPrice * ti.quantity),0) AS totalCost,
         COALESCE(SUM(t.discountAmount), 0)         AS totalDiscount,
         COALESCE(SUM(t.taxAmount), 0)              AS totalTax
       FROM transactions t
       JOIN transaction_items ti ON ti.transaction_id = t.transaction_id
       WHERE ${cond} AND t.${statusFilter}`,
      p
    );

    const retP = [];
    const retCond = getCondition('createdAt', req, retP);
    const [[retAgg]] = await req.db.execute(
      `SELECT COUNT(*) AS returnCount,
              COALESCE(SUM(ABS(totalAmount)), 0) AS returnAmount
       FROM transactions WHERE ${retCond} AND status IN ('RETURNED', 'REFUNDED')`,
      retP
    );

    const peakP = [];
    const peakCond = getCondition('createdAt', req, peakP);
    const [peakHours] = await req.db.execute(
      `SELECT HOUR(DATE_ADD(createdAt, INTERVAL 330 MINUTE)) AS hour,
              COUNT(*) AS transactionCount,
              COALESCE(SUM(totalAmount), 0) AS revenue
       FROM transactions
       WHERE ${peakCond} AND ${statusFilter}
       GROUP BY hour
       ORDER BY hour ASC`,
      peakP
    );

    const payP = [];
    const payCond = getCondition('createdAt', req, payP);
    const [byPaymentMethod] = await req.db.execute(
      `SELECT paymentMethod, SUM(totalAmount) AS total, COUNT(*) AS count
       FROM transactions WHERE ${payCond} AND ${statusFilter}
       GROUP BY paymentMethod`,
      payP
    );

    const txP = [];
    const txCond = getCondition('t.createdAt', req, txP);
    const txLimit = Math.min(100, parseInt(req.query.txLimit) || 50);
    const [transactions] = await req.db.execute(
      `SELECT t.transaction_id, t.invoiceNumber, t.createdAt, t.totalAmount,
              t.paymentMethod, t.status, t.discountAmount, t.taxAmount,
              c.name AS customerName
       FROM transactions t
       LEFT JOIN customers c ON c.customer_id = t.customer_id
       WHERE ${txCond} AND t.${statusFilter}
       ORDER BY t.createdAt DESC LIMIT ${txLimit}`,
      txP
    );

    const revenue   = parseFloat(agg.totalRevenue);
    const cost      = parseFloat(agg.totalCost);
    const discount  = parseFloat(agg.totalDiscount);
    const returnAmt = parseFloat(retAgg.returnAmount);
    const profit    = revenue - cost;
    const netRevenue = revenue - returnAmt - discount;

    res.json({
      success: true,
      data: {
        summary: {
          totalTransactions: agg.totalTransactions,
          totalItemsSold:    agg.totalItemsSold,
          totalRevenue:      revenue,
          totalCost:         cost,
          profit,
          profitMargin: revenue > 0 ? ((profit / revenue) * 100).toFixed(1) : 0,
          totalDiscount:     discount,
          totalTax:          agg.totalTax,
          returnCount:       retAgg.returnCount,
          returnAmount:      returnAmt,
          netRevenue,
        },
        peakHours,
        byPaymentMethod,
        transactions,
      }
    });
  } catch (error) { next(error); }
};

// ── 3. Category Analytics ─────────────────────────────────────────────────────
const getCategoryAnalytics = async (req, res, next) => {
  try {
    const userType = req.user.userType || 'shop';
    const statusFilter = userType === 'supplier'
      ? "status IN ('COMPLETED', 'PENDING')"
      : "status = 'COMPLETED'";

    const p = [];
    const cond = getCondition('t.createdAt', req, p);

    const [rows] = await req.db.execute(
      `SELECT
         COALESCE(c.name, 'Uncategorized') AS categoryName,
         c.color                            AS categoryColor,
         COUNT(DISTINCT t.transaction_id)   AS transactionCount,
         SUM(ti.quantity)                   AS totalQty,
         SUM(ti.totalAmount)                AS totalRevenue
       FROM transaction_items ti
       JOIN transactions t  ON t.transaction_id  = ti.transaction_id
       LEFT JOIN products p ON p.product_id      = ti.product_id
       LEFT JOIN categories c ON c.category_id   = p.category_id
       WHERE ${cond} AND t.${statusFilter}
       GROUP BY COALESCE(c.name, 'Uncategorized'), c.color
       ORDER BY totalRevenue DESC`,
      p
    );

    const [invCat] = await req.db.execute(
      `SELECT c.name AS categoryName, c.color AS categoryColor,
              COUNT(p.product_id) AS productCount,
              COALESCE(SUM(p.stock), 0) AS totalStock,
              COALESCE(SUM(p.stock * p.costPrice), 0) AS stockValue
       FROM categories c
       LEFT JOIN products p ON p.category_id = c.category_id AND p.isActive = TRUE
       WHERE c.isActive = TRUE
       GROUP BY c.category_id, c.name, c.color
       ORDER BY stockValue DESC`
    );

    res.json({ success: true, data: { salesByCategory: rows, inventoryByCategory: invCat } });
  } catch (error) { next(error); }
};

// ── 4. Returns Analysis ───────────────────────────────────────────────────────
const getReturnsAnalysis = async (req, res, next) => {
  try {
    const isSupplier = req.user.userType === 'supplier';
    const dbName = req.dbName;

    // 1. Get ALL possible IDs for this tenant (Inconsistent IDs across B2B records)
    const tenantIds = await getTenantIds(dbName);

    // 2. Fetch POS Returns (local)
    const retP = [];
    const retCond = getCondition('createdAt', req, retP);
    const [[posSummary]] = await req.db.execute(
      `SELECT COUNT(DISTINCT transaction_id) AS returnCount,
              COALESCE(SUM(ABS(totalAmount)), 0) AS returnAmount
       FROM transactions WHERE ${retCond} AND status IN ('RETURNED', 'REFUNDED')`,
      retP
    );

    // 3. Fetch B2B Returns (Master)
    let b2bSummary = { returnCount: 0, returnAmount: 0 };
    let b2bItems = [];
    
    if (tenantIds.length > 0) {
      const b2bP = [];
      const b2bCond = getCondition('createdAt', req, b2bP);
      const tenantCol = isSupplier ? "supplier_id" : "shop_id";
      const idPlaceholders = tenantIds.map(() => '?').join(',');
      const finalB2bP = [...b2bP, ...tenantIds];

      const [[b2bSum]] = await masterPool.execute(
        `SELECT COUNT(*) AS returnCount,
                COALESCE(SUM(total_refund_amount), 0) AS returnAmount
         FROM b2b_returns 
         WHERE ${b2bCond} AND ${tenantCol} IN (${idPlaceholders}) 
         AND status IN ('PENDING', 'APPROVED', 'RETURN_REQUESTED')`,
        finalB2bP
      );
      b2bSummary = b2bSum;

      const [b2bItms] = await masterPool.execute(
        `SELECT ri.name AS productName,
                SUM(ri.return_qty) AS returnedQty,
                SUM(ri.refund_amount) AS lostRevenue,
                COUNT(DISTINCT r.return_id) AS returnCount
         FROM b2b_return_items ri
         JOIN b2b_returns r ON r.return_id = ri.return_id
         WHERE ${b2bCond} AND r.${tenantCol} IN (${idPlaceholders}) 
         AND r.status IN ('PENDING', 'APPROVED', 'RETURN_REQUESTED')
         GROUP BY ri.product_id, ri.name`,
        finalB2bP
      );
      b2bItems = b2bItms;
    }

    const totalReturnCount  = (posSummary.returnCount || 0) + (b2bSummary.returnCount || 0);
    const totalReturnAmount = parseFloat(posSummary.returnAmount || 0) + parseFloat(b2bSummary.returnAmount || 0);

    const mrP = [];
    const mrCond = getCondition('t.createdAt', req, mrP);
    const [posReturnedItems] = await req.db.execute(
      `SELECT ti.productName, SUM(ABS(ti.quantity)) AS returnedQty, SUM(ABS(ti.totalAmount)) AS lostRevenue,
              COUNT(DISTINCT t.transaction_id) AS returnCount
       FROM transaction_items ti JOIN transactions t ON t.transaction_id = ti.transaction_id
       WHERE ${mrCond} AND t.status IN ('RETURNED', 'REFUNDED')
       GROUP BY ti.productName`,
      mrP
    );

    const mergedMap = new Map();
    [...posReturnedItems, ...b2bItems].forEach(item => {
      const key = item.productName?.toLowerCase().trim(); if (!key) return;
      if (mergedMap.has(key)) {
        const ex = mergedMap.get(key);
        ex.returnedQty += Number(item.returnedQty); ex.lostRevenue += Number(item.lostRevenue); ex.returnCount += Number(item.returnCount);
      } else { mergedMap.set(key, { ...item, returnedQty: Number(item.returnedQty), lostRevenue: Number(item.lostRevenue), returnCount: Number(item.returnCount) }); }
    });
    const mostReturned = Array.from(mergedMap.values()).sort((a,b) => b.returnedQty - a.returnedQty).slice(0, 10);

    const [[totalSales]] = await req.db.execute(
      `SELECT COUNT(*) AS total FROM transactions WHERE status = 'COMPLETED'`
    );
    const [stockLoss] = await req.db.execute(
      `SELECT sm.type, COUNT(*) AS count, ABS(SUM(sm.quantity)) AS lostQty,
              COALESCE(SUM(ABS(sm.quantity) * p.costPrice), 0) AS lostValue
       FROM stock_movements sm JOIN products p ON p.product_id = sm.product_id
       WHERE sm.type IN ('DAMAGE', 'EXPIRY', 'LOST') GROUP BY sm.type`
    );

    res.json({
      success: true,
      data: {
        summary: { returnCount: totalReturnCount, returnAmount: totalReturnAmount, 
                   returnRate: totalSales.total > 0 ? ((totalReturnCount / totalSales.total) * 100).toFixed(2) : 0,
                   stockLossValue: stockLoss.reduce((s, r) => s + parseFloat(r.lostValue || 0), 0) },
        mostReturned, stockLoss,
      }
    });
  } catch (error) { next(error); }
};

// ── 5. Customer Report ────────────────────────────────────────────────────────
const getCustomerReport = async (req, res, next) => {
  try {
    const isSupplier = req.user.userType === 'supplier';
    const dbName = req.dbName;
    const { limit = 10, sortBy = 'spent' } = req.query;
    const limitNum = Math.max(1, Math.min(200, parseInt(limit) || 10));
    const tenantIds = await getTenantIds(dbName);

    // ─────────────────────────────────────────────────────────
    // SHOP / B2B SUPPLIER path
    // ─────────────────────────────────────────────────────────
    if (isSupplier && tenantIds.length > 0) {
      const idPlaceholders = tenantIds.map(() => '?').join(',');

      // 1) Overview
      const [[totalRow]] = await masterPool.execute(
        `SELECT COUNT(DISTINCT shop_id) as totalCustomers FROM b2b_orders WHERE supplier_id IN (${idPlaceholders})`,
        tenantIds
      );
      const [[newTodayRow]] = await masterPool.execute(
        `SELECT COUNT(DISTINCT shop_id) as cnt FROM b2b_orders
         WHERE supplier_id IN (${idPlaceholders}) AND DATE(createdAt) = CURDATE()`, tenantIds
      );
      const [[newMonthRow]] = await masterPool.execute(
        `SELECT COUNT(DISTINCT shop_id) as cnt FROM b2b_orders
         WHERE supplier_id IN (${idPlaceholders})
         AND MONTH(createdAt)=MONTH(NOW()) AND YEAR(createdAt)=YEAR(NOW())`, tenantIds
      );
      const [[newYearRow]] = await masterPool.execute(
        `SELECT COUNT(DISTINCT shop_id) as cnt FROM b2b_orders
         WHERE supplier_id IN (${idPlaceholders}) AND YEAR(createdAt)=YEAR(NOW())`, tenantIds
      );
      const [[repeatRow]] = await masterPool.execute(
        `SELECT COUNT(*) as cnt FROM (
           SELECT shop_id FROM b2b_orders WHERE supplier_id IN (${idPlaceholders})
           AND status IN ('PENDING','ACCEPTED','BILLED','CLOSED')
           GROUP BY shop_id HAVING COUNT(order_id) > 1
         ) x`, tenantIds
      );
      const totalCust = totalRow.totalCustomers || 0;
      const repeatCust = repeatRow.cnt || 0;

      const overview = {
        totalCustomers: totalCust,
        newToday:       newTodayRow.cnt  || 0,
        newThisMonth:   newMonthRow.cnt  || 0,
        newThisYear:    newYearRow.cnt   || 0,
        activeCustomers:   totalCust,
        inactiveCustomers: 0,
        repeatCustomers:   repeatCust,
        oneTimeCustomers:  totalCust - repeatCust,
      };

      // 2) Top Customers
      const [topCustomers] = await masterPool.execute(
        `SELECT o.shop_id as customer_id,
                COALESCE(p.business_name, t.shop_name, s.business_name, o.shop_id) as name,
                COALESCE(p.phone, t.owner_phone, s.owner_phone) as phone,
                COALESCE(SUM(o.total_amount), 0) as totalSpent,
                COUNT(o.order_id) as totalOrders,
                MAX(o.createdAt) as lastPurchaseDate,
                o.shop_id as shopId
         FROM b2b_orders o
         LEFT JOIN profiles p ON p.entity_id = o.shop_id
         LEFT JOIN tenants t  ON t.db_name = o.shop_id
         LEFT JOIN suppliers s ON s.supplier_id = o.shop_id
         WHERE o.supplier_id IN (${idPlaceholders})
           AND o.status IN ('PENDING','ACCEPTED','BILLED','CLOSED')
         GROUP BY o.shop_id, p.business_name, t.shop_name, s.business_name, p.phone, t.owner_phone, s.owner_phone
         ORDER BY ${sortBy === 'orders' ? 'totalOrders' : 'totalSpent'} DESC
         LIMIT ${limitNum}`,
        tenantIds
      );

      // 3) Inactive customers (by last order date)
      const [inactiveRaw] = await masterPool.execute(
        `SELECT o.shop_id as customer_id,
                COALESCE(p.business_name, t.shop_name, s.business_name, o.shop_id) as name,
                COALESCE(p.phone, t.owner_phone, s.owner_phone) as phone,
                MAX(o.createdAt) as lastPurchaseDate,
                COUNT(o.order_id) as totalOrders,
                COALESCE(SUM(o.total_amount), 0) as totalSpent,
                DATEDIFF(NOW(), MAX(o.createdAt)) as daysSinceOrder
         FROM b2b_orders o
         LEFT JOIN profiles p ON p.entity_id = o.shop_id
         LEFT JOIN tenants t  ON t.db_name = o.shop_id
         LEFT JOIN suppliers s ON s.supplier_id = o.shop_id
         WHERE o.supplier_id IN (${idPlaceholders})
           AND o.status IN ('PENDING','ACCEPTED','BILLED','CLOSED')
         GROUP BY o.shop_id, p.business_name, t.shop_name, s.business_name, p.phone, t.owner_phone, s.owner_phone
         HAVING daysSinceOrder >= 30
         ORDER BY daysSinceOrder DESC`,
        tenantIds
      );
      const inactive30 = inactiveRaw.filter(r => r.daysSinceOrder >= 30 && r.daysSinceOrder < 60);
      const inactive60 = inactiveRaw.filter(r => r.daysSinceOrder >= 60 && r.daysSinceOrder < 90);
      const inactive90 = inactiveRaw.filter(r => r.daysSinceOrder >= 90);

      // 4) CLV Segments — bucket by total spend
      const [clvRaw] = await masterPool.execute(
        `SELECT o.shop_id as customer_id,
                COALESCE(p.business_name, t.shop_name, s.business_name, o.shop_id) as name,
                COALESCE(SUM(o.total_amount), 0) as totalSpent,
                COUNT(o.order_id) as totalOrders
         FROM b2b_orders o
         LEFT JOIN profiles p ON p.entity_id = o.shop_id
         LEFT JOIN tenants t  ON t.db_name = o.shop_id
         LEFT JOIN suppliers s ON s.supplier_id = o.shop_id
         WHERE o.supplier_id IN (${idPlaceholders})
           AND o.status IN ('PENDING','ACCEPTED','BILLED','CLOSED')
         GROUP BY o.shop_id, p.business_name, t.shop_name, s.business_name`,
        tenantIds
      );
      const spends = clvRaw.map(r => parseFloat(r.totalSpent));
      const p33 = spends.sort((a,b)=>a-b)[Math.floor(spends.length*0.33)] || 0;
      const p66 = spends[Math.floor(spends.length*0.66)] || 0;
      const clvSegments = {
        high:   clvRaw.filter(r => parseFloat(r.totalSpent) > p66).sort((a,b)=>b.totalSpent-a.totalSpent),
        medium: clvRaw.filter(r => parseFloat(r.totalSpent) > p33 && parseFloat(r.totalSpent) <= p66).sort((a,b)=>b.totalSpent-a.totalSpent),
        low:    clvRaw.filter(r => parseFloat(r.totalSpent) <= p33).sort((a,b)=>b.totalSpent-a.totalSpent),
      };

      // 5) Monthly activity trend (new shops per month, last 12 months)
      const [monthlyActivity] = await masterPool.execute(
        `SELECT DATE_FORMAT(MIN(createdAt), '%Y-%m') as month,
                COUNT(DISTINCT shop_id) as newCustomers,
                COUNT(order_id) as orders,
                COALESCE(SUM(total_amount), 0) as revenue
         FROM b2b_orders
         WHERE supplier_id IN (${idPlaceholders})
           AND createdAt >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
         GROUP BY DATE_FORMAT(createdAt, '%Y-%m')
         ORDER BY month ASC`,
        tenantIds
      );

      // 6) Behavior stats
      const [[behaviorRow]] = await masterPool.execute(
        `SELECT AVG(perShop.orderCount) as avgFrequency,
                AVG(perShop.avgOrder) as avgOrderValue
         FROM (
           SELECT shop_id, COUNT(*) as orderCount, AVG(total_amount) as avgOrder
           FROM b2b_orders
           WHERE supplier_id IN (${idPlaceholders})
             AND status IN ('PENDING','ACCEPTED','BILLED','CLOSED')
           GROUP BY shop_id
         ) perShop`,
        tenantIds
      );

      return res.json({ success: true, data: {
        isSupplier: true, overview, topCustomers,
        inactiveCustomers: { buckets: { '30': inactive30, '60': inactive60, '90': inactive90 } },
        clvSegments, monthlyActivity,
        behavior: { avgFrequency: behaviorRow?.avgFrequency || 0, avgOrderValue: behaviorRow?.avgOrderValue || 0 },
      }});
    }

    // ─────────────────────────────────────────────────────────
    // RETAIL SHOP path
    // ─────────────────────────────────────────────────────────
    const [[totalRow]]   = await req.db.execute(`SELECT COUNT(*) as t, SUM(CASE WHEN isActive THEN 1 ELSE 0 END) as active, SUM(CASE WHEN NOT isActive THEN 1 ELSE 0 END) as inactive FROM customers`);
    const [[newTodayRow]] = await req.db.execute(`SELECT COUNT(*) as cnt FROM customers WHERE DATE(createdAt)=CURDATE()`);
    const [[newMonthRow]] = await req.db.execute(`SELECT COUNT(*) as cnt FROM customers WHERE MONTH(createdAt)=MONTH(NOW()) AND YEAR(createdAt)=YEAR(NOW())`);
    const [[newYearRow]]  = await req.db.execute(`SELECT COUNT(*) as cnt FROM customers WHERE YEAR(createdAt)=YEAR(NOW())`);
    const [[repeatRow]]   = await req.db.execute(`SELECT COUNT(*) as cnt FROM customers c WHERE (SELECT COUNT(*) FROM transactions WHERE customer_id=c.customer_id AND status='COMPLETED') > 1`);

    const totalCust  = totalRow.t || 0;
    const repeatCust = repeatRow.cnt || 0;
    const overview = {
      totalCustomers:    totalCust,
      newToday:          newTodayRow.cnt || 0,
      newThisMonth:      newMonthRow.cnt || 0,
      newThisYear:       newYearRow.cnt  || 0,
      activeCustomers:   totalRow.active   || 0,
      inactiveCustomers: totalRow.inactive || 0,
      repeatCustomers:   repeatCust,
      oneTimeCustomers:  totalCust - repeatCust,
    };

    const [topCustomers] = await req.db.execute(
      `SELECT c.customer_id, c.name, c.phone, c.totalSpent, c.loyaltyPoints, c.notes,
              COUNT(t.transaction_id) as totalOrders,
              MAX(t.createdAt) as lastPurchaseDate,
              AVG(t.totalAmount) as avgOrderValue
       FROM customers c
       LEFT JOIN transactions t ON t.customer_id = c.customer_id AND t.status = 'COMPLETED'
       WHERE c.isActive = TRUE AND c.totalSpent > 0
       GROUP BY c.customer_id, c.name, c.phone, c.totalSpent, c.loyaltyPoints, c.notes
       ORDER BY ${sortBy === 'orders' ? 'totalOrders' : 'c.totalSpent'} DESC
       LIMIT ${limitNum}`
    );

    const [inactiveRaw] = await req.db.execute(
      `SELECT c.customer_id, c.name, c.phone, c.totalSpent,
              MAX(t.createdAt) as lastPurchaseDate,
              COUNT(t.transaction_id) as totalOrders,
              DATEDIFF(NOW(), MAX(t.createdAt)) as daysSince
       FROM customers c
       LEFT JOIN transactions t ON t.customer_id = c.customer_id AND t.status='COMPLETED'
       WHERE c.isActive=TRUE
       GROUP BY c.customer_id, c.name, c.phone, c.totalSpent
       HAVING daysSince >= 30 OR lastPurchaseDate IS NULL
       ORDER BY daysSince DESC`
    );
    const inactive30 = inactiveRaw.filter(r => r.daysSince >= 30 && r.daysSince < 60);
    const inactive60 = inactiveRaw.filter(r => r.daysSince >= 60 && r.daysSince < 90);
    const inactive90 = inactiveRaw.filter(r => r.daysSince >= 90 || r.lastPurchaseDate === null);

    const [clvRaw] = await req.db.execute(
      `SELECT c.customer_id, c.name, c.totalSpent, COUNT(t.transaction_id) as totalOrders
       FROM customers c
       LEFT JOIN transactions t ON t.customer_id=c.customer_id AND t.status='COMPLETED'
       WHERE c.isActive=TRUE
       GROUP BY c.customer_id, c.name, c.totalSpent`
    );
    const spends = clvRaw.map(r => parseFloat(r.totalSpent || 0));
    const p33 = spends.sort((a,b)=>a-b)[Math.floor(spends.length*0.33)] || 0;
    const p66 = spends[Math.floor(spends.length*0.66)] || 0;
    const clvSegments = {
      high:   clvRaw.filter(r => parseFloat(r.totalSpent) > p66).sort((a,b)=>b.totalSpent-a.totalSpent),
      medium: clvRaw.filter(r => parseFloat(r.totalSpent) > p33 && parseFloat(r.totalSpent) <= p66),
      low:    clvRaw.filter(r => parseFloat(r.totalSpent) <= p33),
    };

    const [monthlyActivity] = await req.db.execute(
      `SELECT DATE_FORMAT(createdAt,'%Y-%m') as month,
              COUNT(*) as newCustomers
       FROM customers
       WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
       GROUP BY month ORDER BY month ASC`
    );
    const [monthlyOrders] = await req.db.execute(
      `SELECT DATE_FORMAT(createdAt,'%Y-%m') as month,
              COUNT(*) as orders, COALESCE(SUM(totalAmount),0) as revenue
       FROM transactions WHERE status='COMPLETED'
         AND createdAt >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
       GROUP BY month ORDER BY month ASC`
    );
    const activityMerged = monthlyActivity.map(m => {
      const ord = monthlyOrders.find(o => o.month === m.month) || {};
      return { month: m.month, newCustomers: m.newCustomers, orders: ord.orders||0, revenue: ord.revenue||0 };
    });

    const [[behaviorRow]] = await req.db.execute(
      `SELECT AVG(orderCount) as avgFrequency, AVG(avgAmt) as avgOrderValue FROM (
         SELECT customer_id, COUNT(*) as orderCount, AVG(totalAmount) as avgAmt
         FROM transactions WHERE status='COMPLETED' GROUP BY customer_id
       ) x`
    );

    res.json({ success: true, data: {
      isSupplier: false, overview, topCustomers,
      inactiveCustomers: { buckets: { '30': inactive30, '60': inactive60, '90': inactive90 } },
      clvSegments, monthlyActivity: activityMerged,
      behavior: { avgFrequency: behaviorRow?.avgFrequency || 0, avgOrderValue: behaviorRow?.avgOrderValue || 0 },
    }});
  } catch (error) { next(error); }
};

// ── Customer Drilldown ────────────────────────────────────────────────────────
const getCustomerDrilldown = async (req, res, next) => {
  try {
    const { customerId } = req.params;
    const isSupplier = req.user.userType === 'supplier';
    const dbName = req.dbName;

    if (isSupplier) {
      const tenantIds = await getTenantIds(dbName);
      const idPlaceholders = tenantIds.map(() => '?').join(',');
      const [[custRow]] = await masterPool.execute(
        `SELECT o.shop_id as customer_id,
                COALESCE(p.business_name, t.shop_name, o.shop_id) as name,
                COALESCE(p.phone, t.owner_phone) as phone,
                COALESCE(p.address) as address,
                COALESCE(p.email, t.owner_email) as email,
                COUNT(o.order_id) as totalOrders,
                COALESCE(SUM(o.total_amount),0) as totalSpent,
                MAX(o.createdAt) as lastPurchaseDate,
                MIN(o.createdAt) as firstPurchaseDate
         FROM b2b_orders o
         LEFT JOIN profiles p ON p.entity_id = o.shop_id
         LEFT JOIN tenants t  ON t.db_name = o.shop_id
         WHERE o.shop_id = ? AND o.supplier_id IN (${idPlaceholders})
         GROUP BY o.shop_id, p.business_name, t.shop_name, p.phone, t.owner_phone, p.address, p.email, t.owner_email`,
        [customerId, ...tenantIds]
      );
      const [orders] = await masterPool.execute(
        `SELECT o.order_id, o.order_number, o.status, o.total_amount, o.createdAt,
                JSON_ARRAYAGG(JSON_OBJECT('name', oi.name, 'qty', oi.qty, 'price', oi.price)) as items
         FROM b2b_orders o
         JOIN b2b_order_items oi ON oi.order_id = o.order_id
         WHERE o.shop_id = ? AND o.supplier_id IN (${idPlaceholders})
         GROUP BY o.order_id ORDER BY o.createdAt DESC LIMIT 50`,
        [customerId, ...tenantIds]
      );
      return res.json({ success: true, data: { customer: custRow, orders } });
    }

    const [[customer]] = await req.db.execute(
      `SELECT c.customer_id, c.name, c.phone, c.email, c.address, c.city, c.gstin, c.notes,
              c.loyaltyPoints, c.totalSpent, c.createdAt as firstPurchaseDate,
              COUNT(t.transaction_id) as totalOrders,
              MAX(t.createdAt) as lastPurchaseDate,
              AVG(t.totalAmount) as avgOrderValue
       FROM customers c
       LEFT JOIN transactions t ON t.customer_id=c.customer_id AND t.status='COMPLETED'
       WHERE c.customer_id=?
       GROUP BY c.customer_id`, [customerId]
    );
    const [transactions] = await req.db.execute(
      `SELECT t.transaction_id, t.invoiceNumber, t.totalAmount, t.paymentMethod, t.paymentStatus, t.status, t.createdAt,
              JSON_ARRAYAGG(JSON_OBJECT('name', ti.productName, 'qty', ti.quantity, 'price', ti.sellingPrice)) as items
       FROM transactions t
       JOIN transaction_items ti ON ti.transaction_id=t.transaction_id
       WHERE t.customer_id=?
       GROUP BY t.transaction_id ORDER BY t.createdAt DESC LIMIT 50`, [customerId]
    );
    res.json({ success: true, data: { customer, orders: transactions } });
  } catch (error) { next(error); }
};

// ── 6. Supplier Report ────────────────────────────────────────────────────────
const getSupplierReport = async (req, res, next) => {
  try {
    const dbName = req.dbName || "";
    const slug = dbName.replace("stocksense_tenant_", "").replace("stocksense_supplier_", "").replace("shop_", "").replace("supplier_", "");

    const [[shopMapping]] = await masterPool.execute(
      "SELECT tenant_id FROM tenants WHERE db_name = ? OR shop_slug = ?", [dbName, slug]
    );
    const shopUuid = shopMapping ? shopMapping.tenant_id : null;

    const localOrderParams = [];
    const localOrderCond = getCondition('COALESCE(receivedDate, createdAt)', req, localOrderParams);

    const [localSuppliers] = await req.db.execute(
      `SELECT s.supplier_id, s.name, s.phone, s.isActive, s.slug as networkSlug,
              (SELECT COUNT(*) FROM products WHERE supplier_id = s.supplier_id) as productCount,
              (SELECT COUNT(*) FROM purchase_orders WHERE supplier_id = s.supplier_id
               AND status != 'CANCELLED' AND ${localOrderCond}) as localOrders,
              (SELECT COALESCE(SUM(totalAmount), 0) FROM purchase_orders WHERE supplier_id = s.supplier_id
               AND status != 'CANCELLED' AND ${localOrderCond}) as localPurchased
       FROM suppliers s WHERE s.isActive = TRUE`,
      [...localOrderParams, ...localOrderParams]
    );

    let networkOrders = [];
    if (shopUuid || slug || dbName) {
      const b2bParams = [shopUuid, dbName, slug];
      const b2bCond = getCondition('o.createdAt', req, b2bParams);
      [networkOrders] = await masterPool.execute(
        `SELECT ms.db_name as supplierDbName, COUNT(*) as count, SUM(o.total_amount) as total
         FROM b2b_orders o JOIN suppliers ms ON ms.supplier_id = o.supplier_id
         WHERE (o.shop_id = ? OR o.shop_id = ? OR o.shop_id = ?)
         AND o.status IN ('PENDING', 'ORDERED', 'ACCEPTED', 'BILLED', 'CLOSED') AND ${b2bCond}
         GROUP BY ms.db_name`, b2bParams
      );
    }

    const combined = localSuppliers.map(s => {
      const nMatch = networkOrders.find(no => no.supplierDbName === s.supplier_id);
      return { ...s, totalOrders: parseInt(s.localOrders || 0) + (nMatch ? parseInt(nMatch.count) : 0),
               totalPurchased: parseFloat(s.localPurchased || 0) + (nMatch ? parseFloat(nMatch.total) : 0) };
    });
    res.json({ success: true, data: combined.sort((a,b) => b.totalPurchased - a.totalPurchased) });
  } catch (error) { next(error); }
};

// ── 7. Inventory Report ───────────────────────────────────────────────────────
const getInventoryReport = async (req, res, next) => {
  try {
    const [[totals]] = await req.db.execute(
      `SELECT COUNT(*) as totalProducts, COALESCE(SUM(stock * costPrice), 0) as totalCostValue,
              COALESCE(SUM(stock * sellingPrice), 0) as totalRetailValue,
              SUM(CASE WHEN stock <= minStockLevel AND stock > 0 THEN 1 ELSE 0 END) as lowStockCount,
              SUM(CASE WHEN stock = 0 THEN 1 ELSE 0 END) as outOfStockCount
       FROM products WHERE isActive = TRUE`
    );

    const [categoryWise] = await req.db.execute(
      `SELECT c.name as categoryName, c.color as categoryColor, COUNT(p.product_id) as productCount,
              SUM(p.stock) as totalStock, SUM(p.stock * p.costPrice) as stockValue
       FROM categories c LEFT JOIN products p ON p.category_id = c.category_id AND p.isActive = TRUE
       WHERE c.isActive = TRUE GROUP BY c.name, c.color ORDER BY stockValue DESC`
    );

    const [lowStockItems] = await req.db.execute(
      `SELECT p.name, p.sku, p.stock, p.minStockLevel, p.costPrice, s.name as supplierName
       FROM products p
       LEFT JOIN suppliers s ON s.supplier_id = p.supplier_id
       WHERE p.isActive = TRUE AND p.stock <= p.minStockLevel AND p.stock > 0
       ORDER BY p.stock ASC LIMIT 50`
    );

    const [outOfStockItems] = await req.db.execute(
      `SELECT p.name, p.sku, p.stock, p.minStockLevel, p.costPrice, s.name as supplierName
       FROM products p
       LEFT JOIN suppliers s ON s.supplier_id = p.supplier_id
       WHERE p.isActive = TRUE AND p.stock = 0
       ORDER BY p.name ASC LIMIT 50`
    );

    const [expiredItems] = await req.db.execute(
      `SELECT p.name, p.sku, p.expiryDate, p.costPrice, s.name as supplierName,
              DATEDIFF(NOW(), p.expiryDate) as daysExpired
       FROM products p
       LEFT JOIN suppliers s ON s.supplier_id = p.supplier_id
       WHERE p.isActive = TRUE AND p.expiryDate IS NOT NULL AND p.expiryDate < NOW()
       ORDER BY p.expiryDate ASC LIMIT 50`
    );

    const [fastMoving] = await req.db.execute(
      `SELECT p.name, p.sku, p.stock, p.costPrice, 
              SUM(ti.quantity) as soldQty, 
              SUM(ti.totalAmount) as revenue
       FROM transaction_items ti
       JOIN transactions t ON t.transaction_id = ti.transaction_id
       JOIN products p ON p.product_id = ti.product_id
       WHERE t.status = 'COMPLETED' AND t.createdAt >= DATE_SUB(NOW(), INTERVAL 30 DAY)
       GROUP BY p.product_id, p.name, p.sku, p.stock, p.costPrice
       ORDER BY soldQty DESC LIMIT 50`
    );

    res.json({ success: true, data: { totals, categoryWise, lowStockItems, outOfStockItems, expiredItems, fastMoving } });
  } catch (error) { next(error); }
};

// ── 8. Profit & Loss ──────────────────────────────────────────────────────────
const getProfitLoss = async (req, res, next) => {
  try {
    const salesParams = [];
    const salesCond = getCondition('t.createdAt', req, salesParams);
    const [[revData]] = await req.db.execute(
      `SELECT COALESCE(SUM(ti.totalAmount), 0) as revenue, COALESCE(SUM(ti.costPrice * ti.quantity), 0) as cogs
       FROM transaction_items ti JOIN transactions t ON t.transaction_id = ti.transaction_id
       WHERE ${salesCond} AND t.status = 'COMPLETED'`, salesParams
    );
    const revenue = parseFloat(revData.revenue); const cogs = parseFloat(revData.cogs);
    res.json({ success: true, data: { revenue, cogs, grossProfit: revenue - cogs, netProfit: revenue - cogs } });
  } catch (error) { next(error); }
};

// ── 9. Supplier Order History ─────────────────────────────────────────────────
const getSupplierOrderHistory = async (req, res, next) => {
  try {
    const { supplierId } = req.params;
    const dbName = req.dbName || "";
    const slug = dbName.replace("stocksense_tenant_", "").replace("stocksense_supplier_", "").replace("shop_", "").replace("supplier_", "");

    const [[shopMapping]] = await masterPool.execute(
      "SELECT tenant_id FROM tenants WHERE db_name = ? OR shop_slug = ?", [dbName, slug]
    );
    const shopUuid = shopMapping ? shopMapping.tenant_id : null;

    const [localOrders] = await req.db.execute(
      `SELECT po_id as id, poNumber as orderNumber, totalAmount, status, createdAt as date, 'LOCAL' as source
       FROM purchase_orders WHERE supplier_id = ? ORDER BY createdAt DESC`, [supplierId]
    );

    let networkOrders = [];
    if (shopUuid || slug || dbName) {
      const b2bParams = [shopUuid, dbName, slug, supplierId];
      [networkOrders] = await masterPool.execute(
        `SELECT o.order_id as id, o.order_number as orderNumber, o.total_amount as totalAmount,
                o.status, o.createdAt as date, 'B2B' as source
         FROM b2b_orders o JOIN suppliers ms ON ms.supplier_id = o.supplier_id
         WHERE (o.shop_id = ? OR o.shop_id = ? OR o.shop_id = ?) AND ms.db_name = ?
         ORDER BY o.createdAt DESC`, b2bParams
      );
    }
    res.json({ success: true, data: [...localOrders, ...networkOrders].sort((a,b) => new Date(b.date) - new Date(a.date)) });
  } catch (error) { next(error); }
};

export {
  getSalesReport, getDetailedSalesReport, getCategoryAnalytics, getReturnsAnalysis,
  getCustomerReport, getCustomerDrilldown, getSupplierReport, getInventoryReport, getProfitLoss, getSupplierOrderHistory,
};