import { masterPool } from '../src/config/masterDatabase.js';
import fs from 'fs';

async function check() {
  const [orders] = await masterPool.execute("SELECT * FROM b2b_orders LIMIT 1");
  let out = "B2B Order: " + JSON.stringify(orders[0], null, 2) + "\n";
  
  if (orders.length > 0) {
    const shop_id = orders[0].shop_id;
    const [sups] = await masterPool.execute("SELECT * FROM `" + shop_id + "`.suppliers");
    out += "Suppliers in shop db: " + JSON.stringify(sups, null, 2) + "\n";
  }
  fs.writeFileSync('debug_out2.txt', out, 'utf-8');
  process.exit(0);
}
check();
