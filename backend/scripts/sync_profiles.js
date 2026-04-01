import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
dotenv.config();

async function sync() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 3306
  });

  try {
    const [dbs] = await conn.query("SHOW DATABASES LIKE 'stocksense_tenant_%'");
    const [supplierDbs] = await conn.query("SHOW DATABASES LIKE 'supplier_%'");
    const allDbs = [...dbs, ...supplierDbs].map(d => Object.values(d)[0]);

    await conn.query(`USE \`${process.env.MASTER_DB_NAME || 'stocksense_master'}\``);
    
    for (let dbName of allDbs) {
      try {
        const [rows] = await conn.query(`SELECT * FROM \`${dbName}\`.shop_profile LIMIT 1`);
        if (rows.length > 0) {
          const shop = rows[0];
          const type = dbName.startsWith('supplier_') ? 'supplier' : 'shop';
          let entityId = dbName;

          if (type === 'supplier') {
            const [supRows] = await conn.query("SELECT supplier_id FROM suppliers WHERE db_name = ?", [dbName]);
            if (supRows.length > 0) entityId = supRows[0].supplier_id;
          }

          const slug = (shop.shop_name || 'shop').toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 40) + '_' + dbName.slice(-6);
          
          await conn.query(
            `INSERT INTO profiles
               (profile_id, entity_id, entity_type, business_name, slug, description,
                business_type, is_public)
             VALUES (?, ?, ?, ?, ?, ?, ?, 1)
             ON DUPLICATE KEY UPDATE 
               business_name = VALUES(business_name),
               entity_id = VALUES(entity_id)`,
            [uuidv4(), entityId, type, shop.shop_name, slug, shop.shop_description || null, shop.shop_type || 'general']
          );
          console.log(`Synced ${dbName} (${shop.shop_name}) to master profiles!`);
        }
      } catch (e) {
        // ignore missing tables
      }
    }
  } catch(e) {
    console.error(e);
  } finally {
    await conn.end();
  }
}
sync();
