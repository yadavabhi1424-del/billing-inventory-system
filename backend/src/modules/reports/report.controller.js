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
    const { limit = 5, sortBy = 'spent' } = req.query;
    const limitNum = Math.max(1, Math.min(200, parseInt(limit) || 5));

    const tenantIds = await getTenantIds(dbName);

    let summary = { totalCustomers: 0, newCustomers: 0 };
    let topCustomers = [];

    if (isSupplier && tenantIds.length > 0) {
      const b2bP = [];
      const b2bCond = getCondition('createdAt', req, b2bP);
      const idPlaceholders = tenantIds.map(() => '?').join(',');

      // Summary
      const [[realB2bSum]] = await masterPool.execute(
        `SELECT COUNT(DISTINCT shop_id) as totalB2BShops,
                COUNT(DISTINCT CASE WHEN ${b2bCond} THEN shop_id END) as newB2BShops
         FROM b2b_orders WHERE supplier_id IN (${idPlaceholders})`,
        [...b2bP, ...tenantIds]
      );

      const localSumP = [];
      const localCond = getCondition('createdAt', req, localSumP);
      const [[localSum]] = await req.db.execute(
        `SELECT COUNT(*) as totalLocal, SUM(CASE WHEN ${localCond} THEN 1 ELSE 0 END) as newLocal
         FROM customers WHERE isActive = TRUE AND shop_tenant_id IS NULL`, localSumP
      );

      summary = {
        totalCustomers: (realB2bSum.totalB2BShops || 0) + (localSum.totalLocal || 0),
        newCustomers:   (realB2bSum.newB2BShops   || 0) + (localSum.newLocal   || 0)
      };

      // Top Customers
      const b2bListP = [];
      const b2bListCond = getCondition('o.createdAt', req, b2bListP);
      const [b2bShops] = await masterPool.execute(
        `SELECT o.shop_id as customer_id, p.business_name as name, p.business_phone as phone, 
                COALESCE(SUM(o.total_amount), 0) as totalSpent, COUNT(o.order_id) as totalOrders,
                o.shop_id as shopId
         FROM b2b_orders o
         JOIN profiles p ON p.entity_id = o.shop_id
         WHERE ${b2bListCond} AND o.supplier_id IN (${idPlaceholders}) 
         AND o.status IN ('ORDERED', 'ACCEPTED', 'BILLED', 'CLOSED')
         GROUP BY o.shop_id, p.business_name, p.business_phone`,
        [...b2bListP, ...tenantIds]
      );

      const [localRetail] = await req.db.execute(
        `SELECT customer_id, name, phone, totalSpent,
                (SELECT COUNT(*) FROM transactions WHERE customer_id = c.customer_id) as totalOrders
         FROM customers c
         WHERE isActive = TRUE AND shop_tenant_id IS NULL AND totalSpent > 0`
      );

      topCustomers = [...b2bShops, ...localRetail]
        .sort((a,b) => sortBy === 'orders' ? b.totalOrders - a.totalOrders : b.totalSpent - a.totalSpent)
        .slice(0, limitNum);

    } else {
      const localSumP = [];
      const localCond = getCondition('createdAt', req, localSumP);
      const [[localSum]] = await req.db.execute(
        `SELECT COUNT(*) as totalCustomers, SUM(CASE WHEN ${localCond} THEN 1 ELSE 0 END) as newCustomers
         FROM customers WHERE isActive = TRUE`, localSumP
      );
      summary = localSum;
      const [localDist] = await req.db.execute(
        `SELECT customer_id, name, phone, totalSpent,
                (SELECT COUNT(*) FROM transactions WHERE customer_id = c.customer_id) as totalOrders
         FROM customers c WHERE isActive = TRUE AND totalSpent > 0
         ORDER BY ${sortBy === 'orders' ? 'totalOrders' : 'totalSpent'} DESC LIMIT ${limitNum}`
      );
      topCustomers = localDist;
    }

    res.json({ success: true, data: { summary, topCustomers } });
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
    res.json({ success: true, data: { totals, categoryWise } });
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
  getCustomerReport, getSupplierReport, getInventoryReport, getProfitLoss, getSupplierOrderHistory,
};