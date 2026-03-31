import mysql from "mysql2/promise";
import { masterPool } from "../config/masterDatabase.js";
import { AppError }   from "./errorHandler.js";
import {
  CORE_SCHEMA, SALES_SCHEMA, PROCUREMENT_SCHEMA,
  MANUFACTURING_SCHEMA, STOCK_SCHEMA, SHOP_TYPE_SCHEMAS,
} from '../config/tenantSchema.js';
import {
  SUPPLIER_CORE_SCHEMA,
  SUPPLIER_CATALOG_SCHEMA,
  SUPPLIER_ORDERS_SCHEMA,
  SUPPLIER_PROCUREMENT_SCHEMA,
} from '../config/supplierSchema.js';

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
    const tenantSlug =
      req.headers['x-tenant-slug'] ||
      req.hostname.split('.')[0];

    req.masterPool = masterPool;

    if (!tenantSlug || tenantSlug === 'localhost') {
      req.db = (await import('../config/database.js')).pool;
      req.dbName = process.env.DB_NAME;
      return next();
    }

    // Check shops first
    const [shopRows] = await masterPool.execute(
      `SELECT t.tenant_id, t.db_name, t.status,
              s.plan, s.max_users, s.max_products,
              s.ai_enabled, s.reports_enabled
       FROM tenants t
       JOIN subscriptions s ON s.tenant_id = t.tenant_id
       WHERE t.shop_slug = ? AND t.status != 'SUSPENDED'`,
      [tenantSlug]
    );

    if (shopRows.length > 0) {
      const tenant = shopRows[0];
      req.tenant   = tenant;
      req.userType = 'shop';
      req.dbName   = tenant.db_name;
      req.db       = await getTenantPool(tenant.db_name);
      return next();
    }

    // Check suppliers
    const [supRows] = await masterPool.execute(
      `SELECT supplier_id, db_name, status FROM suppliers
       WHERE slug = ? AND status != 'SUSPENDED'`,
      [tenantSlug]
    );

    if (supRows.length > 0) {
      req.tenant   = supRows[0];
      req.userType = 'supplier';
      req.dbName   = supRows[0].db_name;
      req.db       = await getTenantPool(supRows[0].db_name);
      return next();
    }

    return next(new AppError("Account not found or suspended.", 404));
  } catch (error) {
    next(error);
  }
}

// ── Provision a SHOP tenant DB ────────────────────────────────
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

    const schemasToRun = SHOP_TYPE_SCHEMAS[shopType] || SHOP_TYPE_SCHEMAS['other'];
    for (const schemaKey of schemasToRun) {
      const sql = SCHEMA_MAP[schemaKey];
      if (sql) await conn.query(sql);
    }

    console.log(`✅ Shop tenant DB provisioned: ${dbName} (${shopType})`);
    return true;
  } finally {
    await conn.end();
  }
}

// ── Provision a SUPPLIER tenant DB ───────────────────────────
export async function provisionSupplierTenant(supplierId, dbName) {
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

    await conn.query(SUPPLIER_CORE_SCHEMA);
    await conn.query(SUPPLIER_CATALOG_SCHEMA);
    await conn.query(SUPPLIER_ORDERS_SCHEMA);
    await conn.query(SUPPLIER_PROCUREMENT_SCHEMA);

    console.log(`✅ Supplier tenant DB provisioned: ${dbName}`);
    return true;
  } finally {
    await conn.end();
  }
}

export { getTenantPool };
