import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function migrate() {
    const dbName = 'supplier_9ed4e45d6be84d39';
    console.log(`🚀 Starting ESM migration for ${dbName}...`);

    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: dbName
    });

    try {
        console.log('📝 Adding missing columns to transactions table...');
        
        const columns = [
            { name: 'discountType', definition: "ENUM('PERCENT','FIXED') AFTER subtotal" },
            { name: 'discountValue', definition: "DECIMAL(10,2) DEFAULT 0 AFTER discountType" },
            { name: 'discountAmount', definition: "DECIMAL(10,2) DEFAULT 0 AFTER discountValue" },
            { name: 'roundOff', definition: "DECIMAL(5,2) DEFAULT 0 AFTER taxAmount" },
            { name: 'changeGiven', definition: "DECIMAL(10,2) DEFAULT 0 AFTER amountPaid" }
        ];

        for (const col of columns) {
            try {
                await connection.execute(`ALTER TABLE transactions ADD COLUMN ${col.name} ${col.definition}`);
                console.log(`✅ Added column: ${col.name}`);
            } catch (err) {
                if (err.code === 'ER_DUP_COLUMN_NAME') {
                    console.log(`ℹ️ Column ${col.name} already exists, skipping.`);
                } else {
                    throw err;
                }
            }
        }

        console.log('🎉 Migration completed successfully!');
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
    } finally {
        await connection.end();
        process.exit(0);
    }
}

migrate();
