import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function fix() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 3306
  });

  try {
    const [dbs] = await conn.query("SHOW DATABASES LIKE 'supplier_%'");
    for (let dbObj of dbs) {
      const dbName = Object.values(dbObj)[0];
      console.log('Fixing:', dbName);
      await conn.query(`USE \`${dbName}\``);
      
      await conn.query(`
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
      `);
      console.log('shop_profile created in', dbName);
      
      // also create transaction/transaction_items to prevent /api/dashboard 500
      await conn.query(`
        CREATE TABLE IF NOT EXISTS transactions (
          transaction_id VARCHAR(36) PRIMARY KEY,
          invoiceNumber  VARCHAR(50),
          customer_id    VARCHAR(36),
          user_id        VARCHAR(36),
          status         VARCHAR(50),
          paymentMethod  VARCHAR(50),
          totalAmount    DECIMAL(12,2),
          taxAmount      DECIMAL(12,2),
          createdAt      DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);
      await conn.query(`
        CREATE TABLE IF NOT EXISTS transaction_items (
          item_id VARCHAR(36) PRIMARY KEY,
          transaction_id VARCHAR(36),
          product_id VARCHAR(36),
          productName VARCHAR(200),
          quantity INT,
          totalAmount DECIMAL(12,2)
        );
      `);
      console.log('Dashboard tables fixed in', dbName);
    }
  } catch(e) {
    console.error(e);
  } finally {
    await conn.end();
  }
}

fix();
