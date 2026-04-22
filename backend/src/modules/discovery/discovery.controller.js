import { masterPool } from "../../config/masterDatabase.js";

// GET /api/discovery  — lists all public shops + suppliers from master DB
export const getDiscovery = async (req, res, next) => {
  try {
    const {
      type, city, state, business_type,
      search, page = 1, limit = 24,
      lat, lng, radius = 50,
      match_my_category // Boolean/String
    } = req.query;

    const offset = (Number(page) - 1) * Number(limit);
    const myId = req.dbName;
    const userType = req.user.userType || 'shop';
    const searchType = userType === 'shop' ? 'supplier' : 'shop';

    let conditions = ["p.is_public = TRUE", "p.entity_id != ?", "p.entity_type = ?"];
    let params = [myId, searchType];

    if (city) { conditions.push("p.city LIKE ?"); params.push(`%${city}%`); }
    if (state) { conditions.push("p.state LIKE ?"); params.push(`%${state}%`); }

    // Primary Filter logic: Get the business_type to filter by
    let selectedType = (business_type && business_type !== 'All') ? business_type : null;

    // If the user wants to match their own category
    if (match_my_category === 'true' && req.user) {
      if (!req.user.business_type && req.db) {
        const [profileRows] = await req.db.execute("SELECT shop_type as type FROM shop_profile LIMIT 1");
        if (profileRows.length > 0) req.user.business_type = profileRows[0].type;
      }
      if (req.user.business_type) selectedType = req.user.business_type;
    }

    if (selectedType) {
      conditions.push("p.business_type = ?");
      params.push(selectedType);
    }

    let searchJoin = "";
    if (search) {
      searchJoin = `LEFT JOIN supplier_products sp ON sp.supplier_id = p.entity_id AND p.entity_type = 'supplier'`;
      conditions.push("(p.business_name LIKE ? OR p.business_type LIKE ? OR sp.name LIKE ?)");
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    let distanceSelect = "";
    let distanceHaving = "";
    if (lat && lng) {
      distanceSelect = `, (ST_Distance_Sphere(POINT(?, ?), POINT(p.longitude, p.latitude)) / 1000) AS distance`;
      params.unshift(Number(lng), Number(lat));
      distanceHaving = `HAVING distance <= ${Number(radius)} OR distance IS NULL`;
    }

    const where = conditions.join(" AND ");

    let [rows] = await masterPool.execute(
      `SELECT DISTINCT p.profile_id, p.entity_id, p.entity_type,
              p.business_name, COALESCE(p.owner_name, t.owner_name) as owner_name, p.slug, p.description,
              p.logo, p.city, p.state, p.pincode,
              p.address, COALESCE(p.email, t.owner_email) as email, COALESCE(p.phone, t.owner_phone) as phone,
              p.latitude, p.longitude,
              p.business_type, p.createdAt,
              m.status as connectionStatus
              ${distanceSelect}
       FROM profiles p
       ${searchJoin}
       LEFT JOIN tenants t ON t.db_name = p.entity_id
       LEFT JOIN shop_supplier_map m ON 
         ( ? = 'shop' AND m.shop_id = ? AND m.supplier_id = p.entity_id ) OR
         ( ? = 'supplier' AND m.supplier_id = ? AND m.shop_id = p.entity_id )
       WHERE ${where}
       ${distanceHaving}
       ORDER BY ${distanceSelect ? 'distance IS NULL, distance ASC' : 'p.createdAt DESC'}
       LIMIT ${Number(limit)} OFFSET ${offset}`,
      [userType, myId, userType, myId, ...params]
    );

    let total = 0;
    let fallback = false;

    // Fallback logic: If NO EXACT MATCHES, show general results of the SAME type
    if (rows.length === 0 && (selectedType || search)) {
      fallback = true;
      let fbCond = ["p.is_public = TRUE", "p.entity_id != ?", "p.entity_type = ?"];
      let fbParams = [myId, searchType];

      const [fbRows] = await masterPool.execute(
        `SELECT DISTINCT p.profile_id, p.entity_id, p.entity_type,
                  p.business_name, COALESCE(p.owner_name, t.owner_name) as owner_name, p.slug, p.description,
                  p.logo, p.city, p.state, p.pincode,
                  p.address, COALESCE(p.email, t.owner_email) as email, COALESCE(p.phone, t.owner_phone) as phone,
                  p.latitude, p.longitude,
                  p.business_type, p.createdAt,
                  m.status as connectionStatus
           FROM profiles p
           LEFT JOIN tenants t ON t.db_name = p.entity_id
           LEFT JOIN shop_supplier_map m ON 
             ( ? = 'shop' AND m.shop_id = ? AND m.supplier_id = p.entity_id ) OR
             ( ? = 'supplier' AND m.supplier_id = ? AND m.shop_id = p.entity_id )
           WHERE ${fbCond.join(" AND ")}
           ORDER BY RAND()
           LIMIT ${Number(limit)}`,
        [userType, myId, userType, myId, ...fbParams]
      );
      rows = fbRows;
      total = rows.length;
    } else {
      const countWhere = conditions.join(" AND ");
      const [countRows] = await masterPool.execute(
        `SELECT COUNT(DISTINCT p.profile_id) as total FROM profiles p ${searchJoin} WHERE ${countWhere}`,
        distanceHaving ? params.slice(2) : params
      );
      total = countRows[0].total;
    }

    res.json({
      success: true,
      data: rows,
      fallback,
      pagination: {
        total, page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) { next(error); }
};

// GET /api/discovery/:slug — public profile detail
export const getProfileBySlug = async (req, res, next) => {
  try {
    const [rows] = await masterPool.execute(
      `SELECT * FROM profiles WHERE slug = ? AND is_public = TRUE`, [req.params.slug]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: "Profile not found." });
    res.json({ success: true, data: rows[0] });
  } catch (error) { next(error); }
};

// POST /api/discovery/profile — upsert caller's public profile (auth required)
export const upsertProfile = async (req, res, next) => {
  try {
    const { v4: uuidv4 } = await import("uuid");
    const {
      business_name, description, logo,
      city, state, pincode, business_type, is_public = true,
      latitude, longitude, address, email, phone
    } = req.body;

    const userType = req.user.userType || 'shop';
    let entityId = req.dbName;

    // For suppliers, let's use the actual UUID for consistency with the catalog
    if (userType === 'supplier') {
      const [supRows] = await masterPool.execute("SELECT supplier_id FROM suppliers WHERE db_name = ?", [entityId]);
      if (supRows.length > 0) entityId = supRows[0].supplier_id;
    }

    const slug = (business_name || 'business')
      .toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 40)
      + '_' + req.dbName.slice(-6);

    await masterPool.execute(
      `INSERT INTO profiles
         (profile_id, entity_id, entity_type, business_name, slug, description,
          logo, city, state, pincode, business_type, is_public, latitude, longitude, address, email, phone)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         business_name = VALUES(business_name),
         description   = VALUES(description),
         logo          = VALUES(logo),
         city          = VALUES(city),
         state         = VALUES(state),
         pincode       = VALUES(pincode),
         business_type = VALUES(business_type),
         is_public     = VALUES(is_public),
         latitude      = VALUES(latitude),
         longitude     = VALUES(longitude),
         address       = VALUES(address),
         email         = VALUES(email),
         phone         = VALUES(phone)`,
      [uuidv4(), entityId, userType, business_name, slug, description || null,
      logo || null, city || null, state || null, pincode || null,
      business_type || 'general', is_public ? 1 : 0,
      latitude || null, longitude || null, address || null, email || null, phone || null]
    );

    res.json({ success: true, message: "Profile updated." });
  } catch (error) { next(error); }
};

// GET /api/discovery/own-profile — fetch current tenant's saved location (auth required)
export const getOwnProfile = async (req, res, next) => {
  try {
    const userType = req.user.userType || 'shop';
    // Fetch from relevant profile in tenant DB
    const [rows] = await req.db.execute(
      "SELECT latitude, longitude, address, city, state FROM shop_profile LIMIT 1"
    );

    if (rows.length === 0) return res.json({ success: true, data: null });

    res.json({ success: true, data: rows[0] });
  } catch (error) { next(error); }
};
// GET /api/discovery/supplier/:id/catalog — fetch items from master DB (supports slug or ID)
export const getCatalog = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [rows] = await masterPool.execute(
      `SELECT sp.* 
       FROM supplier_products sp
       JOIN suppliers s ON s.supplier_id = sp.supplier_id
       WHERE (s.slug = ? OR s.supplier_id = ? OR s.db_name = ?) 
         AND sp.is_active = TRUE`,
      [id, id, id]
    );
    res.json({ success: true, data: rows });
  } catch (error) { next(error); }
};
