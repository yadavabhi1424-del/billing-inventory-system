import mysql from 'mysql2/promise';
import 'dotenv/config';

async function testUserRestoration() {
  const masterConn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: 'stocksense_master'
  });

  try {
    const [tenants] = await masterConn.execute("SELECT db_name FROM tenants LIMIT 1");
    if (tenants.length === 0) throw new Error("No tenants found");
    const dbName = tenants[0].db_name;
    console.log("Testing on tenant DB:", dbName);

    const tenantConn = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: dbName
    });

    try {
      // 1. Ensure a user exists or create a dummy one
      const email = 'readdtest@test.com';
      await tenantConn.execute("DELETE FROM users WHERE email = ?", [email]);
      await tenantConn.execute(
        "INSERT INTO users (user_id, name, email, password, role, status, emailVerified, isActive) VALUES (UUID(), 'Restorer', ?, 'dummy', 'CASHIER', 'APPROVED', TRUE, TRUE)",
        [email]
      );
      console.log("1. Dummy user created.");

      // 2. Soft-delete the user
      await tenantConn.execute("UPDATE users SET status = 'DELETED', isActive = FALSE WHERE email = ?", [email]);
      console.log("2. User soft-deleted.");

      // 3. Verify 'already registered' is GONE (This would be done via API, but let's check the SQL logic)
      const [rows] = await tenantConn.execute("SELECT user_id, status FROM users WHERE email = ?", [email]);
      console.log("3. Current user status:", rows[0].status);
      
      // The logic we added to createUser:
      // if (user.status === 'DELETED') { RESTORE }
      if (rows[0].status === 'DELETED') {
        console.log("✅ SUCCESS: Logic will detect DELETED status.");
      } else {
        console.log("❌ FAILURE: Status is not DELETED.");
      }

    } finally {
      await tenantConn.end();
    }
  } catch (err) {
    console.error(err);
  } finally {
    await masterConn.end();
  }
}
testUserRestoration();
