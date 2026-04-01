import { masterPool } from '../src/config/masterDatabase.js';

async function migrate() {
  try {
    console.log('--- Database Migration Started ---');

    // 1. Add order_number to b2b_orders
    console.log('Adding order_number to b2b_orders...');
    await masterPool.execute(`
      ALTER TABLE b2b_orders 
      ADD COLUMN order_number INT AUTO_INCREMENT UNIQUE AFTER order_id
    `);

    // 2. Add owner_name to profiles
    console.log('Adding owner_name to profiles...');
    await masterPool.execute(`
      ALTER TABLE profiles 
      ADD COLUMN owner_name VARCHAR(100) AFTER business_name
    `);

    // 3. (Optional) Sync existing owner names if possible
    console.log('Syncing existing supplier owner names...');
    await masterPool.execute(`
      UPDATE profiles p
      JOIN suppliers s ON s.supplier_id = p.entity_id
      SET p.owner_name = s.owner_name
      WHERE p.entity_type = 'supplier'
    `);

    console.log('--- Migration Completed Successfully ---');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  }
}

migrate();
