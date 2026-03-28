import "dotenv/config";
import app                       from "./app.js";
import { connectDB }             from "./config/database.js";
import { verifyEmailConnection } from "./config/email.js";
import { seedMasterData, masterPool } from "./config/masterDatabase.js";
import mysql from "mysql2/promise";


const PORT = process.env.PORT || 5000;

// ── Auto-migrate all existing tenant DBs ──────────────────────
async function runTenantMigrations() {
  try {
    const [tenants] = await masterPool.execute(
      "SELECT db_name FROM tenants WHERE status != 'SUSPENDED'"
    );
    const [suppliers] = await masterPool.execute(
      "SELECT db_name FROM suppliers WHERE status != 'SUSPENDED'"
    );

    // Default DB where pending users are staged, plus all tenants and suppliers
    const allDbs = [{ db_name: process.env.DB_NAME }, ...tenants, ...suppliers];

    const conn = await mysql.createConnection({
      host:               process.env.DB_HOST,
      user:               process.env.DB_USER,
      password:           process.env.DB_PASSWORD,
      port:               process.env.DB_PORT || 3306,
      multipleStatements: true,
    });

    for (const { db_name } of allDbs) {
      if (!db_name) continue;
      try {
        await conn.query(`USE \`${db_name}\``);
        // Create email_otps if not exists
        await conn.query(`
          CREATE TABLE IF NOT EXISTS email_otps (
            id        VARCHAR(36) PRIMARY KEY,
            user_id   VARCHAR(36) NOT NULL,
            code      CHAR(6) NOT NULL,
            expiry    DATETIME NOT NULL,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
          )
        `);
        // Add provider column if missing
        await conn.query(`
          ALTER TABLE users
            MODIFY COLUMN password VARCHAR(255) NULL,
            ADD COLUMN IF NOT EXISTS provider ENUM('local','google') DEFAULT 'local' AFTER password
        `).catch(() => {});

        // Update status ENUM to include DELETED
        await conn.query(`
          ALTER TABLE users 
          MODIFY COLUMN status ENUM('PENDING','APPROVED','REJECTED','DELETED') DEFAULT 'PENDING'
        `).catch(() => {});

        console.log(`  ✅ Migration OK: ${db_name}`);
      } catch (e) {
        console.warn(`  ⚠️  Migration skipped for ${db_name}: ${e.message}`);
      }
    }
    await conn.end();
    console.log("🔄 All migrations complete (Tenants & Suppliers).");
  } catch (err) {
    console.warn("⚠️  Migrations failed (non-fatal):", err.message);
  }
}

async function startServer() {
  try {
    await connectDB();
    await verifyEmailConnection();
    await seedMasterData();
    await runTenantMigrations();

    app.listen(PORT, () => {
      console.log("\n🚀 ──────────────────────────────────────────");
      console.log("   StockSense Pro Backend is running!");
      console.log(`   Server  : http://localhost:${PORT}`);
      console.log(`   API     : http://localhost:${PORT}/api`);
      console.log(`   Health  : http://localhost:${PORT}/api/health`);
      console.log(`   Env     : ${process.env.NODE_ENV}`);
      console.log("─────────────────────────────────────────────\n");
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error.message);
    process.exit(1);
  }
}

startServer();

process.on("SIGTERM", () => {
  console.log("Server shutting down...");
  process.exit(0);
});

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Promise Rejection:", reason);
});