// ============================================================
//  supplierSchema.js
//  Tables provisioned into every supplier's private tenant DB.
//  RULE: NO master-DB data here — only private business data.
// ============================================================

export const SUPPLIER_CORE_SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  user_id           VARCHAR(36)  PRIMARY KEY,
  name              VARCHAR(100) NOT NULL,
  email             VARCHAR(100) UNIQUE NOT NULL,
  password          VARCHAR(255),
  provider          ENUM('local','google') DEFAULT 'local',
  role              ENUM('OWNER','ADMIN','MANAGER','STAFF') DEFAULT 'STAFF',
  phone             VARCHAR(20),
  avatar            VARCHAR(255),
  status            ENUM('PENDING','APPROVED','REJECTED') DEFAULT 'PENDING',
  isActive          BOOL         DEFAULT TRUE,
  emailVerified     BOOL         DEFAULT FALSE,
  verifyToken       VARCHAR(255),
  verifyTokenExpiry DATETIME,
  refreshToken      TEXT,
  approvedBy        VARCHAR(36),
  approvedAt        DATETIME,
  createdAt         DATETIME     DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS email_otps (
  id        VARCHAR(36) PRIMARY KEY,
  user_id   VARCHAR(36) NOT NULL,
  code      CHAR(6)     NOT NULL,
  expiry    DATETIME    NOT NULL,
  createdAt DATETIME    DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS invitations (
  invite_id  VARCHAR(36)  PRIMARY KEY,
  email      VARCHAR(100) NOT NULL,
  role       ENUM('ADMIN','MANAGER','STAFF') DEFAULT 'STAFF',
  token      VARCHAR(100) UNIQUE NOT NULL,
  invited_by VARCHAR(36),
  status     ENUM('PENDING','ACCEPTED','EXPIRED') DEFAULT 'PENDING',
  expires_at DATETIME     NOT NULL,
  createdAt  DATETIME     DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (invited_by) REFERENCES users(user_id)
);

CREATE TABLE IF NOT EXISTS shop_profile (
  profile_id      VARCHAR(36)  PRIMARY KEY,
  shop_name       VARCHAR(100) NOT NULL,
  shop_type       VARCHAR(50)  NOT NULL,
  shop_description TEXT,
  inventory_types JSON         NOT NULL,
  currency        VARCHAR(10)  DEFAULT 'INR',
  timezone        VARCHAR(50)  DEFAULT 'Asia/Kolkata',
  logo            VARCHAR(255),
  address         TEXT,
  gstin           VARCHAR(20),
  latitude        DECIMAL(10, 8),
  longitude       DECIMAL(11, 8),
  is_setup_done   BOOL         DEFAULT FALSE,
  createdAt       DATETIME     DEFAULT CURRENT_TIMESTAMP
);
`;

export const SUPPLIER_CATALOG_SCHEMA = `
CREATE TABLE IF NOT EXISTS products (
  product_id    VARCHAR(36)   PRIMARY KEY,
  product_seq   INT           AUTO_INCREMENT UNIQUE,
  name          VARCHAR(200)  NOT NULL,
  sku           VARCHAR(100)  UNIQUE NOT NULL,
  description   TEXT,
  unit          VARCHAR(20)   DEFAULT 'pcs',
  costPrice     DECIMAL(10,2) DEFAULT 0,
  sellingPrice  DECIMAL(10,2) DEFAULT 0,
  mrp           DECIMAL(10,2),
  taxRate       DECIMAL(5,2)  DEFAULT 0,
  taxType       VARCHAR(20)   DEFAULT 'GST',
  stock         INT           DEFAULT 0,
  minStockLevel INT           DEFAULT 10,
  image         VARCHAR(255),
  isActive      BOOL          DEFAULT TRUE,
  synced_at     DATETIME,
  createdAt     DATETIME      DEFAULT CURRENT_TIMESTAMP
);
`;

export const SUPPLIER_ORDERS_SCHEMA = `
CREATE TABLE IF NOT EXISTS customers (
  customer_id    VARCHAR(36)   PRIMARY KEY,
  name           VARCHAR(100)  NOT NULL,
  email          VARCHAR(100),
  phone          VARCHAR(20),
  address        TEXT,
  city           VARCHAR(50),
  gstin          VARCHAR(20),
  shop_tenant_id VARCHAR(36),
  notes          TEXT,
  totalSpent     DECIMAL(12,2) DEFAULT 0,
  isActive       BOOL          DEFAULT TRUE,
  createdAt      DATETIME      DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS transactions (
  transaction_id VARCHAR(36)   PRIMARY KEY,
  invoiceNumber  VARCHAR(50)   UNIQUE NOT NULL,
  customer_id    VARCHAR(36),
  user_id        VARCHAR(36),
  status         ENUM('PENDING','CONFIRMED','PROCESSING','SHIPPED','DELIVERED','CANCELLED', 'COMPLETED') DEFAULT 'COMPLETED',
  paymentStatus  ENUM('UNPAID','PARTIAL','PAID') DEFAULT 'UNPAID',
  paymentMethod  ENUM('CASH','UPI','CARD','CREDIT','OTHER') DEFAULT 'CASH',
  subtotal       DECIMAL(12,2) DEFAULT 0,
  taxAmount      DECIMAL(10,2) DEFAULT 0,
  discountAmount DECIMAL(10,2) DEFAULT 0,
  totalAmount    DECIMAL(12,2) NOT NULL,
  amountPaid     DECIMAL(12,2) DEFAULT 0,
  notes          TEXT,
  expectedDate   DATE,
  createdAt      DATETIME      DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(customer_id),
  FOREIGN KEY (user_id)     REFERENCES users(user_id)
);

CREATE TABLE IF NOT EXISTS transaction_items (
  item_id        VARCHAR(36)   PRIMARY KEY,
  transaction_id VARCHAR(36)   NOT NULL,
  product_id     VARCHAR(36),
  productName    VARCHAR(200)  NOT NULL,
  sku            VARCHAR(100),
  quantity       INT           NOT NULL,
  unit           VARCHAR(20),
  costPrice      DECIMAL(10,2) DEFAULT 0,
  sellingPrice   DECIMAL(10,2) NOT NULL,
  taxRate        DECIMAL(5,2)  DEFAULT 0,
  taxAmount      DECIMAL(10,2) DEFAULT 0,
  totalAmount    DECIMAL(12,2) NOT NULL,
  FOREIGN KEY (transaction_id) REFERENCES transactions(transaction_id),
  FOREIGN KEY (product_id)     REFERENCES products(product_id)
);
`;
