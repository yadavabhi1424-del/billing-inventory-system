import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function check() {
  let c;
  try {
    c = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    });

    console.log("--- TENANTS SCHEMA (MASTER) ---");
    await c.query("USE stocksense_master");
    const [tCols] = await c.query("DESCRIBE tenants");
    console.table(tCols);

    console.log("\n--- B2B_ORDERS SCHEMA (MASTER) ---");
    const [oCols] = await c.query("DESCRIBE b2b_orders");
    console.table(oCols);

    const [dbs] = await c.query("SHOW DATABASES LIKE 'shop_%'");
    if (dbs.length > 0) {
      const db = dbs[0]['Database'] || dbs[0]['Database (shop_%)'];
      console.log(`\n--- ${db}.SUPPLIERS SCHEMA ---`);
      await c.query(`USE ${db}`);
      const [sCols] = await c.query("DESCRIBE suppliers");
      console.table(sCols);
    }

  } catch (e) {
    console.error(e);
  } finally {
    if (c) await c.end();
    process.exit();
  }
}

check();
