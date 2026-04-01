import mysql from 'mysql2/promise';
import 'dotenv/config';

async function fix() {
  const conn = await mysql.createConnection({
    host:     process.env.DB_HOST,
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.MASTER_DB_NAME
  });

  try {
    console.log("Aligning profiles with supplier UUIDs...");
    // Update profiles to use supplier_id UUID instead of db_name where they match
    const query = `
      UPDATE profiles p
      JOIN suppliers s ON p.entity_id = s.db_name
      SET p.entity_id = s.supplier_id
      WHERE p.entity_type = 'supplier'
    `;
    const [result] = await conn.execute(query);
    console.log(`Successfully updated ${result.affectedRows} profiles.`);
  } finally {
    await conn.end();
  }
}

fix().catch(console.error);
