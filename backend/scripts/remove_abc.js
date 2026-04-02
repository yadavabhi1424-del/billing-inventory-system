import mysql from 'mysql2/promise';
import 'dotenv/config';

async function removeAbc() {
  const config = {
    host:     process.env.DB_HOST,
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  };

  const masterConn = await mysql.createConnection({ ...config, database: 'stocksense_master' });
  const tenantConn = await mysql.createConnection({ ...config, database: 'b0dce2d6-b578-4bbd-9ed4-e4d39d4e15de' });

  try {
    console.log('Searching Master DB...');
    const [mSups] = await masterConn.execute('SELECT supplier_id, business_name FROM suppliers WHERE business_name LIKE "%ABC%" OR slug LIKE "%abc%"');
    if (mSups.length > 0) {
      console.log('Found in Master:', mSups);
      for (const s of mSups) {
        await masterConn.execute('DELETE FROM suppliers WHERE supplier_id = ?', [s.supplier_id]);
        console.log(`Deleted ${s.business_name} from Master.`);
      }
    } else {
      console.log('Not found in Master.');
    }

    console.log('Searching Tenant DB...');
    const [lSups] = await tenantConn.execute('SELECT supplier_id, name FROM suppliers WHERE name LIKE "%ABC%" OR slug LIKE "%abc%"');
    if (lSups.length > 0) {
      console.log('Found in Tenant:', lSups);
      for (const s of lSups) {
        // Check for dependencies in purchase_orders
        const [pos] = await tenantConn.execute('SELECT po_id FROM purchase_orders WHERE supplier_id = ?', [s.supplier_id]);
        if (pos.length > 0) {
           console.log(`Found ${pos.length} POs for ${s.name}. Unlinking them first...`);
           await tenantConn.execute('UPDATE purchase_orders SET supplier_id = NULL WHERE supplier_id = ?', [s.supplier_id]);
        }
        await tenantConn.execute('DELETE FROM suppliers WHERE supplier_id = ?', [s.supplier_id]);
        console.log(`Deleted ${s.name} from Tenant.`);
      }
    } else {
      console.log('Not found in Tenant.');
    }

    console.log('Final Check...');
    const [mCheck] = await masterConn.execute('SELECT COUNT(*) as count FROM suppliers WHERE business_name LIKE "%ABC%"');
    const [lCheck] = await tenantConn.execute('SELECT COUNT(*) as count FROM suppliers WHERE name LIKE "%ABC%"');
    console.log(`Final Counts - Master: ${mCheck[0].count}, Tenant: ${lCheck[0].count}`);

  } catch (err) {
    console.error('Error during removal:', err);
  } finally {
    await masterConn.end();
    await tenantConn.end();
  }
}

removeAbc();
