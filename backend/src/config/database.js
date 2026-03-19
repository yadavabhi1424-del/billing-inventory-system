import mysql from "mysql2/promise";
import "dotenv/config";

const pool = mysql.createPool({
  host:               process.env.DB_HOST,
  user:               process.env.DB_USER,
  password:           process.env.DB_PASSWORD,
  database:           process.env.DB_NAME,
  port:               process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0,
  timezone:           "+05:30",
});

async function connectDB() {
  try {
    const connection = await pool.getConnection();
    console.log("✅ MySQL connected successfully");
    console.log(`   Database : ${process.env.DB_NAME}`);
    console.log(`   Host     : ${process.env.DB_HOST}`);
    connection.release();
  } catch (error) {
    console.error("❌ MySQL connection failed:", error.message);
    throw error;
  }
}

export { pool, connectDB };