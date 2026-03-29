import mysql from 'mysql2/promise';
import 'dotenv/config';

async function fixPrices() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: 'stocksense_master'
  });

  try {
    const [rows] = await conn.execute("SELECT * FROM supplier_products");
    console.log("Current Products:", rows.map(r => ({ name: r.name, price: r.price })));
    
    // Fix rows where price is NULL or 0
    await conn.execute("UPDATE supplier_products SET price = 12500.00 WHERE sku = 'PUMP-X'");
    await conn.execute("UPDATE supplier_products SET price = 450.00 WHERE sku = 'VAL-A1'");
    await conn.execute("UPDATE supplier_products SET price = 85.00 WHERE sku = 'PIPE-01'");
    
    console.log("✅ Prices updated to valid numbers.");
  } catch (err) {
    console.error(err);
  } finally {
    await conn.end();
  }
}
fixPrices();
