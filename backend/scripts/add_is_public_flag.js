import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function backfillPublicFlag() {
  const master = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.MASTER_DB_NAME || 'stocksense_master',
    port: process.env.DB_PORT || 3306
  });

  try {
    const [dbs] = await master.query("SHOW DATABASES LIKE 'stocksense_tenant_%'");
    const [supplierDbs] = await master.query("SHOW DATABASES LIKE 'supplier_%'");
    const allDbs = [...dbs, ...supplierDbs].map(d => Object.values(d)[0]);

    for (let dbName of allDbs) {
      try {
        await master.query(`ALTER TABLE \`${dbName}\`.products ADD COLUMN is_public BOOL DEFAULT FALSE`);
        console.log(`Added is_public to ${dbName}.products`);
      } catch (e) {
        if (e.code === 'ER_DUP_FIELDNAME') {
          console.log(`${dbName}.products already has is_public`);
        } else {
          console.error("Error on", dbName, e.message);
        }
      }
    }
  } catch(e) {
    console.error(e);
  } finally {
    await master.end();
  }
}
backfillPublicFlag();
