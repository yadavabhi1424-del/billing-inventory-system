import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function debug() {
  const masterPool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: 'stocksense_master',
    port: process.env.DB_PORT || 3306,
  });

  try {
    console.log("Looking for ALL b2b_orders...");
    const [orders] = await masterPool.execute("SELECT order_id, shop_id, supplier_id, status, total_amount, createdAt FROM b2b_orders");
    console.table(orders);

    if (orders.length > 0) {
      const firstShopId = orders[0].shop_id;
      console.log(`\nChecking profile for first shop_id: ${firstShopId}`);
      const [prof] = await masterPool.execute("SELECT * FROM profiles WHERE entity_id = ?", [firstShopId]);
      console.table(prof);
    }

    console.log("\nChecking suppliers mapping...");
    const [sups] = await masterPool.execute("SELECT supplier_id, db_name FROM suppliers");
    console.table(sups);

  } catch (err) {
    console.error(err);
  } finally {
    await masterPool.end();
  }
}

debug();
