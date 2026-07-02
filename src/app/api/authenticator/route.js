import { NextResponse } from 'next/server';
import { pool, initDB } from '@/lib/db';
import { checkSession } from '@/lib/auth';

// ดึงข้อมูล 2FA ทั้งหมดของผู้ใช้คนนี้
export async function GET() {
  try {
    const user = await checkSession();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    await initDB();
    const { rows } = await pool.query(
      'SELECT * FROM two_fa_accounts WHERE user_id = $1 ORDER BY issuer ASC, account_name ASC',
      [user.id]
    );
    return NextResponse.json({ success: true, data: rows });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}

// เพิ่มบัญชี 2FA ใหม่
export async function POST(req) {
  try {
    const user = await checkSession();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    await initDB();
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
    
    const query = 'INSERT INTO two_fa_accounts (issuer, account_name, secret_key, user_id) VALUES ($1, $2, $3, $4) RETURNING *';
    const { rows } = await pool.query(query, [issuer.trim(), accountName.trim(), sanitizedSecret, user.id]);
    
    return NextResponse.json({ success: true, data: rows[0] });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}

// แก้ไขข้อมูลบัญชี 2FA
export async function PUT(req) {
  try {
    const user = await checkSession();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    await initDB();
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

    const query = 'UPDATE two_fa_accounts SET issuer = $1, account_name = $2, secret_key = $3 WHERE id = $4 AND user_id = $5 RETURNING *';
    const { rows } = await pool.query(query, [issuer.trim(), accountName.trim(), sanitizedSecret, id, user.id]);

    if (rows.length === 0) {
      return NextResponse.json({ error: 'ไม่พบบัญชีนี้ในระบบ หรือคุณไม่มีสิทธิ์แก้ไขค่ะ' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: rows[0] });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}

// ลบบัญชี 2FA
export async function DELETE(req) {
  try {
    const user = await checkSession();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    await initDB();
    const id = req.nextUrl.searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ระบุ ID ที่ต้องการลบค่ะ' }, { status: 400 });
    }

    const query = 'DELETE FROM two_fa_accounts WHERE id = $1 AND user_id = $2 RETURNING *';
    const { rows } = await pool.query(query, [id, user.id]);

    if (rows.length === 0) {
      return NextResponse.json({ error: 'ไม่พบบัญชีนี้ในระบบ หรือคุณไม่มีสิทธิ์ลบค่ะ' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: rows[0] });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
