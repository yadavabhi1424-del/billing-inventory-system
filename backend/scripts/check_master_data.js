import mysql from 'mysql2/promise';
import 'dotenv/config';

async function checkMasterData() {
  const connection = await mysql.createConnection({
    host:     process.env.DB_HOST,
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: 'stocksense_master'
  });

  try {
    const [tenants] = await connection.execute('SELECT tenant_id, db_name, shop_slug FROM tenants');
    console.log('Tenants:', JSON.stringify(tenants, null, 2));

    const [b2bOrders] = await connection.execute('SELECT * FROM b2b_orders');
    console.log('All B2B Orders:', JSON.stringify(b2bOrders, null, 2));

    const [sups] = await connection.execute('SELECT supplier_id, business_name, slug FROM suppliers');
    console.log('Network Suppliers:', JSON.stringify(sups, null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    await connection.end();
  }
}

checkMasterData();
