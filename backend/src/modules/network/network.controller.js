import { masterPool } from "../../config/masterDatabase.js";
import { AppError } from "../../middleware/errorHandler.js";

// Utility to get the current tenant id from the master DB via eq.dbName
async function getMyEntityId(dbName, userType) {
  if (userType === 'supplier') {
    const [rows] = await masterPool.execute("SELECT supplier_id FROM suppliers WHERE db_name = ?", [dbName]);
    return rows.length ? rows[0].supplier_id : null;
  } else {
    const [rows] = await masterPool.execute("SELECT tenant_id FROM tenants WHERE db_name = ?", [dbName]);
    return rows.length ? rows[0].tenant_id : null;
  }
}

// ==========================================================
// SUPPLIER CATALOG
// ==========================================================

export const getSupplierCatalog = async (req, res, next) => {
  try {
    const { supplier_id } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const [rows] = await masterPool.execute(
      `SELECT * FROM supplier_products 
       WHERE supplier_id = ? AND is_active = TRUE 
       ORDER BY name ASC LIMIT ${Number(limit)} OFFSET ${offset}`,
      [supplier_id]
    );

    const [[{ total }]] = await masterPool.execute(
      `SELECT COUNT(*) as total FROM supplier_products WHERE supplier_id = ? AND is_active = TRUE`,
      [supplier_id]
    );

    res.json({
      success: true,
      data: rows,
      pagination: { total, page: Number(page), limit: Number(limit) }
    });
  } catch (error) { next(error); }
};

// ==========================================================
// RELATIONSHIPS (CONNECTIONS)
// ==========================================================

export const getConnections = async (req, res, next) => {
  try {
    const userType = req.user.userType || 'shop';
    const myId = await getMyEntityId(req.dbName, userType);
    if (!myId) return next(new AppError("Entity not found", 404));

    const { status } = req.query; // PENDING, ACCEPTED, REJECTED
    const statusFilter = status ? `AND m.status = ?` : '';
    const params = [myId];
    if (status) params.push(status);

    let query = "";
    if (userType === 'shop') {
      // Connect to suppliers. Get supplier profiles.
      query = `
        SELECT m.map_id, m.status, m.initiated_by, m.createdAt,
               p.profile_id, p.entity_id as partner_id, p.business_name, p.logo, p.city
        FROM shop_supplier_map m
        JOIN profiles p ON p.entity_id = m.supplier_id AND p.entity_type = 'supplier'
        WHERE m.shop_id = ? ${statusFilter}
        ORDER BY m.createdAt DESC
      `;
    } else {
      // Connect to shops. Get shop profiles.
      query = `
        SELECT m.map_id, m.status, m.initiated_by, m.createdAt,
               p.profile_id, p.entity_id as partner_id, p.business_name, p.logo, p.city
        FROM shop_supplier_map m
        JOIN profiles p ON p.entity_id = m.shop_id AND p.entity_type = 'shop'
        WHERE m.supplier_id = ? ${statusFilter}
        ORDER BY m.createdAt DESC
      `;
    }

    const [rows] = await masterPool.execute(query, params);
    res.json({ success: true, data: rows });
  } catch (error) { next(error); }
};

export const sendConnectionRequest = async (req, res, next) => {
  try {
    const { partner_id } = req.body; // the ID of the entity to connect with
    if (!partner_id) return next(new AppError("partner_id is required", 400));

    const userType = req.user.userType || 'shop';
    const myId = await getMyEntityId(req.dbName, userType);
    if (!myId) return next(new AppError("Entity not found", 404));

    const shop_id = userType === 'shop' ? myId : partner_id;
    const supplier_id = userType === 'supplier' ? myId : partner_id;
    const { v4: uuidv4 } = await import('uuid');

    await masterPool.execute(
      `INSERT INTO shop_supplier_map (map_id, shop_id, supplier_id, status, initiated_by)
       VALUES (?, ?, ?, 'PENDING', ?)
       ON DUPLICATE KEY UPDATE status = IF(status='REJECTED', 'PENDING', status)`,
      [uuidv4(), shop_id, supplier_id, userType]
    );

    res.json({ success: true, message: "Connection request sent." });
  } catch (error) { next(error); }
};

export const updateConnectionStatus = async (req, res, next) => {
  try {
    const { map_id } = req.params;
    const { status } = req.body; // ACCEPTED or REJECTED
    if (!['ACCEPTED', 'REJECTED'].includes(status)) {
      return next(new AppError("Invalid status", 400));
    }

    await masterPool.execute(
      `UPDATE shop_supplier_map SET status = ? WHERE map_id = ?`,
      [status, map_id]
    );

    res.json({ success: true, message: `Connection ${status.toLowerCase()}.` });
  } catch (error) { next(error); }
};
