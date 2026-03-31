import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve('.env') });

const dbName = 'supplier_9ed4e45d6be84d39';

async function fix() {
  const conn = await mysql.createConnection({
    host:     process.env.DB_HOST,
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port:     process.env.DB_PORT || 3306,
  });

  try {
    console.log(`Using database: ${dbName}`);
    await conn.query(`USE \`${dbName}\``);

    console.log('Creating categories table...');
    await conn.query(`
      CREATE TABLE IF NOT EXISTS categories (
        category_id   VARCHAR(36)  PRIMARY KEY,
        name          VARCHAR(100) NOT NULL,
        description   TEXT,
        color         VARCHAR(20)  DEFAULT '#6366f1',
        icon          VARCHAR(50),
        isActive      BOOL         DEFAULT TRUE,
        createdAt     DATETIME     DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('Adding category_id column to products table...');
    // Check if column exists first
    const [columns] = await conn.query(`SHOW COLUMNS FROM products LIKE 'category_id'`);
    if (columns.length === 0) {
      await conn.query(`ALTER TABLE products ADD COLUMN category_id VARCHAR(36) AFTER description`);
      await conn.query(`ALTER TABLE products ADD CONSTRAINT fk_category FOREIGN KEY (category_id) REFERENCES categories(category_id)`);
      console.log('Column and constraint added.');
    } else {
      console.log('Column category_id already exists.');
    }

    console.log('Creating stock_movements table...');
    await conn.query(`
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
      )
    `);

    console.log('✅ Database fix complete.');
  } catch (err) {
    console.error('❌ Error applying fix:', err.message);
  } finally {
    await conn.end();
  }
}

fix();
