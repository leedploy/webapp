import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Initialize table if it doesn't exist
async function initTable() {
  const query = `
    CREATE TABLE IF NOT EXISTS leed_links (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      url TEXT NOT NULL,
      category VARCHAR(50) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  await pool.query(query);
}

export async function GET() {
  try {
    await initTable();
    const { rows } = await pool.query('SELECT * FROM leed_links ORDER BY created_at DESC');
    return NextResponse.json(rows);
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    await initTable();
    const { title, url, category } = await req.json();
    if (!title || !url || !category) {
      return NextResponse.json({ error: 'Missing title, url, or category' }, { status: 400 });
    }
    const query = 'INSERT INTO leed_links (title, url, category) VALUES ($1, $2, $3) RETURNING *';
    const { rows } = await pool.query(query, [title, url, category]);
    return NextResponse.json({ success: true, data: rows[0] });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    await initTable();
    const { id, title, url, category } = await req.json();
    if (!id || !title || !url || !category) {
      return NextResponse.json({ error: 'Missing id, title, url, or category' }, { status: 400 });
    }
    const query = 'UPDATE leed_links SET title = $1, url = $2, category = $3 WHERE id = $4 RETURNING *';
    const { rows } = await pool.query(query, [title, url, category, id]);
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
    const query = 'DELETE FROM leed_links WHERE id = $1 RETURNING *';
    const { rows } = await pool.query(query, [id]);
    return NextResponse.json({ success: true, data: rows[0] });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
