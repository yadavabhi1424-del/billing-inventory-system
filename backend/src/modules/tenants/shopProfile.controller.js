import { v4 as uuidv4 } from "uuid";
import { AppError }     from "../../middleware/errorHandler.js";

export const getShopTypes = async (req, res, next) => {
  try {
    // Data-driven, no hardcoding
    const shopTypes = [
      { type_key:'general_store', display_name:'General Store',      icon:'🛒', description:'Grocery, FMCG, daily needs' },
      { type_key:'electronics',   display_name:'Electronics',        icon:'📱', description:'Phones, appliances, gadgets' },
      { type_key:'textile',       display_name:'Textile / Clothing', icon:'👕', description:'Fabric, garments, fashion' },
      { type_key:'pharmacy',      display_name:'Pharmacy',           icon:'💊', description:'Medicines, healthcare' },
      { type_key:'restaurant',    display_name:'Restaurant / Cafe',  icon:'🍽️', description:'Food, beverages' },
      { type_key:'manufacturing', display_name:'Manufacturing',      icon:'🏭', description:'Full production cycle' },
      { type_key:'hardware',      display_name:'Hardware Store',     icon:'🔧', description:'Tools, materials, parts' },
      { type_key:'auto_parts',    display_name:'Auto Parts',        icon:'🚗', description:'Vehicle parts, accessories' },
      { type_key:'stationery',    display_name:'Stationery / Books', icon:'📚', description:'Office supplies, books' },
      { type_key:'jewellery',     display_name:'Jewellery',          icon:'💍', description:'Gold, silver, gems' },
      { type_key:'warehouse',     display_name:'Warehouse',          icon:'🏪', description:'Storage, distribution' },
      { type_key:'other',         display_name:'Other',              icon:'🏬', description:'Custom business type' },
    ];
    res.json({ success: true, data: shopTypes });
  } catch (error) { next(error); }
};

export const saveShopProfile = async (req, res, next) => {
  try {
    const {
      shop_name, shop_type, shop_description,
      inventory_types, currency, timezone,
      address, gstin,
    } = req.body;

    if (!shop_name || !shop_type || !inventory_types)
      return next(new AppError("Shop name, type and inventory types are required.", 400));

    const db = req.db;

    // Check if profile exists
    const [existing] = await db.execute(
      "SELECT profile_id FROM shop_profile LIMIT 1"
    );

    if (existing.length > 0) {
      // Update
      await db.execute(
        `UPDATE shop_profile SET
          shop_name        = ?,
          shop_type        = ?,
          shop_description = ?,
          inventory_types  = ?,
          currency         = ?,
          timezone         = ?,
          address          = ?,
          gstin            = ?,
          is_setup_done    = TRUE
         WHERE profile_id  = ?`,
        [
          shop_name, shop_type, shop_description || null,
          JSON.stringify(inventory_types),
          currency || 'INR', timezone || 'Asia/Kolkata',
          address || null, gstin || null,
          existing[0].profile_id,
        ]
      );
    } else {
      // Insert
      await db.execute(
        `INSERT INTO shop_profile
          (profile_id, shop_name, shop_type, shop_description,
           inventory_types, currency, timezone, address, gstin, is_setup_done)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)`,
        [
          uuidv4(), shop_name, shop_type,
          shop_description || null,
          JSON.stringify(inventory_types),
          currency || 'INR', timezone || 'Asia/Kolkata',
          address || null, gstin || null,
        ]
      );
    }

    res.json({ success: true, message: "Shop profile saved." });
  } catch (error) { next(error); }
};

export const getShopProfile = async (req, res, next) => {
  try {
    const [rows] = await req.db.execute(
      "SELECT * FROM shop_profile LIMIT 1"
    );
    res.json({
      success: true,
      data: rows[0] || null,
    });
  } catch (error) { next(error); }
};