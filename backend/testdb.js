const mysql = require('mysql2/promise');

async function test() {
  try {
    const pool = mysql.createPool({
      host:     'localhost',
      user:     'root',
      password: 'Abhi@1424',
      database: 'inventory',
    });
    const conn = await pool.getConnection();
    console.log('✅ DB Connected!');
    conn.release();
    process.exit(0);
  } catch (e) {
    console.log('❌ Failed:', e.message);
    process.exit(1);
  }
}

test();