import mysql from 'mysql2/promise';
import 'dotenv/config';

async function check() {
  const conn = await mysql.createConnection({
    host:     process.env.DB_HOST,
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.MASTER_DB_NAME
  });

  try {
    const [suppliers] = await conn.query('SELECT supplier_id, db_name FROM suppliers LIMIT 5');
    console.log('Suppliers (suppliers table):', JSON.stringify(suppliers, null, 2));

    const [profiles] = await conn.query('SELECT entity_id, entity_type FROM profiles LIMIT 5');
    console.log('Profiles (profiles table):', JSON.stringify(profiles, null, 2));

    const [products] = await conn.query('SELECT supplier_id, name, is_active FROM supplier_products LIMIT 5');
    console.log('Products (supplier_products table):', JSON.stringify(products, null, 2));
  } finally {
    await conn.end();
  }
}

check().catch(console.error);
