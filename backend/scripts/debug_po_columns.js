import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

async function debugPO() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: 'shop_test', // Assuming this is the test shop
  });

  try {
    console.log("--- Columns in purchase_orders ---");
    const [cols] = await conn.execute("SHOW COLUMNS FROM purchase_orders");
    console.table(cols);

    console.log("\n--- Recent Received Orders ---");
    const [rows] = await conn.execute(
      "SELECT po_id, poNumber, status, createdAt, receivedDate FROM purchase_orders WHERE status IN ('RECEIVED', 'PARTIAL') LIMIT 5"
    );
    console.table(rows);
  } catch (err) {
    console.error(err);
  } finally {
    await conn.end();
  }
}

debugPO();
