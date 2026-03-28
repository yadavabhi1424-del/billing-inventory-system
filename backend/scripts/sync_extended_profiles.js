import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
dotenv.config();

async function syncAll() {
  const master = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.MASTER_DB_NAME || 'stocksense_master',
    port: process.env.DB_PORT || 3306
  });

  try {
    // 1. Alter profiles table
    try { await master.query("ALTER TABLE profiles ADD COLUMN address TEXT"); } catch(e) {}
    try { await master.query("ALTER TABLE profiles ADD COLUMN email VARCHAR(100)"); } catch(e) {}
    try { await master.query("ALTER TABLE profiles ADD COLUMN phone VARCHAR(20)"); } catch(e) {}
    
    // 2. Backfill loop
    const [dbs] = await master.query("SHOW DATABASES LIKE 'stocksense_tenant_%'");
    const [supplierDbs] = await master.query("SHOW DATABASES LIKE 'supplier_%'");
    const allDbs = [...dbs, ...supplierDbs].map(d => Object.values(d)[0]);

    for (let dbName of allDbs) {
      try {
        const [rows] = await master.query(`SELECT * FROM \`${dbName}\`.shop_profile LIMIT 1`);
        const [users] = await master.query(`SELECT email, phone FROM \`${dbName}\`.users WHERE role='owner' LIMIT 1`);
        
        if (rows.length > 0) {
          const shop = rows[0];
          const type = dbName.startsWith('supplier_') ? 'supplier' : 'shop';
          const slug = (shop.shop_name || 'shop').toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 40) + '_' + dbName.slice(-6);
          const email = users.length ? users[0].email : null;
          const phone = users.length ? users[0].phone : null;
          
          await master.query(
            `INSERT INTO profiles
               (profile_id, entity_id, entity_type, business_name, slug, description, address,
                business_type, is_public, email, phone)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
             ON DUPLICATE KEY UPDATE 
               business_name = VALUES(business_name),
               address = VALUES(address),
               email = VALUES(email),
               phone = VALUES(phone)`,
            [uuidv4(), dbName, type, shop.shop_name, slug, shop.shop_description || null, shop.address || null, shop.shop_type || 'general', email, phone]
          );
          console.log(`Synced ${dbName} context data!`);
        }
      } catch (e) {
        console.error("Error on", dbName, e.message);
      }
    }
  } catch(e) {
    console.error(e);
  } finally {
    await master.end();
  }
}
syncAll();
