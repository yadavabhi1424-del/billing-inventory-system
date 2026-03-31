import mysql from 'mysql2/promise';
import 'dotenv/config';

async function migrate() {
  const masterConn = await mysql.createConnection({
    host:     process.env.DB_HOST,
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.MASTER_DB_NAME,
  });

  try {
    const [dbs] = await masterConn.query('SELECT db_name FROM suppliers UNION SELECT db_name FROM tenants');
    console.log(`Adding slug column and syncing data for ${dbs.length} databases...`);

    for (const { db_name } of dbs) {
      const conn = await mysql.createConnection({
        host:     process.env.DB_HOST,
        user:     process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: db_name,
      });

      try {
        // 1. Add slug column to customers
        const [custCols] = await conn.query("SHOW COLUMNS FROM customers LIKE 'slug'");
        if (custCols.length === 0) {
          await conn.query("ALTER TABLE customers ADD COLUMN slug VARCHAR(100) AFTER name");
          console.log(`✅ Added customers.slug to ${db_name}`);
        }

        // 2. Add slug column to suppliers
        const [supCols] = await conn.query("SHOW COLUMNS FROM suppliers LIKE 'slug'");
        if (supCols.length === 0) {
          await conn.query("ALTER TABLE suppliers ADD COLUMN slug VARCHAR(100) AFTER name");
          console.log(`✅ Added suppliers.slug to ${db_name}`);
        }

        // 3. Sync Slugs from Master Profiles/Tenants
        // For customers (Shop ID is the ID)
        const [customers] = await conn.query("SELECT customer_id FROM customers WHERE slug IS NULL OR slug = ''");
        for (const c of customers) {
            const [p] = await masterConn.query("SELECT slug FROM profiles WHERE entity_id = ?", [c.customer_id]);
            if (p.length > 0) {
                await conn.query("UPDATE customers SET slug = ? WHERE customer_id = ?", [p[0].slug, c.customer_id]);
            }
        }

        // For suppliers (Supplier ID is the ID)
        const [suppliers] = await conn.query("SELECT supplier_id FROM suppliers WHERE slug IS NULL OR slug = ''");
        for (const s of suppliers) {
            const [p] = await masterConn.query("SELECT slug FROM profiles WHERE entity_id = ?", [s.supplier_id]);
            if (p.length > 0) {
                await conn.query("UPDATE suppliers SET slug = ? WHERE supplier_id = ?", [p[0].slug, s.supplier_id]);
            }
        }
        
      } catch (e) {
        console.warn(`⚠️ Skipped ${db_name}: ${e.message}`);
      } finally {
        await conn.end();
      }
    }
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
  } finally {
    await masterConn.end();
  }
}

migrate();
