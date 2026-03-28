import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function check() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 3306
  });

  try {
    const [dbs] = await conn.query("SHOW DATABASES LIKE 'supplier_%'");
    console.log("Found supplier DBs:", dbs);

    for (let dbObj of dbs) {
      const dbName = Object.values(dbObj)[0];
      await conn.query(`USE \`${dbName}\``);
      const [tables] = await conn.query("SHOW TABLES");
      console.log(`\nTables in ${dbName}:`);
      console.log(tables.map(t => Object.values(t)[0]).join(', '));
      
      try {
        const [rows] = await conn.query("SELECT * FROM shop_profile");
        console.log("shop_profile data:", rows);
      } catch(e) {
        console.log("Error selecting from shop_profile:", e.message);
      }
    }
  } catch(e) {
    console.error(e);
  } finally {
    await conn.end();
  }
}

check();
