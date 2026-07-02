import { NextResponse } from 'next/server';
import { pool, initDB } from '@/lib/db';
import { checkSession } from '@/lib/auth';

// สร้างตารางหมวดหมู่และเพิ่มข้อมูลเริ่มต้น
async function initCategoriesTable() {
  await initDB();
  const createQuery = `
    CREATE TABLE IF NOT EXISTS leed_categories (
      id VARCHAR(50) PRIMARY KEY,
      label VARCHAR(100) NOT NULL,
      icon VARCHAR(50) NOT NULL,
      color VARCHAR(100) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  await pool.query(createQuery);

  // ตรวจสอบว่ามีข้อมูลหรือยัง
  const { rowCount } = await pool.query('SELECT 1 FROM leed_categories LIMIT 1');
  if (rowCount === 0) {
    const seedQuery = `
      INSERT INTO leed_categories (id, label, icon, color) VALUES
      ('education', 'ความรู้/ศึกษา', 'fa-book-open', 'text-emerald-400 border-emerald-500/30 bg-emerald-500/5'),
      ('work', 'งาน', 'fa-briefcase', 'text-sky-400 border-sky-500/30 bg-sky-500/5'),
      ('entertainment', 'บันเทิง', 'fa-gamepad', 'text-rose-400 border-rose-500/30 bg-rose-500/5'),
      ('other', 'อื่นๆ', 'fa-ellipsis-h', 'text-amber-400 border-amber-500/30 bg-amber-500/5');
    `;
    await pool.query(seedQuery);
  }
}

export async function GET() {
  try {
    const user = await checkSession();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    await initCategoriesTable();
    const { rows } = await pool.query('SELECT * FROM leed_categories ORDER BY created_at ASC');
    return NextResponse.json(rows);
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const user = await checkSession();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    await initCategoriesTable();
    const { label, icon, color } = await req.json();
    if (!label || !icon || !color) {
      return NextResponse.json({ error: 'Missing label, icon, or color' }, { status: 400 });
    }

    // สร้าง ID จาก label หรือสุ่มถ้าเป็นภาษาไทย
    const cleanLabel = label.trim().toLowerCase().replace(/[^a-z0-9]/g, '-');
    let id = cleanLabel || `cat-${Date.now()}`;
    
    // ป้องกัน ID ซ้ำ
    const checkDup = await pool.query('SELECT id FROM leed_categories WHERE id = $1', [id]);
    if (checkDup.rowCount > 0) {
      id = `${id}-${Date.now().toString().slice(-4)}`;
    }

    const query = 'INSERT INTO leed_categories (id, label, icon, color) VALUES ($1, $2, $3, $4) RETURNING *';
    const { rows } = await pool.query(query, [id, label, icon, color]);
    return NextResponse.json({ success: true, data: rows[0] });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const user = await checkSession();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    await initCategoriesTable();
    const { id, label, icon, color } = await req.json();
    if (!id || !label || !icon || !color) {
      return NextResponse.json({ error: 'Missing id, label, icon, or color' }, { status: 400 });
    }

    // ห้ามแก้ไขหมวดหมู่ 'other'
    if (id === 'other') {
      return NextResponse.json({ error: 'Cannot modify system category other' }, { status: 400 });
    }

    const query = 'UPDATE leed_categories SET label = $1, icon = $2, color = $3 WHERE id = $4 RETURNING *';
    const { rows } = await pool.query(query, [label, icon, color, id]);
    return NextResponse.json({ success: true, data: rows[0] });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const user = await checkSession();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    await initCategoriesTable();
    const id = req.nextUrl.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }

    // ห้ามลบหมวดหมู่ 'other'
    if (id === 'other') {
      return NextResponse.json({ error: 'Cannot delete system category other' }, { status: 400 });
    }

    // ย้ายลิงก์ทั้งหมดที่อยู่ในหมวดหมู่นี้ไปที่หมวดหมู่ 'อื่นๆ' (other)
    await pool.query("UPDATE leed_links SET category = 'other' WHERE category = $1", [id]);

    const query = 'DELETE FROM leed_categories WHERE id = $1 RETURNING *';
    const { rows } = await pool.query(query, [id]);
    return NextResponse.json({ success: true, data: rows[0] });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
