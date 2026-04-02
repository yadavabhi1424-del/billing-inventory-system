import mysql from 'mysql2/promise';
import 'dotenv/config';

async function checkData() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  try {
    const [suppliers] = await connection.execute('SELECT * FROM suppliers');
    console.log('Suppliers:', JSON.stringify(suppliers, null, 2));

    const [products] = await connection.execute('SELECT * FROM products');
    console.log('Products:', JSON.stringify(products, null, 2));

    const [pos] = await connection.execute('SELECT * FROM purchase_orders');
    console.log('Purchase Orders:', JSON.stringify(pos, null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    await connection.end();
  }
}

checkData();
