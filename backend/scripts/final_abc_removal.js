import mysql from 'mysql2/promise';
import 'dotenv/config';

async function finalClean() {
  const config = {
    host:     process.env.DB_HOST,
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  };

  try {
    const conn = await mysql.createConnection(config);

    // 1. Remove from Master Database
    console.log('Cleaning stocksense_master...');
    await conn.query('USE `stocksense_master`');
    const [mSups] = await conn.execute('SELECT supplier_id FROM suppliers WHERE business_name LIKE "%ABC%" OR slug LIKE "%abc_beverages%"');
    if (mSups.length > 0) {
      console.log(`Found ${mSups.length} records in Master.`);
      await conn.execute('DELETE FROM suppliers WHERE business_name LIKE "%ABC%" OR slug LIKE "%abc_beverages%"');
      console.log('Deleted from Master.');
    }

    // 2. Remove from Local Tenant Database
    console.log('Cleaning Tenant DB (b0dce2d6-b578-4bbd-9ed4-e4d39d4e15de)...');
    try {
      await conn.query('USE `b0dce2d6-b578-4bbd-9ed4-e4d39d4e15de`');
      const [lSups] = await conn.execute('SELECT supplier_id FROM suppliers WHERE name LIKE "%ABC%" OR slug LIKE "%abc%"');
      if (lSups.length > 0) {
        console.log(`Found ${lSups.length} records in Local DB.`);
        for (const s of lSups) {
          // Unlink POs first
          await conn.execute('UPDATE purchase_orders SET supplier_id = NULL WHERE supplier_id = ?', [s.supplier_id]);
          await conn.execute('DELETE FROM suppliers WHERE supplier_id = ?', [s.supplier_id]);
        }
        console.log('Deleted from Local DB and unlinked all orders.');
      }
    } catch (dbErr) {
      console.log('Tenant DB not found or error accessing it:', dbErr.message);
    }

    console.log('Success: ABC Beverages removed from everywhere.');
    await conn.end();

  } catch (err) {
    console.error('Final cleanup failed:', err);
  }
}

finalClean();
