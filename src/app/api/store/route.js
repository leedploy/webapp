import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

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
  } catch (e) {}
}

export async function GET() {
  try {
    await initTable();
    const { rows } = await pool.query('SELECT * FROM saved_texts ORDER BY sort_order ASC, created_at DESC');
    
    const dataStore = { general: [], account: [] };
    rows.forEach(row => {
      if (dataStore[row.category]) {
        dataStore[row.category].push({ id: row.id, content: row.content, created_at: row.created_at });
      }
    });
    return NextResponse.json(dataStore);
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    await initTable();
    const { category, content } = await req.json();
    if (!category || !content) {
      return NextResponse.json({ error: 'Missing category or content' }, { status: 400 });
    }
    const query = 'INSERT INTO saved_texts (category, content) VALUES ($1, $2) RETURNING *';
    const { rows } = await pool.query(query, [category, content]);
    return NextResponse.json({ success: true, data: rows[0] });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    await initTable();
    const id = req.nextUrl.searchParams.get('id');
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
    await initTable();
    const { id, content } = await req.json();
    if (!id || !content) {
      return NextResponse.json({ error: 'Missing id or content' }, { status: 400 });
    }
    const query = 'UPDATE saved_texts SET content = $1 WHERE id = $2 RETURNING *';
    const { rows } = await pool.query(query, [content, id]);
    return NextResponse.json({ success: true, data: rows[0] });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}

export async function PATCH(req) {
  try {
    await initTable();
    const updates = await req.json();
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
