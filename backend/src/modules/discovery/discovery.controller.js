import { masterPool } from "../../config/masterDatabase.js";

// GET /api/discovery  — lists all public shops + suppliers from master DB
// Query params: type (shop|supplier), city, state, business_type, search, page, limit
export const getDiscovery = async (req, res, next) => {
  try {
    const {
      type, city, state, business_type,
      search, page = 1, limit = 20,
      lat, lng, radius, // Geospatial filters
    } = req.query;

    const offset  = (Number(page) - 1) * Number(limit);
    const conditions = ["p.is_public = TRUE"];
    const params  = [];

    if (type)          { conditions.push("p.entity_type = ?");    params.push(type); }
    if (city)          { conditions.push("p.city LIKE ?");         params.push(`%${city}%`); }
    if (state)         { conditions.push("p.state LIKE ?");        params.push(`%${state}%`); }
    if (business_type) { conditions.push("p.business_type = ?");   params.push(business_type); }
    if (search)        { conditions.push("p.business_name LIKE ?"); params.push(`%${search}%`); }

    let distanceSelect = "";
    let distanceHaving = "";
    if (lat && lng && radius) {
      // Use ST_Distance_Sphere (MySQL 5.7.6+) to calculate distance in KM
      distanceSelect = `, (ST_Distance_Sphere(POINT(?, ?), POINT(p.longitude, p.latitude)) / 1000) AS distance`;
      params.unshift(Number(lng), Number(lat)); // Add to START of params for the SELECT
      distanceHaving = `HAVING distance <= ${Number(radius)}`;
    }

    const where = conditions.join(" AND ");

    const [rows] = await req.db.execute(
      `SELECT p.profile_id, p.entity_id, p.entity_type,
              p.business_name, p.slug, p.description,
              p.logo, p.city, p.state, p.pincode,
              p.address, p.email, p.phone,
              p.latitude, p.longitude,
              p.business_type, p.createdAt
              ${distanceSelect}
       FROM profiles p
       WHERE ${where}
       ${distanceHaving}
       ORDER BY ${distanceSelect ? 'distance ASC' : 'p.createdAt DESC'}
       LIMIT ${Number(limit)} OFFSET ${offset}`,
      params
    );

    // For count, we need to respect the HAVING if distance is used
    let total;
    if (distanceHaving) {
      const [countRows] = await req.db.execute(
        `SELECT COUNT(*) as total FROM (
           SELECT p.profile_id, (ST_Distance_Sphere(POINT(?, ?), POINT(p.longitude, p.latitude)) / 1000) AS distance
           FROM profiles p WHERE ${where} HAVING distance <= ${Number(radius)}
         ) AS subquery`,
        params.slice(0, conditions.length + 2) // [lng, lat, ...whereParams]
      );
      total = countRows[0].total;
    } else {
      const [[{ total: t }]] = await req.db.execute(
        `SELECT COUNT(*) AS total FROM profiles p WHERE ${where}`, params
      );
      total = t;
    }

    res.json({
      success: true,
      data: rows,
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
    } = req.body;

    const userType  = req.user.userType || 'shop';
    const entityId  = req.dbName; // use dbName as unique entity identifier

    // derive slug from business_name
    const slug = (business_name || 'business')
      .toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 40)
      + '_' + entityId.slice(-6);

    await masterPool.execute(
      `INSERT INTO profiles
         (profile_id, entity_id, entity_type, business_name, slug, description,
          logo, city, state, pincode, business_type, is_public)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         business_name = VALUES(business_name),
         description   = VALUES(description),
         logo          = VALUES(logo),
         city          = VALUES(city),
         state         = VALUES(state),
         pincode       = VALUES(pincode),
         business_type = VALUES(business_type),
         is_public     = VALUES(is_public)`,
      [uuidv4(), entityId, userType, business_name, slug, description || null,
       logo || null, city || null, state || null, pincode || null,
       business_type || 'general', is_public ? 1 : 0]
    );

    res.json({ success: true, message: "Profile updated." });
  } catch (error) { next(error); }
};
