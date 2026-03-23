import mysql from "mysql2/promise";
import "dotenv/config";

const masterPool = mysql.createPool({
  host:               process.env.DB_HOST,
  user:               process.env.DB_USER,
  password:           process.env.DB_PASSWORD,
  database:           process.env.MASTER_DB_NAME,
  port:               process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit:    10,
  timezone:           "+05:30",
});
export async function seedMasterData() {
  await masterPool.execute(`
    INSERT IGNORE INTO plans 
      (plan_name, display_name, price_monthly, max_users, max_products, ai_enabled, reports_enabled, description)
    VALUES
      ('FREE',       'Free',       0,    2,    200,  FALSE, FALSE, 'Perfect for trying out'),
      ('BASIC',      'Basic',      149,  5,    500,  FALSE, TRUE,  'For small businesses'),
      ('PRO',        'Pro',        499,  10,   NULL, TRUE,  TRUE,  'For growing businesses'),
      ('ENTERPRISE', 'Enterprise', NULL, NULL, NULL, TRUE,  TRUE,  'Custom pricing')
  `);
}

export { masterPool };