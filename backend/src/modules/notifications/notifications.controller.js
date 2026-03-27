import { AppError } from '../../middleware/errorHandler.js';

// GET /api/notifications
// Pulls real-time low-stock alerts + newly joined team members
export const getNotifications = async (req, res, next) => {
  try {
    const db = req.db;
    const notifications = [];

    // ── 1. Low / Out-of-Stock alerts ────────────────────────
    const [stockRows] = await db.execute(`
      SELECT name, sku, stock, minStockLevel
      FROM   products
      WHERE  stock <= minStockLevel AND isActive = 1
      ORDER  BY stock ASC
      LIMIT  20
    `);

    for (const p of stockRows) {
      const isOut = p.stock === 0;
      notifications.push({
        id:      `stock-${p.sku}`,
        type:    isOut ? 'out_of_stock' : 'low_stock',
        title:   isOut ? '🚨 Out of Stock' : '⚠️ Low Stock',
        message: isOut
          ? `${p.name} is completely out of stock!`
          : `${p.name} is low — only ${p.stock} unit${p.stock !== 1 ? 's' : ''} left (min: ${p.minStockLevel})`,
        time:    null,
        read:    false,
      });
    }

    // ── 2. Newly joined team members ─────────────────────────
    const [memberRows] = await db.execute(`
      SELECT name, role, approvedAt
      FROM   users
      WHERE  status = 'APPROVED'
        AND  emailVerified = 1
        AND  role != 'OWNER'
      ORDER  BY approvedAt DESC
      LIMIT  10
    `);

    for (const m of memberRows) {
      notifications.push({
        id:      `member-${m.name}-${m.approvedAt}`,
        type:    'member_joined',
        title:   '👤 Team Member Joined',
        message: `${m.name} (${m.role}) has verified their email and joined your team.`,
        time:    m.approvedAt,
        read:    false,
      });
    }

    // Sort: stock alerts first (no timestamp), then by time desc
    notifications.sort((a, b) => {
      if (!a.time && !b.time) return 0;
      if (!a.time) return -1;
      if (!b.time) return 1;
      return new Date(b.time) - new Date(a.time);
    });

    res.json({ success: true, data: notifications });
  } catch (error) {
    next(error);
  }
};
