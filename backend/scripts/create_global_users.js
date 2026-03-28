import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function createGlobalUsers() {
  const master = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.MASTER_DB_NAME || 'stocksense_master',
    port: process.env.DB_PORT || 3306
  });

  try {
    await master.query(`
      CREATE TABLE IF NOT EXISTS global_users (
        email VARCHAR(100) PRIMARY KEY,
        db_name VARCHAR(80) NOT NULL,
        user_type ENUM('shop', 'supplier') NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log("global_users table created!");

    // Also let's backfill it by scanning all tenants for ANY users (including owners)
    const [dbs] = await master.query("SHOW DATABASES LIKE 'stocksense_tenant_%'");
    const [supplierDbs] = await master.query("SHOW DATABASES LIKE 'supplier_%'");
    const allDbs = [...dbs, ...supplierDbs].map(d => Object.values(d)[0]);

    for (let dbName of allDbs) {
      const type = dbName.startsWith('supplier_') ? 'supplier' : 'shop';
      try {
        const [users] = await master.query(`SELECT email FROM \`${dbName}\`.users`);
        for (let u of users) {
          if (u.email) {
            await master.query(
              `INSERT IGNORE INTO global_users (email, db_name, user_type) VALUES (?, ?, ?)`,
              [u.email, dbName, type]
            );
            console.log(`Routed ${u.email} -> ${dbName}`);
          }
        }
      } catch(e) {}
    }
    console.log("Backfill complete!");
  } catch(e) {
    console.error(e);
  } finally {
    await master.end();
  }
}
createGlobalUsers();
