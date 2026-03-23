import { v4 as uuidv4 }    from "uuid";
import bcrypt               from "bcryptjs";
import { masterPool }       from "../../config/masterDatabase.js";
import { provisionTenant, getTenantPool } from "../../middleware/tenant.middleware.js";
import { generateTokenPair } from "../../config/jwt.js";
import { AppError }         from "../../middleware/errorHandler.js";

export const registerTenant = async (req, res, next) => {
  try {
    const { shopName, ownerName, ownerEmail, ownerPhone, password, shopType = 'other' } = req.body;

    if (!shopName || !ownerName || !ownerEmail || !password)
      return next(new AppError("All fields are required.", 400));

    const [existing] = await masterPool.execute(
      "SELECT tenant_id FROM tenants WHERE owner_email = ?", [ownerEmail]
    );
    if (existing.length > 0)
      return next(new AppError("Email already registered.", 409));

    const tenantId = uuidv4();
    const shopSlug = shopName.toLowerCase()
      .replace(/[^a-z0-9]/g, '_').slice(0, 40) + '_' + tenantId.slice(0, 6);
    const dbName   = `${process.env.TENANT_DB_PREFIX}${tenantId.replace(/-/g,'').slice(0,16)}`;

    await masterPool.execute(
      `INSERT INTO tenants (tenant_id, shop_name, shop_slug, owner_name, owner_email, owner_phone, db_name, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'TRIAL')`,
      [tenantId, shopName, shopSlug, ownerName, ownerEmail, ownerPhone || null, dbName]
    );

    await masterPool.execute(
      `INSERT INTO subscriptions (sub_id, tenant_id, plan, status, max_users, max_products, ai_enabled, reports_enabled, expires_at)
       SELECT ?, ?, plan_name, 'ACTIVE', max_users, max_products, ai_enabled, reports_enabled,
              DATE_ADD(NOW(), INTERVAL 30 DAY)
       FROM plans WHERE plan_name = 'FREE'`,
      [uuidv4(), tenantId]
    );

    await provisionTenant(tenantId, dbName, shopType);

    const tenantPool = await getTenantPool(dbName);
    const hashedPwd  = await bcrypt.hash(password, 12);
    const userId     = uuidv4();

    await tenantPool.execute(
      `INSERT INTO users (user_id, name, email, password, role, status, emailVerified, isActive)
       VALUES (?, ?, ?, ?, 'OWNER', 'APPROVED', TRUE, TRUE)`,
      [userId, ownerName, ownerEmail, hashedPwd]
    );

    // Include dbName in token so middleware routes correctly
    const tokens = generateTokenPair({
      user_id: userId,
      email:   ownerEmail,
      role:    'owner',
      name:    ownerName,
      dbName,
    });

    res.status(201).json({
      success: true,
      message: "Shop registered successfully!",
      data: {
        tenantId, shopSlug, dbName,
        ...tokens,
        user: { user_id: userId, name: ownerName, email: ownerEmail, role: 'owner' },
      },
    });
  } catch (error) { next(error); }
};

export const getPlans = async (req, res, next) => {
  try {
    const [plans] = await masterPool.execute("SELECT * FROM plans ORDER BY price_monthly ASC");
    res.json({ success: true, data: plans });
  } catch (error) { next(error); }
};