import mysql from 'mysql2/promise';
import 'dotenv/config';

async function verifyUser() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: 'inventory'
  });

  try {
    const email = 'abhinavsinghyadav1424@gmail.com';
    await conn.execute("UPDATE users SET emailVerified = TRUE, status = 'APPROVED', isActive = TRUE WHERE email = ?", [email]);
    console.log(`✅ User ${email} is now verified and approved.`);
  } catch (err) {
    console.error(err);
  } finally {
    await conn.end();
  }
}
verifyUser();
