import { masterPool } from "../../config/masterDatabase.js";
import { AppError } from "../../middleware/errorHandler.js";

// ==========================================================
// SUPPLIER CATALOG
// ==========================================================

export const getSupplierCatalog = async (req, res, next) => {
  try {
    const { supplier_id } = req.params; // this is the supplier's db_name
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

export const getB2BProducts = async (req, res, next) => {
  try {
    const myId = req.dbName;
    const { page = 1, limit = 40, search = '' } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    // 1. Find all connected suppliers
    const [connections] = await masterPool.execute(
      "SELECT supplier_id FROM shop_supplier_map WHERE shop_id = ? AND status = 'ACCEPTED'",
      [myId]
    );

    if (connections.length === 0) {
      return res.json({ success: true, data: [], pagination: { total: 0, page: Number(page), limit: Number(limit) } });
    }

    const supplierIds = connections.map(c => c.supplier_id);
    const placeholders = supplierIds.map(() => '?').join(',');

    // 2. Fetch products from those suppliers
    const searchQuery = search ? `AND (name LIKE ? OR sku LIKE ?)` : '';
    const params = [...supplierIds];
    if (search) params.push(`%${search}%`, `%${search}%`);

    const [rows] = await masterPool.execute(
      `SELECT * FROM supplier_products 
       WHERE supplier_id IN (${placeholders}) AND is_active = TRUE ${searchQuery}
       ORDER BY updated_at DESC LIMIT ${Number(limit)} OFFSET ${offset}`,
      params
    );

    const [[{ total }]] = await masterPool.execute(
      `SELECT COUNT(*) as total FROM supplier_products 
       WHERE supplier_id IN (${placeholders}) AND is_active = TRUE ${searchQuery}`,
      params
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
    const myId = req.dbName; // always use dbName as the universal entity ID

    const { status } = req.query; // PENDING, ACCEPTED, REJECTED
    const statusFilter = status ? `AND m.status = ?` : '';
    const params = [myId];
    if (status) params.push(status);

    let query = "";
    if (userType === 'shop') {
      // Connect to suppliers. Get supplier profiles.
      query = `
        SELECT m.map_id, m.status, m.initiated_by, m.createdAt,
               p.profile_id, p.entity_id as partner_id, p.business_name, p.logo, p.city, p.email, p.phone
        FROM shop_supplier_map m
        JOIN profiles p ON p.entity_id = m.supplier_id AND p.entity_type = 'supplier'
        WHERE m.shop_id = ? ${statusFilter}
        ORDER BY m.createdAt DESC
      `;
    } else {
      // Connect to shops. Get shop profiles.
      query = `
        SELECT m.map_id, m.status, m.initiated_by, m.createdAt,
               p.profile_id, p.entity_id as partner_id, p.business_name, p.logo, p.city, p.email, p.phone
        FROM shop_supplier_map m
        JOIN profiles p ON p.entity_id = m.shop_id AND p.entity_type = 'shop'
        WHERE m.supplier_id = ? ${statusFilter}
        ORDER BY m.createdAt DESC
      `;
    }

    const [rows] = await masterPool.execute(query, params);
    
    // Quick format for frontend compatibility (name vs business_name)
    const formatted = rows.map(r => ({
      ...r,
      name: r.business_name,
      contactPerson: 'Owner',
      isActive: r.status === 'ACCEPTED'
    }));

    res.json({ success: true, data: formatted });
  } catch (error) { next(error); }
};

export const sendConnectionRequest = async (req, res, next) => {
  try {
    const { partner_id } = req.body; // the ID (db_name) of the entity to connect with
    if (!partner_id) return next(new AppError("partner_id is required", 400));

    const userType = req.user.userType || 'shop';
    const myId = req.dbName;

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

    // 1. Update the map
    await masterPool.execute(
      `UPDATE shop_supplier_map SET status = ? WHERE map_id = ?`,
      [status, map_id]
    );

    // 2. If ACCEPTED, Auto-Sync CRM data across both Tenant Databases!
    if (status === 'ACCEPTED') {
      const [map] = await masterPool.execute("SELECT shop_id, supplier_id FROM shop_supplier_map WHERE map_id=?", [map_id]);
      if (map.length > 0) {
        const { shop_id: shopDb, supplier_id: supplierDb } = map[0];

        // Fetch profiles
        const [shopProfile] = await masterPool.execute("SELECT business_name, email, phone, city, address FROM profiles WHERE entity_id=?", [shopDb]);
        const [supProfile]  = await masterPool.execute("SELECT business_name, email, phone, city, address FROM profiles WHERE entity_id=?", [supplierDb]);
        
        // Insert Shop into Supplier's Customers Table
        if (shopProfile.length > 0) {
          const sp = shopProfile[0];
          await masterPool.execute(
            `INSERT IGNORE INTO \`${supplierDb}\`.customers (customer_id, name, email, phone, address, city, shop_tenant_id) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`, 
            [shopDb, sp.business_name, sp.email || null, sp.phone || '0000000000', sp.address || null, sp.city || null, shopDb]
          );
        }

        // Insert Supplier into Shop's Suppliers Table
        if (supProfile.length > 0) {
          const s = supProfile[0];
          await masterPool.execute(
            `INSERT IGNORE INTO \`${shopDb}\`.suppliers (supplier_id, name, email, phone, address, city) 
             VALUES (?, ?, ?, ?, ?, ?)`, 
            [supplierDb, s.business_name, s.email || null, s.phone || '0000000000', s.address || null, s.city || null]
          );
        }
      }
    }

    res.json({ success: true, message: `Connection ${status.toLowerCase()}.` });
  } catch (error) { next(error); }
};
