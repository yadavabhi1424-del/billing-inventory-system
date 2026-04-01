import mysql from "mysql2/promise";
import "dotenv/config";

const masterPool = mysql.createPool({
  host:               process.env.DB_HOST,
  user:               process.env.DB_USER,
  password:           process.env.DB_PASSWORD,
  database:           process.env.MASTER_DB_NAME,
  port:               process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit:    10,
  timezone:           "+05:30",
});

export async function seedMasterData() {
  // ── Suppliers table ───────────────────────────────────────
  await masterPool.execute(`
    CREATE TABLE IF NOT EXISTS suppliers (
      supplier_id   VARCHAR(36)  PRIMARY KEY,
      business_name VARCHAR(100) NOT NULL,
      slug          VARCHAR(120) UNIQUE NOT NULL,
      owner_name    VARCHAR(100) NOT NULL,
      owner_email   VARCHAR(100) UNIQUE NOT NULL,
      owner_phone   VARCHAR(20),
      db_name       VARCHAR(80)  UNIQUE NOT NULL,
      status        ENUM('TRIAL','ACTIVE','SUSPENDED') DEFAULT 'TRIAL',
      createdAt     DATETIME     DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // ── Phase 3: Profiles (public discovery) ─────────────────
  await masterPool.execute(`
    CREATE TABLE IF NOT EXISTS profiles (
      profile_id    VARCHAR(36)  PRIMARY KEY,
      entity_id     VARCHAR(36)  NOT NULL,
      entity_type   ENUM('shop','supplier') NOT NULL,
      business_name VARCHAR(100) NOT NULL,
      slug          VARCHAR(120) UNIQUE NOT NULL,
      description   TEXT,
      logo          VARCHAR(255),
      city          VARCHAR(60),
      state         VARCHAR(60),
      pincode       VARCHAR(10),
      latitude      DECIMAL(10, 8),
      longitude     DECIMAL(11, 8),
      business_type VARCHAR(50)  DEFAULT 'general',
      is_public     BOOL         DEFAULT TRUE,
      createdAt     DATETIME     DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_entity (entity_id, entity_type)
    )
  `);

  // ── Phase 5: Supplier Public Catalog ──────────────────────
  await masterPool.execute(`
    CREATE TABLE IF NOT EXISTS supplier_products (
      id            VARCHAR(36)  PRIMARY KEY,
      supplier_id   VARCHAR(36)  NOT NULL,
      product_id    VARCHAR(36)  NOT NULL,  -- ID from the tenant DB
      name          VARCHAR(200) NOT NULL,
      sku           VARCHAR(100) NOT NULL,
      description   TEXT,
      unit          VARCHAR(20)  DEFAULT 'pcs',
      price         DECIMAL(10,2) DEFAULT 0,
      image         VARCHAR(255),
      is_active     BOOL         DEFAULT TRUE,
      updated_at    DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_sup_prod (supplier_id, product_id)
    )
  `);

  // ── Phase 7: B2B Order Lifecycle (Cross-Tenant) ─────────────
  await masterPool.execute(`
    CREATE TABLE IF NOT EXISTS b2b_orders (
      order_id      VARCHAR(36)  PRIMARY KEY,
      shop_id       VARCHAR(36)  NOT NULL,
      supplier_id   VARCHAR(36)  NOT NULL,
      status        ENUM('PENDING','ACCEPTED','BILLED','CLOSED','REJECTED') DEFAULT 'PENDING',
      total_amount  DECIMAL(12,2) DEFAULT 0,
      notes         TEXT,
      createdAt     DATETIME     DEFAULT CURRENT_TIMESTAMP,
      updatedAt     DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  await masterPool.execute(`
    CREATE TABLE IF NOT EXISTS b2b_order_items (
      id            VARCHAR(36)  PRIMARY KEY,
      order_id      VARCHAR(36)  NOT NULL,
      product_id    VARCHAR(36)  NOT NULL,
      name          VARCHAR(200) NOT NULL,
      sku           VARCHAR(100) NOT NULL,
      price         DECIMAL(10,2) DEFAULT 0,
      qty           INT          DEFAULT 1,
      total         DECIMAL(12,2) DEFAULT 0,
      FOREIGN KEY (order_id) REFERENCES b2b_orders(order_id) ON DELETE CASCADE
    )
  `);

  // ── Phase 8: Relationships (Many-to-Many Map) ─────────────
  await masterPool.execute(`
    CREATE TABLE IF NOT EXISTS shop_supplier_map (
      map_id        VARCHAR(36)  PRIMARY KEY,
      shop_id       VARCHAR(36)  NOT NULL,
      supplier_id   VARCHAR(36)  NOT NULL,
      status        ENUM('PENDING','ACCEPTED','REJECTED') DEFAULT 'PENDING',
      initiated_by  ENUM('shop','supplier') NOT NULL,
      createdAt     DATETIME     DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_shop_sup (shop_id, supplier_id)
    )
  `);

  // ── Plans seed ────────────────────────────────────────────
  await masterPool.execute(`
    INSERT IGNORE INTO plans 
      (plan_name, display_name, price_monthly, max_users, max_products, ai_enabled, reports_enabled, description)
    VALUES
      ('FREE',       'Free',       0,    2,    200,  FALSE, FALSE, 'Perfect for trying out'),
      ('BASIC',      'Basic',      149,  5,    500,  FALSE, TRUE,  'For small businesses'),
      ('PRO',        'Pro',        499,  10,   NULL, TRUE,  TRUE,  'For growing businesses'),
      ('ENTERPRISE', 'Enterprise', NULL, NULL, NULL, TRUE,  TRUE,  'Custom pricing')
  `);
}

export { masterPool };
