export const CORE_SCHEMA = `
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
  is_setup_done   BOOL         DEFAULT FALSE,
  createdAt       DATETIME     DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
  user_id             VARCHAR(36)  PRIMARY KEY,
  name                VARCHAR(100) NOT NULL,
  email               VARCHAR(100) UNIQUE NOT NULL,
  password            VARCHAR(255),
  provider            ENUM('local','google') DEFAULT 'local',
  role                ENUM('OWNER','ADMIN','MANAGER','CASHIER','STAFF') DEFAULT 'CASHIER',
  phone               VARCHAR(20),
  avatar              VARCHAR(255),
  status              ENUM('PENDING','APPROVED','REJECTED') DEFAULT 'PENDING',
  isActive            BOOL     DEFAULT TRUE,
  emailVerified       BOOL     DEFAULT FALSE,
  verifyToken         VARCHAR(100),
  verifyTokenExpiry   DATETIME,
  refreshToken        TEXT,
  approvedBy          VARCHAR(36),
  approvedAt          DATETIME,
  createdAt           DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS email_otps (
  id        VARCHAR(36) PRIMARY KEY,
  user_id   VARCHAR(36) NOT NULL,
  code      CHAR(6) NOT NULL,
  expiry    DATETIME NOT NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS categories (
  category_id   VARCHAR(36)  PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  description   TEXT,
  color         VARCHAR(20)  DEFAULT '#6366f1',
  icon          VARCHAR(50),
  isActive      BOOL         DEFAULT TRUE,
  createdAt     DATETIME     DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
  product_id     VARCHAR(36)   PRIMARY KEY,
  name           VARCHAR(200)  NOT NULL,
  sku            VARCHAR(100)  UNIQUE NOT NULL,
  barcode        VARCHAR(100),
  description    TEXT,
  category_id    VARCHAR(36),
  supplier_id    VARCHAR(36),
  unit           VARCHAR(20)   DEFAULT 'pcs',
  costPrice      DECIMAL(10,2) DEFAULT 0,
  sellingPrice   DECIMAL(10,2) DEFAULT 0,
  mrp            DECIMAL(10,2),
  taxRate        DECIMAL(5,2)  DEFAULT 0,
  taxType        VARCHAR(20)   DEFAULT 'GST',
  stock          INT           DEFAULT 0,
  minStockLevel  INT           DEFAULT 10,
  maxStockLevel  INT,
  location       VARCHAR(100),
  image          VARCHAR(255),
  expiryDate     DATE,
  inventory_type ENUM('FINISHED','RAW','WIP','COMPONENT') DEFAULT 'FINISHED',
  lead_time_days INT           DEFAULT 1,
  min_order_qty  INT           DEFAULT 1,
  industry_tags  JSON,
  isActive       BOOL          DEFAULT TRUE,
  createdAt      DATETIME      DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(category_id)
);

CREATE TABLE IF NOT EXISTS invitations (
  invite_id     VARCHAR(36)  PRIMARY KEY,
  email         VARCHAR(100) NOT NULL,
  role          ENUM('ADMIN','MANAGER','CASHIER','STAFF') DEFAULT 'CASHIER',
  token         VARCHAR(100) UNIQUE NOT NULL,
  invited_by    VARCHAR(36),
  status        ENUM('PENDING','ACCEPTED','EXPIRED') DEFAULT 'PENDING',
  expires_at    DATETIME     NOT NULL,
  createdAt     DATETIME     DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (invited_by) REFERENCES users(user_id)
);
`;

export const STOCK_SCHEMA = `
CREATE TABLE IF NOT EXISTS stock_movements (
  movement_id   VARCHAR(36)  PRIMARY KEY,
  product_id    VARCHAR(36)  NOT NULL,
  user_id       VARCHAR(36),
  type          ENUM('SALE','PURCHASE','ADJUSTMENT','DAMAGE','RETURN_IN','RETURN_OUT','TRANSFER') NOT NULL,
  quantity      INT          NOT NULL,
  reason        TEXT,
  reference     VARCHAR(100),
  balanceBefore INT          DEFAULT 0,
  balanceAfter  INT          DEFAULT 0,
  createdAt     DATETIME     DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(product_id)
);
`;

export const SALES_SCHEMA = `
CREATE TABLE IF NOT EXISTS customers (
  customer_id   VARCHAR(36)   PRIMARY KEY,
  name          VARCHAR(100)  NOT NULL,
  email         VARCHAR(100),
  phone         VARCHAR(20),
  address       TEXT,
  city          VARCHAR(50),
  gstin         VARCHAR(20),
  notes         TEXT,
  totalSpent    DECIMAL(12,2) DEFAULT 0,
  loyaltyPoints INT           DEFAULT 0,
  isActive      BOOL          DEFAULT TRUE,
  createdAt     DATETIME      DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS transactions (
  transaction_id  VARCHAR(36)   PRIMARY KEY,
  invoiceNumber   VARCHAR(50)   UNIQUE NOT NULL,
  customer_id     VARCHAR(36),
  user_id         VARCHAR(36)   NOT NULL,
  paymentMethod   ENUM('CASH','UPI','CARD','CREDIT','OTHER') DEFAULT 'CASH',
  paymentStatus   ENUM('PAID','PARTIAL','UNPAID','REFUNDED')  DEFAULT 'PAID',
  subtotal        DECIMAL(12,2) DEFAULT 0,
  discountType    ENUM('PERCENT','FIXED'),
  discountValue   DECIMAL(10,2) DEFAULT 0,
  discountAmount  DECIMAL(10,2) DEFAULT 0,
  taxAmount       DECIMAL(10,2) DEFAULT 0,
  roundOff        DECIMAL(5,2)  DEFAULT 0,
  totalAmount     DECIMAL(12,2) NOT NULL,
  amountPaid      DECIMAL(12,2) DEFAULT 0,
  changeGiven     DECIMAL(10,2) DEFAULT 0,
  notes           TEXT,
  status          ENUM('COMPLETED','RETURNED','CANCELLED') DEFAULT 'COMPLETED',
  returnReason    TEXT,
  createdAt       DATETIME      DEFAULT CURRENT_TIMESTAMP,
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
  discountAmount DECIMAL(10,2) DEFAULT 0,
  totalAmount    DECIMAL(12,2) NOT NULL,
  FOREIGN KEY (transaction_id) REFERENCES transactions(transaction_id)
);

CREATE TABLE IF NOT EXISTS payments (
  payment_id     VARCHAR(36)   PRIMARY KEY,
  transaction_id VARCHAR(36)   NOT NULL,
  method         VARCHAR(20)   NOT NULL,
  amount         DECIMAL(10,2) NOT NULL,
  reference      VARCHAR(100),
  createdAt      DATETIME      DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (transaction_id) REFERENCES transactions(transaction_id)
);
`;

export const PROCUREMENT_SCHEMA = `
CREATE TABLE IF NOT EXISTS suppliers (
  supplier_id   VARCHAR(36)  PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  contactPerson VARCHAR(100),
  email         VARCHAR(100),
  phone         VARCHAR(20)  NOT NULL,
  address       TEXT,
  city          VARCHAR(50),
  state         VARCHAR(50),
  pincode       VARCHAR(10),
  gstin         VARCHAR(20),
  bankName      VARCHAR(100),
  bankAccount   VARCHAR(50),
  ifscCode      VARCHAR(20),
  paymentTerms  VARCHAR(50)  DEFAULT '30 days',
  notes         TEXT,
  isActive      BOOL         DEFAULT TRUE,
  createdAt     DATETIME     DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS purchase_orders (
  po_id         VARCHAR(36)   PRIMARY KEY,
  poNumber      VARCHAR(50)   UNIQUE NOT NULL,
  supplier_id   VARCHAR(36),
  user_id       VARCHAR(36),
  status        ENUM('PENDING','ORDERED','PARTIAL','RECEIVED','CANCELLED') DEFAULT 'PENDING',
  subtotal      DECIMAL(12,2) DEFAULT 0,
  taxAmount     DECIMAL(10,2) DEFAULT 0,
  totalAmount   DECIMAL(12,2) DEFAULT 0,
  expectedDate  DATE,
  receivedDate  DATE,
  notes         TEXT,
  createdAt     DATETIME      DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(supplier_id)
);

CREATE TABLE IF NOT EXISTS purchase_order_items (
  po_item_id    VARCHAR(36)   PRIMARY KEY,
  po_id         VARCHAR(36)   NOT NULL,
  product_id    VARCHAR(36),
  productName   VARCHAR(200)  NOT NULL,
  quantity      INT           NOT NULL,
  receivedQty   INT           DEFAULT 0,
  costPrice     DECIMAL(10,2) NOT NULL,
  taxRate       DECIMAL(5,2)  DEFAULT 0,
  taxAmount     DECIMAL(10,2) DEFAULT 0,
  totalAmount   DECIMAL(12,2) NOT NULL,
  FOREIGN KEY (po_id) REFERENCES purchase_orders(po_id)
);
`;

export const MANUFACTURING_SCHEMA = `
CREATE TABLE IF NOT EXISTS bom (
  bom_id          VARCHAR(36)   PRIMARY KEY,
  product_id      VARCHAR(36)   NOT NULL COMMENT 'Finished/WIP product',
  component_id    VARCHAR(36)   NOT NULL COMMENT 'Raw material or component needed',
  quantity_needed DECIMAL(10,3) NOT NULL,
  unit            VARCHAR(20),
  notes           TEXT,
  createdAt       DATETIME      DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id)   REFERENCES products(product_id),
  FOREIGN KEY (component_id) REFERENCES products(product_id)
);
`;

export const SHOP_TYPE_SCHEMAS = {
  general_store:  ['CORE', 'SALES', 'PROCUREMENT', 'STOCK'],
  electronics:    ['CORE', 'SALES', 'PROCUREMENT', 'STOCK'],
  textile:        ['CORE', 'SALES', 'PROCUREMENT', 'STOCK', 'MANUFACTURING'],
  pharmacy:       ['CORE', 'SALES', 'PROCUREMENT'],
  restaurant:     ['CORE', 'SALES', 'PROCUREMENT'],
  manufacturing:  ['CORE', 'SALES', 'PROCUREMENT', 'STOCK', 'MANUFACTURING'],
  hardware:       ['CORE', 'SALES', 'PROCUREMENT', 'STOCK'],
  auto_parts:     ['CORE', 'SALES', 'PROCUREMENT', 'STOCK'],
  stationery:     ['CORE', 'SALES', 'PROCUREMENT'],
  jewellery:      ['CORE', 'SALES', 'PROCUREMENT', 'MANUFACTURING'],
  warehouse:      ['CORE', 'PROCUREMENT', 'STOCK'],
  other:          ['CORE', 'SALES', 'PROCUREMENT'],
};