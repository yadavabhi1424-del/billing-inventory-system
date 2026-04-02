import mysql from 'mysql2/promise';
import 'dotenv/config';

async function investigate() {
  const connection = await mysql.createConnection({
    host:     process.env.DB_HOST,
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });

  try {
    const [dbs] = await connection.query('SHOW DATABASES');
    console.log('Databases:', dbs.map(d => d.Database));

    // Check inventory DB
    await connection.query('USE inventory');
    const [sups] = await connection.execute('SELECT supplier_id, name, isActive FROM suppliers');
    console.log('Suppliers in inventory:', sups);

    const [prods] = await connection.execute('SELECT product_id, name, supplier_id, isActive FROM products');
    console.log('Products in inventory:', prods);

    const [pos] = await connection.execute('SELECT po_id, supplier_id, totalAmount, createdAt FROM purchase_orders');
    console.log('POs in inventory:', pos);

  } catch (err) {
    console.error(err);
  } finally {
    await connection.end();
  }
}

investigate();
