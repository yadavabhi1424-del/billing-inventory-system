import mysql from 'mysql2/promise';
import 'dotenv/config';
import { v4 as uuidv4 } from 'uuid';

async function seed() {
  const master = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.MASTER_DB_NAME || 'stocksense_master'
  });

  try {
    // 1. Find a supplier
    const [suppliers] = await master.execute("SELECT db_name FROM suppliers LIMIT 1");
    if (suppliers.length === 0) {
      console.log("No suppliers found. Please register one first.");
      return;
    }
    const { db_name } = suppliers[0];

    // 2. Add products to master.supplier_products
    const products = [
      { id: uuidv4(), prod_id: uuidv4(), name: 'Industrial Valve A1', sku: 'VAL-A1', price: 1500, unit: 'pcs' },
      { id: uuidv4(), prod_id: uuidv4(), name: 'Heavy Duty Pump X', sku: 'PUMP-X', price: 12000, unit: 'unit' },
      { id: uuidv4(), prod_id: uuidv4(), name: 'Steel Pipe 2inch', sku: 'PIPE-2', price: 450, unit: 'mtr' }
    ];

    for (const p of products) {
      await master.execute(
        `INSERT INTO supplier_products (id, supplier_id, product_id, name, sku, price, unit, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, TRUE)
         ON DUPLICATE KEY UPDATE name=VALUES(name)`,
        [p.id, db_name, p.prod_id, p.name, p.sku, p.price, p.unit]
      );
    }

    // 3. Ensure a connection exists for a shop to test
    const [shops] = await master.execute("SELECT db_name FROM tenants LIMIT 1");
    if (shops.length > 0) {
      const shopDb = shops[0].db_name;
      await master.execute(
        `INSERT IGNORE INTO shop_supplier_map (map_id, shop_id, supplier_id, status, initiated_by)
         VALUES (?, ?, ?, 'ACCEPTED', 'shop')`,
        [uuidv4(), shopDb, db_name]
      );
      console.log(`✅ Linked shop ${shopDb} with supplier ${db_name}`);
    }

    console.log(`✅ Seeded 3 products for supplier ${db_name}`);
  } catch (err) {
    console.error(err);
  } finally {
    await master.end();
  }
}

seed();
