import { masterPool } from "../../config/masterDatabase.js";

// GET /api/discovery  — lists all public shops + suppliers from master DB
// Query params: type (shop|supplier), city, state, business_type, search, page, limit
export const getDiscovery = async (req, res, next) => {
  try {
    const {
      type, city, state, business_type,
      search, page = 1, limit = 20,
    } = req.query;

    const offset  = (Number(page) - 1) * Number(limit);
    const conditions = ["p.is_public = TRUE"];
    const params  = [];

    if (type)          { conditions.push("p.entity_type = ?");    params.push(type); }
    if (city)          { conditions.push("p.city LIKE ?");         params.push(`%${city}%`); }
    if (state)         { conditions.push("p.state LIKE ?");        params.push(`%${state}%`); }
    if (business_type) { conditions.push("p.business_type = ?");   params.push(business_type); }
    if (search)        { conditions.push("p.business_name LIKE ?"); params.push(`%${search}%`); }

    const where = conditions.join(" AND ");

    const [rows] = await masterPool.execute(
      `SELECT p.profile_id, p.entity_id, p.entity_type,
              p.business_name, p.slug, p.description,
              p.logo, p.city, p.state, p.pincode,
              p.address, p.email, p.phone,
              p.business_type, p.createdAt
       FROM profiles p
       WHERE ${where}
       ORDER BY p.createdAt DESC
       LIMIT ${Number(limit)} OFFSET ${offset}`,
      params
    );

    const [[{ total }]] = await masterPool.execute(
      `SELECT COUNT(*) AS total FROM profiles p WHERE ${where}`, params
    );

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
