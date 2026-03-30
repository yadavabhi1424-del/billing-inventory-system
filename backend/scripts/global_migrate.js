import mysql from 'mysql2/promise';
import 'dotenv/config';

async function globalMigration() {
  const conn = await mysql.createConnection({
    host:     process.env.DB_HOST,
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    multipleStatements: true
  });

  try {
    const [dbs] = await conn.query('SHOW DATABASES');
    console.log(`Found ${dbs.length} total databases.`);
    
    for (const row of dbs) {
      const dbName = row.Database;
      if (['information_schema', 'performance_schema', 'mysql', 'sys'].includes(dbName)) continue;

      console.log(`Checking database: ${dbName}`);
      try {
        await conn.query(`USE \`${dbName}\``);
        const [tables] = await conn.query("SHOW TABLES LIKE 'shop_profile'");
        
        if (tables.length > 0) {
          console.log(`  Found shop_profile in ${dbName}. Updating columns...`);
          // Adding all missing columns one by one to avoid errors if some already exist
          const columnsToAdd = [
            "ADD COLUMN latitude DECIMAL(10, 8)",
            "ADD COLUMN longitude DECIMAL(11, 8)",
            "ADD COLUMN city VARCHAR(100)",
            "ADD COLUMN state VARCHAR(100)",
            "ADD COLUMN pincode VARCHAR(20)"
          ];
          
          for (const col of columnsToAdd) {
            try {
              await conn.query(`ALTER TABLE shop_profile ${col}`);
              console.log(`    Successfully Added: ${col}`);
            } catch (e) {
              if (e.code === 'ER_DUP_FIELDNAME') {
                  // Ignore
              } else {
                  console.error(`    Error adding ${col.split(' ')[2]}:`, e.message);
              }
            }
          }
        }
        
        const [prodTables] = await conn.query("SHOW TABLES LIKE 'products'");
        if (prodTables.length > 0) {
            console.log(`  Found products in ${dbName}. Ensuring is_public...`);
            try {
                await conn.query("ALTER TABLE products ADD COLUMN is_public BOOL DEFAULT FALSE");
                console.log(`    Successfully added is_public to products.`);
            } catch (e) {
                if (e.code !== 'ER_DUP_FIELDNAME' && !e.message.includes('Duplicate column name')) {
                     console.error(`    Error adding is_public to ${dbName}.products:`, e.message);
                }
            }
        }
        
        // Also check profiles table in master DB
        const [pTables] = await conn.query("SHOW TABLES LIKE 'profiles'");
        if (pTables.length > 0) {
             console.log(`  Found profiles in ${dbName}. Ensuring coordinates and address fields...`);
             const pCols = [
                 "ADD COLUMN latitude DECIMAL(10, 8)",
                 "ADD COLUMN longitude DECIMAL(11, 8)",
                 "ADD COLUMN address TEXT",
                 "ADD COLUMN city VARCHAR(100)",
                 "ADD COLUMN state VARCHAR(100)",
                 "ADD COLUMN pincode VARCHAR(20)"
             ];
             for (const col of pCols) {
                try {
                  await conn.query(`ALTER TABLE profiles ${col}`);
                } catch (e) {
                  if (e.code !== 'ER_DUP_FIELDNAME') console.error(`    Error updating profiles ${col}:`, e.code);
                }
             }
        }

      } catch (err) {
        console.error(`  Access Error for ${dbName}:`, err.message);
      }
    }
    console.log("Global migration completed.");
  } finally {
    await conn.end();
  }
}

globalMigration().catch(console.error);
