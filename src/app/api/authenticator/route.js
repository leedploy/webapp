import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { cookies } from 'next/headers';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// ตรวจสอบสิทธิ์การเข้าใช้งาน
async function checkAuth() {
  const cookieStore = await cookies();
  const authSession = cookieStore.get('auth_session')?.value;
  return authSession === 'leed_logged_in_session_token';
}

// สร้างตารางอัตโนมัติหากยังไม่มี
async function initTable() {
  const query = `
    CREATE TABLE IF NOT EXISTS two_fa_accounts (
      id SERIAL PRIMARY KEY,
      issuer VARCHAR(100) NOT NULL,
      account_name VARCHAR(150) NOT NULL,
      secret_key TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  await pool.query(query);
}

// ดึงข้อมูล 2FA ทั้งหมด
export async function GET() {
  try {
    if (!(await checkAuth())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    await initTable();
    const { rows } = await pool.query('SELECT * FROM two_fa_accounts ORDER BY issuer ASC, account_name ASC');
    return NextResponse.json({ success: true, data: rows });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}

// เพิ่มบัญชี 2FA ใหม่
export async function POST(req) {
  try {
    if (!(await checkAuth())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    await initTable();
    const { issuer, accountName, secretKey } = await req.json();
    
    if (!issuer || !accountName || !secretKey) {
      return NextResponse.json({ error: 'กรุณากรอกข้อมูลให้ครบถ้วนค่ะ' }, { status: 400 });
    }

    // ล้างพื้นที่ว่างและทำให้เป็นพิมพ์ใหญ่สำหรับ Secret Key
    let sanitizedSecret = secretKey.trim();
    if (sanitizedSecret.includes('|')) {
      const parts = sanitizedSecret.split('|');
      sanitizedSecret = parts[parts.length - 1].trim();
    }
    sanitizedSecret = sanitizedSecret.replace(/\s+/g, '').toUpperCase();
    
    const query = 'INSERT INTO two_fa_accounts (issuer, account_name, secret_key) VALUES ($1, $2, $3) RETURNING *';
    const { rows } = await pool.query(query, [issuer.trim(), accountName.trim(), sanitizedSecret]);
    
    return NextResponse.json({ success: true, data: rows[0] });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}

// แก้ไขข้อมูลบัญชี 2FA
export async function PUT(req) {
  try {
    if (!(await checkAuth())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    await initTable();
    const { id, issuer, accountName, secretKey } = await req.json();

    if (!id || !issuer || !accountName || !secretKey) {
      return NextResponse.json({ error: 'กรุณากรอกข้อมูลให้ครบถ้วนค่ะ' }, { status: 400 });
    }

    // ล้างพื้นที่ว่างและทำให้เป็นพิมพ์ใหญ่สำหรับ Secret Key
    let sanitizedSecret = secretKey.trim();
    if (sanitizedSecret.includes('|')) {
      const parts = sanitizedSecret.split('|');
      sanitizedSecret = parts[parts.length - 1].trim();
    }
    sanitizedSecret = sanitizedSecret.replace(/\s+/g, '').toUpperCase();

    const query = 'UPDATE two_fa_accounts SET issuer = $1, account_name = $2, secret_key = $3 WHERE id = $4 RETURNING *';
    const { rows } = await pool.query(query, [issuer.trim(), accountName.trim(), sanitizedSecret, id]);

    if (rows.length === 0) {
      return NextResponse.json({ error: 'ไม่พบบัญชีนี้ในระบบค่ะ' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: rows[0] });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}

// ลบบัญชี 2FA
export async function DELETE(req) {
  try {
    if (!(await checkAuth())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    await initTable();
    const id = req.nextUrl.searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ระบุ ID ที่ต้องการลบค่ะ' }, { status: 400 });
    }

    const query = 'DELETE FROM two_fa_accounts WHERE id = $1 RETURNING *';
    const { rows } = await pool.query(query, [id]);

    if (rows.length === 0) {
      return NextResponse.json({ error: 'ไม่พบบัญชีนี้ในระบบค่ะ' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: rows[0] });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
