import crypto from 'crypto';
import { cookies } from 'next/headers';
import { pool, initDB } from './db';

// เข้ารหัสผ่านโดยใช้ PBKDF2 พร้อมเกลือ (Salt) สุ่ม
export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

// ตรวจสอบรหัสผ่านที่ป้อนเข้ามาเทียบกับตัวที่เก็บไว้
export function verifyPassword(password, storedPassword) {
  try {
    const [salt, hash] = storedPassword.split(':');
    if (!salt || !hash) return false;
    const verifyHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return hash === verifyHash;
  } catch (e) {
    return false;
  }
}

// สร้างเซสชันใหม่ลงในฐานข้อมูล
export async function createSession(userId) {
  await initDB();
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // มีอายุ 7 วัน
  
  const query = `
    INSERT INTO user_sessions (token, user_id, expires_at)
    VALUES ($1, $2, $3)
    RETURNING token
  `;
  await pool.query(query, [token, userId, expiresAt]);
  return token;
}

// ตรวจสอบเซสชันปัจจุบันจากคุกกี้ และคืนค่าข้อมูลผู้ใช้งาน
export async function checkSession() {
  await initDB();
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_session')?.value;
    
    if (!token) return null;

    const query = `
      SELECT u.id, u.username
      FROM user_sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.token = $1 AND s.expires_at > CURRENT_TIMESTAMP
    `;
    
    const { rows } = await pool.query(query, [token]);
    if (rows.length === 0) return null;
    
    return rows[0]; // คืนค่า { id, username }
  } catch (error) {
    console.error('Check session error:', error);
    return null;
  }
}

// ลบเซสชันออกจากฐานข้อมูล (Logout)
export async function deleteSession() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_session')?.value;
    
    if (token) {
      const query = 'DELETE FROM user_sessions WHERE token = $1';
      await pool.query(query, [token]);
    }
  } catch (error) {
    console.error('Delete session error:', error);
  }
}
