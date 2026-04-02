import mysql from 'mysql2/promise';
import 'dotenv/config';

async function verify() {
  const connection = await mysql.createConnection({
    host:     process.env.DB_HOST,
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: 'inventory'
  });

  try {
    const start = '2020-01-01 00:00:00';
    const end = '2030-12-31 23:59:59';
    const [sall] = await connection.execute('SELECT * FROM suppliers');
    console.log('All Suppliers:', sall);
    const [pall] = await connection.execute('SELECT * FROM products');
    console.log('All Products:', pall);

    const [rows] = await connection.execute(
      `SELECT s.supplier_id, s.name, s.isActive,
              (SELECT COUNT(*) FROM products WHERE supplier_id = s.supplier_id) as productCount,
              (SELECT COUNT(*) FROM purchase_orders WHERE supplier_id = s.supplier_id AND createdAt BETWEEN ? AND ?) as totalOrders,
              (SELECT COALESCE(SUM(totalAmount), 0) FROM purchase_orders WHERE supplier_id = s.supplier_id AND createdAt BETWEEN ? AND ?) as totalPurchased
       FROM suppliers s
       WHERE s.isActive = TRUE
       ORDER BY totalPurchased DESC`,
      [start, end, start, end]
    );

    console.log('Verification Rows:', JSON.stringify(rows, null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    await connection.end();
  }
}

verify();
