import { masterPool } from '../src/config/masterDatabase.js';

async function check() {
  const [orders] = await masterPool.execute(`
       SELECT o.*, 
              p_shop.business_name as shop_name,
              p_sup.business_name as supplier_name,
              p_sup.entity_id as p_sup_id
       FROM b2b_orders o
       LEFT JOIN profiles p_shop ON p_shop.entity_id = o.shop_id
       LEFT JOIN profiles p_sup ON p_sup.entity_id = o.supplier_id
       LIMIT 1`);
  console.log("B2B Order details:", JSON.stringify(orders[0], null, 2));

  process.exit(0);
}
check();
