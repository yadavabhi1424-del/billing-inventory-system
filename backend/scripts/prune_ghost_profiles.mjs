import mysql from 'mysql2/promise';
import 'dotenv/config';

async function prune() {
  const masterConn = await mysql.createConnection({
    host:     process.env.DB_HOST,
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.MASTER_DB_NAME,
  });

  try {
    console.log("🚀 Starting Ghost Profile Pruning...");

    // 1. Fetch all active tenant and supplier IDs
    const [tenants] = await masterConn.query('SELECT db_name FROM tenants');
    const [suppliers] = await masterConn.query('SELECT db_name FROM suppliers');
    
    const activeIds = new Set([
      ...tenants.map(t => t.db_name),
      ...suppliers.map(s => s.db_name)
    ]);

    // 2. Fetch all existing profiles
    const [profiles] = await masterConn.query('SELECT profile_id, entity_id, business_name FROM profiles');
    
    let pruneCount = 0;
    for (const p of profiles) {
      if (!activeIds.has(p.entity_id)) {
        console.log(`🗑️ Pruning ghost: ${p.business_name} (${p.entity_id})`);
        await masterConn.query('DELETE FROM profiles WHERE profile_id = ?', [p.profile_id]);
        pruneCount++;
      }
    }

    console.log(`✅ Finished! Pruned ${pruneCount} ghost profile(s).`);

  } catch (err) {
    console.error('❌ Pruning failed:', err.message);
  } finally {
    await masterConn.end();
  }
}

prune();
