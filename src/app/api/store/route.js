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
    CREATE TABLE IF NOT EXISTS saved_texts (
      id SERIAL PRIMARY KEY,
      category VARCHAR(50) NOT NULL,
      content TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  await pool.query(query);
  
  try {
    await pool.query('ALTER TABLE saved_texts ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;');
    await pool.query('ALTER TABLE saved_texts ADD COLUMN IF NOT EXISTS score INTEGER DEFAULT 0;');
    await pool.query("ALTER TABLE saved_texts ADD COLUMN IF NOT EXISTS profile VARCHAR(100) DEFAULT 'Grok imagine';");
  } catch (e) {}
}

export async function GET() {
  try {
    if (!(await checkAuth())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    await initTable();
    const { rows } = await pool.query('SELECT * FROM saved_texts ORDER BY sort_order ASC, created_at DESC');
    
    const dataStore = {};
    rows.forEach(row => {
      const p = row.profile || 'Grok imagine';
      if (!dataStore[p]) {
        dataStore[p] = { general: [], account: [] };
      }
      if (dataStore[p][row.category]) {
        dataStore[p][row.category].push({ 
          id: row.id, 
          content: row.content, 
          created_at: row.created_at,
          sort_order: row.sort_order,
          score: row.score || 0
        });
      }
    });
    return NextResponse.json(dataStore);
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    if (!(await checkAuth())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    await initTable();
    const { category, content, profile = 'Grok imagine' } = await req.json();
    if (!category || !content) {
      return NextResponse.json({ error: 'Missing category or content' }, { status: 400 });
    }
    const query = 'INSERT INTO saved_texts (category, content, profile) VALUES ($1, $2, $3) RETURNING *';
    const { rows } = await pool.query(query, [category, content, profile]);
    return NextResponse.json({ success: true, data: rows[0] });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    if (!(await checkAuth())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    await initTable();
    const id = req.nextUrl.searchParams.get('id');
    const profile = req.nextUrl.searchParams.get('profile');
    
    if (profile) {
      const query = 'DELETE FROM saved_texts WHERE profile = $1 RETURNING *';
      const { rows } = await pool.query(query, [profile]);
      return NextResponse.json({ success: true, deletedCount: rows.length });
    }
    
    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }
    const query = 'DELETE FROM saved_texts WHERE id = $1 RETURNING *';
    const { rows } = await pool.query(query, [id]);
    return NextResponse.json({ success: true, data: rows[0] });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    if (!(await checkAuth())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    await initTable();
    const body = await req.json();
    const { id, content, score } = body;
    
    if (!id || content === undefined) {
      return NextResponse.json({ error: 'Missing id or content' }, { status: 400 });
    }
    
    let query = 'UPDATE saved_texts SET content = $1 WHERE id = $2 RETURNING *';
    let values = [content, id];
    
    if (score !== undefined) {
      query = 'UPDATE saved_texts SET content = $1, score = $2 WHERE id = $3 RETURNING *';
      values = [content, score, id];
    }
    
    const { rows } = await pool.query(query, values);
    return NextResponse.json({ success: true, data: rows[0] });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}

export async function PATCH(req) {
  try {
    if (!(await checkAuth())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    await initTable();
    const body = await req.json();
    
    if (body.action === 'rename_profile') {
      const { oldName, newName } = body;
      if (!oldName || !newName) return NextResponse.json({ error: 'Missing names' }, { status: 400 });
      const query = 'UPDATE saved_texts SET profile = $1 WHERE profile = $2 RETURNING *';
      const { rows } = await pool.query(query, [newName, oldName]);
      return NextResponse.json({ success: true, updatedCount: rows.length });
    }

    const updates = body;
    if (!Array.isArray(updates)) {
      return NextResponse.json({ error: 'Expected an array of updates' }, { status: 400 });
    }
    
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (let item of updates) {
        if (item.id && item.sort_order !== undefined) {
          await client.query('UPDATE saved_texts SET sort_order = $1 WHERE id = $2', [item.sort_order, item.id]);
        }
      }
      await client.query('COMMIT');
      return NextResponse.json({ success: true });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
