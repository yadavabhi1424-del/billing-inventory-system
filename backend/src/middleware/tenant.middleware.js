import mysql from "mysql2/promise";
import { masterPool } from "../config/masterDatabase.js";
import { AppError }   from "./errorHandler.js";
import {
  CORE_SCHEMA, SALES_SCHEMA, PROCUREMENT_SCHEMA,
  MANUFACTURING_SCHEMA, STOCK_SCHEMA, SHOP_TYPE_SCHEMAS,
} from '../config/tenantSchema.js';

const SCHEMA_MAP = {
  CORE:          CORE_SCHEMA,
  SALES:         SALES_SCHEMA,
  PROCUREMENT:   PROCUREMENT_SCHEMA,
  MANUFACTURING: MANUFACTURING_SCHEMA,
  STOCK:         STOCK_SCHEMA,
};

const tenantConnections = new Map();

async function getTenantPool(dbName) {
  if (tenantConnections.has(dbName)) {
    return tenantConnections.get(dbName);
  }

  const pool = mysql.createPool({
    host:               process.env.DB_HOST,
    user:               process.env.DB_USER,
    password:           process.env.DB_PASSWORD,
    database:           dbName,
    port:               process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit:    5,
    timezone:           "+05:30",
  });

  tenantConnections.set(dbName, pool);
  return pool;
}

export async function tenantMiddleware(req, res, next) {
  try {
    // Get tenant from subdomain or header or token
    const tenantSlug =
      req.headers['x-tenant-slug'] ||
      req.hostname.split('.')[0];

    if (!tenantSlug || tenantSlug === 'localhost') {
      // Single tenant fallback — use current DB
      req.db = (await import('../config/database.js')).pool;
      return next();
    }

    // Look up tenant in master DB
    const [rows] = await masterPool.execute(
      `SELECT t.tenant_id, t.db_name, t.status,
              s.plan, s.max_users, s.max_products,
              s.ai_enabled, s.reports_enabled
       FROM tenants t
       JOIN subscriptions s ON s.tenant_id = t.tenant_id
       WHERE t.shop_slug = ? AND t.status != 'SUSPENDED'`,
      [tenantSlug]
    );

    if (rows.length === 0) {
      return next(new AppError("Shop not found or suspended.", 404));
    }

    const tenant = rows[0];
    req.tenant   = tenant;
    req.db       = await getTenantPool(tenant.db_name);
    next();
  } catch (error) {
    next(error);
  }
}

export async function provisionTenant(tenantId, dbName, shopType = 'other') {
  const conn = await mysql.createConnection({
    host:     process.env.DB_HOST,
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port:     process.env.DB_PORT || 3306,
    multipleStatements: true,
  });

  try {
    await conn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
    await conn.query(`USE \`${dbName}\``);

    // Run only schemas needed for this shop type
    const schemasToRun = SHOP_TYPE_SCHEMAS[shopType] || SHOP_TYPE_SCHEMAS['other'];

    for (const schemaKey of schemasToRun) {
      const sql = SCHEMA_MAP[schemaKey];
      if (sql) await conn.query(sql);
    }

    console.log(`✅ Tenant DB provisioned: ${dbName} (${shopType})`);
    return true;
  } finally {
    await conn.end();
  }
}
export { getTenantPool};