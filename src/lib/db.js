import { Pool } from 'pg';
import crypto from 'crypto';

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// ฟังก์ชันเข้ารหัสผ่านสำหรับรหัสเริ่มต้น
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

export async function initDB() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. สร้างตาราง users
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. สร้างตาราง user_sessions
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        id SERIAL PRIMARY KEY,
        token VARCHAR(255) UNIQUE NOT NULL,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3. สร้าง/อัปเดตตารางหลักอื่นๆ
    await client.query(`
      CREATE TABLE IF NOT EXISTS saved_texts (
        id SERIAL PRIMARY KEY,
        category VARCHAR(50) NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS leed_links (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        url TEXT NOT NULL,
        category VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS two_fa_accounts (
        id SERIAL PRIMARY KEY,
        issuer VARCHAR(100) NOT NULL,
        account_name VARCHAR(150) NOT NULL,
        secret_key TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS leed_notes (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // เพิ่มคอลัมน์เพิ่มเติมหากยังไม่มี
    await client.query('ALTER TABLE saved_texts ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;');
    await client.query('ALTER TABLE saved_texts ADD COLUMN IF NOT EXISTS score INTEGER DEFAULT 0;');
    await client.query("ALTER TABLE saved_texts ADD COLUMN IF NOT EXISTS profile VARCHAR(100) DEFAULT 'Grok imagine';");
    await client.query('ALTER TABLE leed_links ADD COLUMN IF NOT EXISTS score INTEGER DEFAULT 0;');
    await client.query('ALTER TABLE leed_notes ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT FALSE;');
    await client.query('ALTER TABLE leed_notes ADD COLUMN IF NOT EXISTS score INTEGER DEFAULT 0;');

    // 4. เพิ่มคอลัมน์ user_id ในตารางหลักต่างๆ
    await client.query('ALTER TABLE saved_texts ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id);');
    await client.query('ALTER TABLE leed_links ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id);');
    await client.query('ALTER TABLE two_fa_accounts ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id);');
    await client.query('ALTER TABLE leed_notes ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;');

    // 5. เพิ่มบัญชีเริ่มต้น leed ถ้ายังไม่มี
    const checkUser = await client.query('SELECT id FROM users WHERE username = $1', ['leed']);
    let leedId;
    if (checkUser.rowCount === 0) {
      const defaultHash = hashPassword('leed018664499');
      const insertUser = await client.query(
        'INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id',
        ['leed', defaultHash]
      );
      leedId = insertUser.rows[0].id;
      console.log('Seeded default user leed');
    } else {
      leedId = checkUser.rows[0].id;
    }

    // 6. อัปเดตข้อมูลที่มีอยู่แล้วในระบบ (ที่ user_id เป็น NULL) ให้เป็นของบัญชี leed ทั้งหมด
    await client.query('UPDATE saved_texts SET user_id = $1 WHERE user_id IS NULL', [leedId]);
    await client.query('UPDATE leed_links SET user_id = $1 WHERE user_id IS NULL', [leedId]);
    await client.query('UPDATE two_fa_accounts SET user_id = $1 WHERE user_id IS NULL', [leedId]);
    await client.query('UPDATE leed_notes SET user_id = $1 WHERE user_id IS NULL', [leedId]);

    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Database migration error:', e);
    throw e;
  } finally {
    client.release();
  }
}
