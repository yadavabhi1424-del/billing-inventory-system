import mysql from 'mysql2/promise';
import 'dotenv/config';

async function getUsers() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: 'inventory'
  });

  try {
    const [rows] = await conn.execute("SELECT email FROM users WHERE role='OWNER' LIMIT 1");
    console.log(JSON.stringify(rows));
  } catch (err) {
    console.error(err);
  } finally {
    await conn.end();
  }
}
getUsers();
