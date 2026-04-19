import { AppError } from '../../middleware/errorHandler.js';
import { masterPool } from '../../config/masterDatabase.js';

// GET /api/notifications
// Aggregates all notification types: stock alerts, members, B2B orders, POs, inventory movements
export const getNotifications = async (req, res, next) => {
  try {
    const db          = req.db;
    const userType    = req.user?.userType;
    const notifications = [];

    // ── 1. Low / Out-of-Stock alerts ────────────────────────
    const [stockRows] = await db.execute(`
      SELECT name, sku, stock, minStockLevel
      FROM   products
      WHERE  stock <= minStockLevel AND isActive = 1
      ORDER  BY stock ASC
    `);

    for (const p of stockRows) {
      const isOut = p.stock === 0;
      notifications.push({
        id:      `stock-${p.sku}`,
        type:    isOut ? 'out_of_stock' : 'low_stock',
        title:   isOut ? 'Out of Stock' : 'Low Stock',
        message: isOut
          ? `${p.name} is completely out of stock!`
          : `${p.name} is low — only ${p.stock} unit${p.stock !== 1 ? 's' : ''} left (min: ${p.minStockLevel})`,
        time:    new Date().toISOString(),  // treat as "now" so sortable
        icon:    isOut ? '🚨' : '⚠️',
        link:    '/inventory',
        meta:    {},
      });
    }

    // ── 2. Newly joined team members ─────────────────────────
    const [memberRows] = await db.execute(`
      SELECT name, role, approvedAt, createdAt
      FROM   users
      WHERE  status = 'APPROVED'
        AND  emailVerified = 1
        AND  role != 'OWNER'
      ORDER  BY COALESCE(approvedAt, createdAt) DESC
    `);

    for (const m of memberRows) {
      // Use approvedAt if set, otherwise fall back to createdAt (never fake 'now')
      const ts = m.approvedAt || m.createdAt;
      notifications.push({
        id:      `member-${m.name}-${ts}`,
        type:    'member_joined',
        title:   'Team Member Joined',
        message: `${m.name} (${m.role}) joined your team.`,
        time:    ts ? new Date(ts).toISOString() : null,
        icon:    '👤',
        link:    '/users',
        meta:    {},
      });
    }

    // ── 3. B2B Orders received (supplier POV) OR placed (shop POV) ──────────
    try {
      // Resolve my supplier_id from master pool
      const [selfRows] = await masterPool.execute(
        'SELECT supplier_id FROM suppliers WHERE db_name = ?', [req.dbName]
      );

      if (selfRows.length > 0) {
        const myId = selfRows[0].supplier_id;

        if (userType === 'supplier') {
          // Supplier: orders received from shops
          const [b2bRows] = await masterPool.execute(`
            SELECT o.order_id, o.createdAt, o.total_amount, o.status,
                   p.business_name as shop_name
            FROM   b2b_orders o
            LEFT JOIN profiles p ON p.entity_id = o.shop_id
            WHERE  o.supplier_id = ?
            ORDER  BY o.createdAt DESC
          `, [myId]);

          for (const o of b2bRows) {
            notifications.push({
              id:      `b2b-recv-${o.order_id}`,
              type:    'b2b_received',
              title:   'B2B Order Received',
              message: `New order from ${o.shop_name || 'a shop'} — ₹${Number(o.total_amount).toLocaleString('en-IN')} (${o.status})`,
              time:    o.createdAt ? new Date(o.createdAt).toISOString() : new Date().toISOString(),
              icon:    '📦',
              link:    `/billing?tab=orders&orderId=${o.order_id}`,
              meta:    { orderId: o.order_id, amount: o.total_amount, status: o.status },
            });
          }

          // Supplier: completed / status-changed orders
          const [b2bUpdated] = await masterPool.execute(`
            SELECT o.order_id, o.createdAt, o.status, p.business_name as shop_name
            FROM   b2b_orders o
            LEFT JOIN profiles p ON p.entity_id = o.shop_id
            WHERE  o.supplier_id = ? AND o.status IN ('CLOSED','RETURN_REQUESTED')
            ORDER  BY o.createdAt DESC
          `, [myId]);

          for (const o of b2bUpdated) {
            if (o.status === 'RETURN_REQUESTED') {
              notifications.push({
                id:      `b2b-return-${o.order_id}`,
                type:    'b2b_return',
                title:   'Return Requested',
                message: `${o.shop_name || 'A shop'} requested a return on their order.`,
                time:    o.createdAt ? new Date(o.createdAt).toISOString() : null,
                icon:    '↩️',
                link:    `/billing?tab=orders&orderId=${o.order_id}`,
                meta:    { orderId: o.order_id },
              });
            }
          }
        } else {
          // Shop: orders they've placed
          const [b2bRows] = await masterPool.execute(`
            SELECT o.order_id, o.createdAt, o.total_amount, o.status,
                   p.business_name as supplier_name
            FROM   b2b_orders o
            LEFT JOIN profiles p ON p.entity_id = o.supplier_id
            WHERE  o.shop_id = ?
            ORDER  BY o.createdAt DESC
          `, [myId]);

          for (const o of b2bRows) {
            const statusLabel = {
              PENDING: 'Pending approval',
              ACCEPTED: 'Accepted by supplier',
              BILLED: 'Invoice raised',
              CLOSED: 'Delivered & closed',
              REJECTED: 'Rejected by supplier',
            }[o.status] || o.status;

            notifications.push({
              id:      `b2b-delv-${o.order_id}`,
              type:    'b2b_delivered',
              title:   'Purchase Order Update',
              message: `Order to ${o.supplier_name || 'supplier'} — ${statusLabel}`,
              time:    o.createdAt ? new Date(o.createdAt).toISOString() : new Date().toISOString(),
              icon:    o.status === 'CLOSED' ? '✅' : o.status === 'REJECTED' ? '❌' : '🔄',
              link:    `/manufacturers?tab=orders&orderId=${o.order_id}`,
              meta:    { orderId: o.order_id, amount: o.total_amount, status: o.status },
            });
          }
        }
      }
    } catch (e) {
      console.warn('[Notifications] B2B fetch failed:', e.message);
    }

    // ── 4. Purchase Orders (local PO system) ──────────────────
    try {
      const [poRows] = await db.execute(`
        SELECT po.po_id, po.poNumber, po.status, po.totalAmount,
               po.createdAt, po.receivedDate,
               s.name as supplierName
        FROM   purchase_orders po
        LEFT JOIN suppliers s ON s.supplier_id = po.supplier_id
        ORDER  BY po.createdAt DESC
      `);

      for (const po of poRows) {
        const isReceived = po.status === 'RECEIVED' || po.status === 'PARTIAL';
        const ts = isReceived && po.receivedDate ? po.receivedDate : po.createdAt;

        if (isReceived) {
          notifications.push({
            id:      `po-recv-${po.po_id}`,
            type:    'po_received',
            title:   'Purchase Order Received',
            message: `${po.poNumber} from ${po.supplierName || 'supplier'} received — ₹${Number(po.totalAmount).toLocaleString('en-IN')}`,
            time:    ts ? new Date(ts).toISOString() : null,
            icon:    '✅',
            link:    `/inventory`,
            meta:    { poId: po.po_id, poNumber: po.poNumber },
          });
        } else {
          // PENDING, ORDERED, CANCELLED — still show as a notification
          const iconMap  = { PENDING: '📋', ORDERED: '🚚', CANCELLED: '❌' };
          const titleMap = { PENDING: 'Purchase Order Placed', ORDERED: 'Purchase Order Ordered', CANCELLED: 'Purchase Order Cancelled' };
          notifications.push({
            id:      `po-placed-${po.po_id}`,
            type:    'po_placed',
            title:   titleMap[po.status] || 'Purchase Order',
            message: `${po.poNumber} → ${po.supplierName || 'supplier'} — ₹${Number(po.totalAmount).toLocaleString('en-IN')} (${po.status})`,
            time:    ts ? new Date(ts).toISOString() : null,
            icon:    iconMap[po.status] || '📋',
            link:    `/inventory`,
            meta:    { poId: po.po_id, poNumber: po.poNumber },
          });
        }
      }
    } catch (e) {
      console.warn('[Notifications] PO fetch failed:', e.message);
    }

    // ── 5. Stock / Inventory movements ────────────────────────
    try {
      const [moveRows] = await db.execute(`
        SELECT sm.movement_id, sm.type, sm.quantity, sm.reason, sm.reference,
               sm.balanceBefore, sm.balanceAfter, sm.createdAt,
               p.name as productName, p.sku, p.product_id
        FROM   stock_movements sm
        LEFT JOIN products p ON p.product_id = sm.product_id
        ORDER  BY sm.createdAt DESC
      `);

      for (const m of moveRows) {
        const delta = m.balanceAfter - m.balanceBefore;
        let title, icon, type;

        if (m.type === 'PURCHASE') {
          type  = 'inventory_received';
          title = 'Stock Received';
          icon  = '📥';
        } else if (m.type === 'ADJUSTMENT') {
          type  = 'inventory_adjusted';
          title = 'Stock Adjusted';
          icon  = '⚖️';
        } else if (m.type === 'SALE') {
          type  = 'inventory_sold';
          title = 'Stock Sold';
          icon  = '🛒';
        } else {
          type  = 'inventory_moved';
          title = 'Stock Movement';
          icon  = '📦';
        }

        notifications.push({
          id:      `move-${m.movement_id}`,
          type,
          title,
          message: `${m.productName} (${m.sku}) — ${delta >= 0 ? '+' : ''}${delta} units. ${m.reason || ''}. Balance: ${m.balanceBefore} → ${m.balanceAfter}`,
          time:    m.createdAt ? new Date(m.createdAt).toISOString() : new Date().toISOString(),
          icon,
          link:    `/inventory`,
          meta:    { productId: m.product_id, productName: m.productName, qty: m.quantity, type: m.type },
        });
      }
    } catch (e) {
      console.warn('[Notifications] Stock movements fetch failed:', e.message);
    }

    // ── Sort by time DESC (latest first) then return ──────────
    notifications.sort((a, b) => {
      if (!a.time && !b.time) return 0;
      if (!a.time) return 1;
      if (!b.time) return -1;
      return new Date(b.time) - new Date(a.time);
    });

    res.json({ success: true, data: notifications });
  } catch (error) {
    next(error);
  }
};
