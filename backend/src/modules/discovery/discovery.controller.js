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

    const offset  = (Number(page) - 1) * Number(limit);
    let conditions = ["p.is_public = TRUE"];
    let params  = [];

    if (type)          { conditions.push("p.entity_type = ?");    params.push(type); }
    if (city)          { conditions.push("p.city LIKE ?");         params.push(`%${city}%`); }
    if (state)         { conditions.push("p.state LIKE ?");        params.push(`%${state}%`); }
    
    // Primary Filter logic: Get the business_type to filter by
    let selectedType = (business_type && business_type !== 'All') ? business_type : null;
    
    // If the user wants to match their own category
    if (match_my_category === 'true') {
      // Safety: Only perform lookup if authenticated user context exists
      if (req.user) {
        if (!req.user.business_type && req.db) {
           const [profileRows] = await req.db.execute("SELECT shop_type FROM shop_profile LIMIT 1");
           if (profileRows.length > 0) req.user.business_type = profileRows[0].shop_type;
        }
        if (req.user.business_type) selectedType = req.user.business_type;
      }
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
      distanceHaving = `HAVING distance <= ${Number(radius)}`;
    }

    const where = conditions.join(" AND ");

    let [rows] = await masterPool.execute(
      `SELECT DISTINCT p.profile_id, p.entity_id, p.entity_type,
              p.business_name, p.slug, p.description,
              p.logo, p.city, p.state, p.pincode,
              p.address, p.email, p.phone,
              p.latitude, p.longitude,
              p.business_type, p.createdAt
              ${distanceSelect}
       FROM profiles p
       ${searchJoin}
       WHERE ${where}
       ${distanceHaving}
       ORDER BY ${distanceSelect ? 'distance ASC' : 'p.createdAt DESC'}
       LIMIT ${Number(limit)} OFFSET ${offset}`,
      params
    );

    let total = 0;
    let fallback = false;

    // Fallback logic: If NO EXACT MATCHES, show general results of the SAME type
    if (rows.length === 0 && (selectedType || search)) {
        fallback = true;
        let fbCond = ["p.is_public = TRUE"];
        let fbParams = [];
        if (type) { fbCond.push("p.entity_type = ?"); fbParams.push(type); }

        const [fbRows] = await masterPool.execute(
          `SELECT DISTINCT p.profile_id, p.entity_id, p.entity_type,
                  p.business_name, p.slug, p.description,
                  p.logo, p.city, p.state, p.pincode,
                  p.business_type, p.createdAt
           FROM profiles p
           WHERE ${fbCond.join(" AND ")}
           ORDER BY RAND()
           LIMIT ${Number(limit)}`,
          fbParams
        );
        rows = fbRows;
        total = rows.length; 
    } else {
        const countWhere = conditions.join(" AND ");
        const countParams = distanceHaving ? params.slice(0, 2).concat(params.slice(2)) : params; // Adjust if distance param needed
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

    const userType  = req.user.userType || 'shop';
    const entityId  = req.dbName;

    const slug = (business_name || 'business')
      .toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 40)
      + '_' + entityId.slice(-6);

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
    if (!req.db) return res.status(400).json({ success: false, message: "No database context." });
    
    // Fetch from shop_profile in tenant DB
    const [rows] = await req.db.execute(
      "SELECT latitude, longitude, address, city, state FROM shop_profile LIMIT 1"
    );
    
    if (rows.length === 0) return res.json({ success: true, data: null });
    
    res.json({ success: true, data: rows[0] });
  } catch (error) { next(error); }
};
