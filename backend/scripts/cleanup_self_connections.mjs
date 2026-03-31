import mysql from 'mysql2/promise';
import 'dotenv/config';

async function cleanup() {
  const masterConn = await mysql.createConnection({
    host:     process.env.DB_HOST,
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.MASTER_DB_NAME,
  });

  try {
    console.log("Starting Self-Connection Cleanup...");

    // 1. Remove from Master map
    const [delMap] = await masterConn.query("DELETE FROM shop_supplier_map WHERE shop_id = supplier_id");
    console.log(`✅ Removed ${delMap.affectedRows} self-connections from master map.`);

    // 2. Fetch all tenant databases
    const [dbs] = await masterConn.query('SELECT db_name FROM suppliers UNION SELECT db_name FROM tenants');
    
    for (const { db_name } of dbs) {
      const conn = await mysql.createConnection({
        host:     process.env.DB_HOST,
        user:     process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: db_name,
      });

      try {
        // Remove self from local Customers table (if you are a supplier)
        const [delCust] = await conn.query("DELETE FROM customers WHERE customer_id = ?", [db_name]);
        if (delCust.affectedRows > 0) console.log(`✅ Removed self-customer from ${db_name}`);

        // Remove self from local Suppliers table (if you are a shop)
        const [delSup] = await conn.query("DELETE FROM suppliers WHERE supplier_id = ?", [db_name]);
        if (delSup.affectedRows > 0) console.log(`✅ Removed self-supplier from ${db_name}`);

      } catch (e) {
        console.warn(`⚠️ Warning for ${db_name}: ${e.message}`);
      } finally {
        await conn.end();
      }
    }
  } catch (err) {
    console.error('❌ Cleanup failed:', err.message);
  } finally {
    await masterConn.end();
  }
}

cleanup();
