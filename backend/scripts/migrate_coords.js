import { masterPool } from "../src/config/masterDatabase.js";
import mysql from "mysql2/promise";
import "dotenv/config";

async function migrate() {
  try {
    const [tenants] = await masterPool.execute("SELECT db_name FROM suppliers");
    console.log(`Found ${tenants.length} tenants.`);

    for (const tenant of tenants) {
      console.log(`Checking tenant: ${tenant.db_name}`);
      const db = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: tenant.db_name,
      });

      try {
        const [columns] = await db.execute("SHOW COLUMNS FROM shop_profile LIKE 'latitude'");
        if (columns.length === 0) {
          console.log(`  Adding coordinates to ${tenant.db_name}...`);
          await db.execute("ALTER TABLE shop_profile ADD COLUMN latitude DECIMAL(10, 8), ADD COLUMN longitude DECIMAL(11, 8)");
        } else {
          console.log(`  Coordinates already exist in ${tenant.db_name}.`);
        }
      } catch (err) {
        console.error(`  Error migrating ${tenant.db_name}:`, err.message);
      } finally {
        await db.end();
      }
    }

    console.log("Migration finished.");
    process.exit(0);
  } catch (err) {
    console.error("Migration failed:", err.message);
    process.exit(1);
  }
}

migrate();
