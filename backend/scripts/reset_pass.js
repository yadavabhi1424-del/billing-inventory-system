import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import 'dotenv/config';

async function resetPass() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: 'inventory'
  });

  try {
    const hashed = await bcrypt.hash('password123', 12);
    await conn.execute("UPDATE users SET password = ? WHERE email = ?", [hashed, 'abhinavsinghyadav1424@gmail.com']);
    console.log("✅ Password reset to password123");
  } catch (err) {
    console.error(err);
  } finally {
    await conn.end();
  }
}
resetPass();
