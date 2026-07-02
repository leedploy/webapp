import { NextResponse } from 'next/server';
import { pool, initDB } from '@/lib/db';
import { checkSession } from '@/lib/auth';

export async function GET() {
  try {
    const user = await checkSession();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await initDB();
    const { rows } = await pool.query('SELECT * FROM leed_links WHERE user_id = $1 ORDER BY created_at DESC', [user.id]);
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

    await initDB();
    const { title, url, category, score } = await req.json();
    if (!title || !url || !category) {
      return NextResponse.json({ error: 'Missing title, url, or category' }, { status: 400 });
    }
    const query = 'INSERT INTO leed_links (title, url, category, score, user_id) VALUES ($1, $2, $3, $4, $5) RETURNING *';
    const { rows } = await pool.query(query, [title, url, category, score ?? 0, user.id]);
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

    await initDB();
    const { id, title, url, category, score } = await req.json();
    if (!id || !title || !url || !category) {
      return NextResponse.json({ error: 'Missing id, title, url, or category' }, { status: 400 });
    }
    const query = 'UPDATE leed_links SET title = $1, url = $2, category = $3, score = $4 WHERE id = $5 AND user_id = $6 RETURNING *';
    const { rows } = await pool.query(query, [title, url, category, score ?? 0, id, user.id]);
    
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Link not found or unauthorized' }, { status: 404 });
    }
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

    await initDB();
    const id = req.nextUrl.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }
    const query = 'DELETE FROM leed_links WHERE id = $1 AND user_id = $2 RETURNING *';
    const { rows } = await pool.query(query, [id, user.id]);
    
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Link not found or unauthorized' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: rows[0] });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
