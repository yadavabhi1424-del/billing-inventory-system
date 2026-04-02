import mysql from 'mysql2/promise';
import 'dotenv/config';

async function traceAbcBeverages() {
  let masterConn, tenantConn;
  try {
    masterConn = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: 'stocksense_master'
    });

    tenantConn = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: 'stocksense_tenant_inventory'
    });

    console.log('--- Master DB Suppliers ---');
    const [mSups] = await masterConn.execute('SELECT supplier_id, business_name, slug FROM suppliers WHERE business_name LIKE "%ABC%" OR slug LIKE "%abc%"');
    console.log(mSups);

    console.log('--- Master DB B2B Orders ---');
    const [mOrders] = await masterConn.execute(`
      SELECT o.order_id, o.status, s.business_name, s.slug 
      FROM b2b_orders o 
      JOIN suppliers s ON s.supplier_id = o.supplier_id 
      WHERE (s.business_name LIKE "%ABC%" OR s.slug LIKE "%abc%")
    `);
    console.log(mOrders);

    console.log('--- Local Tenant Suppliers ---');
    const [lSups] = await tenantConn.execute('SELECT supplier_id, name, slug, isActive FROM suppliers WHERE slug LIKE "%abc%" OR name LIKE "%ABC%"');
    console.log(lSups);

    console.log('--- Local Tenant Purchase Orders ---');
    const [lOrders] = await tenantConn.execute(`
      SELECT po.po_id, po.status, s.name as supplierName, s.slug as supplierSlug
      FROM purchase_orders po 
      LEFT JOIN suppliers s ON s.supplier_id = po.supplier_id 
      WHERE (s.name LIKE "%ABC%" OR s.slug LIKE "%abc%")
    `);
    console.log(lOrders);

    console.log('--- Checking Products for ABC ---');
    const [products] = await tenantConn.execute('SELECT product_id, name, supplier_id FROM products WHERE name LIKE "%ABC%"');
    console.log(products);

  } catch (err) {
    console.error(err);
  } finally {
    if (masterConn) await masterConn.end();
    if (tenantConn) await tenantConn.end();
  }
}

traceAbcBeverages();
