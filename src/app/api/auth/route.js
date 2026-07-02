import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { pool, initDB } from '@/lib/db';
import { hashPassword, verifyPassword, createSession, checkSession, deleteSession } from '@/lib/auth';

// เช็คข้อมูลการล็อกอิน/ผู้ใช้ปัจจุบัน
export async function GET() {
  try {
    const user = await checkSession();
    if (!user) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }
    return NextResponse.json({ authenticated: true, user });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}

// ล็อกอิน หรือ สมัครสมาชิก
export async function POST(req) {
  try {
    await initDB();
    const { action, username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'กรุณากรอกข้อมูลให้ครบถ้วนค่ะ' }, { status: 400 });
    }

    const cleanUsername = username.trim().toLowerCase();
    
    // ตรวจสอบรูปแบบชื่อผู้ใช้งาน
    if (!/^[a-zA-Z0-9_]{3,30}$/.test(cleanUsername)) {
      return NextResponse.json({ error: 'ชื่อผู้ใช้งานต้องเป็นอักษรภาษาอังกฤษ ตัวเลข หรือขีดล่าง และมีความยาว 3-30 ตัวอักษรค่ะ' }, { status: 400 });
    }

    // สมัครสมาชิกใหม่
    if (action === 'register') {
      if (password.length < 6) {
        return NextResponse.json({ error: 'รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษรค่ะ' }, { status: 400 });
      }

      // ตรวจสอบว่าชื่อผู้ใช้ซ้ำหรือไม่
      const checkDup = await pool.query('SELECT id FROM users WHERE username = $1', [cleanUsername]);
      if (checkDup.rowCount > 0) {
        return NextResponse.json({ error: 'ชื่อผู้ใช้งานนี้มีผู้อื่นใช้ไปแล้วค่ะ' }, { status: 400 });
      }

      // บันทึกผู้ใช้ใหม่
      const passwordHash = hashPassword(password);
      const insertQuery = 'INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username';
      const { rows } = await pool.query(insertQuery, [cleanUsername, passwordHash]);
      const newUser = rows[0];

      // สร้างเซสชัน
      const token = await createSession(newUser.id);
      
      const cookieStore = await cookies();
      cookieStore.set('auth_session', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24 * 7, // 7 วัน
        path: '/'
      });

      return NextResponse.json({ success: true, user: { id: newUser.id, username: newUser.username } });
    } 
    
    // เข้าสู่ระบบปกติ (Login)
    else {
      const query = 'SELECT id, username, password_hash FROM users WHERE username = $1';
      const { rows } = await pool.query(query, [cleanUsername]);
      
      if (rows.length === 0) {
        return NextResponse.json({ error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้องค่ะ!' }, { status: 401 });
      }

      const user = rows[0];
      const isValid = verifyPassword(password, user.password_hash);
      
      if (!isValid) {
        return NextResponse.json({ error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้องค่ะ!' }, { status: 401 });
      }

      // สร้างเซสชัน
      const token = await createSession(user.id);
      
      const cookieStore = await cookies();
      cookieStore.set('auth_session', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24 * 7, // 7 วัน
        path: '/'
      });

      return NextResponse.json({ success: true, user: { id: user.id, username: user.username } });
    }
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}

// ออกจากระบบ (Logout)
export async function DELETE() {
  try {
    await deleteSession();
    
    const cookieStore = await cookies();
    cookieStore.delete('auth_session');
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
