import mysql from 'mysql2/promise';
import 'dotenv/config';

async function check() {
  const conn = await mysql.createConnection({
    host:     process.env.DB_HOST,
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.MASTER_DB_NAME,
  });

  try {
    const [profiles] = await conn.query('SELECT entity_id, business_name, entity_type FROM profiles');
    const [tenants] = await conn.query('SELECT db_name FROM tenants');
    const [suppliers] = await conn.query('SELECT db_name FROM suppliers');

    const validIds = new Set([...tenants.map(t => t.db_name), ...suppliers.map(s => s.db_name)]);
    
    console.log("Profiles in DB:", profiles.length);
    for (const p of profiles) {
      const isValid = validIds.has(p.entity_id);
      console.log(`- [${p.entity_type}] ${p.business_name} (${p.entity_id}) -> ${isValid ? 'VALID' : 'GHOST'}`);
    }

  } finally {
    await conn.end();
  }
}
check();
