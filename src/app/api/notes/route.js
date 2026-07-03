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
    const { rows } = await pool.query(
      'SELECT id, title, content, created_at, updated_at FROM leed_notes WHERE user_id = $1 ORDER BY updated_at DESC',
      [user.id]
    );

    return NextResponse.json(rows);
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}

export async function POST() {
  try {
    const user = await checkSession();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await initDB();
    const query = 'INSERT INTO leed_notes (title, content, user_id) VALUES ($1, $2, $3) RETURNING *';
    const { rows } = await pool.query(query, ['บันทึกใหม่', '', user.id]);
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
    const body = await req.json();
    const { id, title, content } = body;

    if (!id) {
      return NextResponse.json({ error: 'Missing note id' }, { status: 400 });
    }

    const query = `
      UPDATE leed_notes 
      SET title = COALESCE($1, title), content = COALESCE($2, content), updated_at = CURRENT_TIMESTAMP 
      WHERE id = $3 AND user_id = $4 
      RETURNING *
    `;
    const { rows } = await pool.query(query, [title, content, id, user.id]);

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Note not found or unauthorized' }, { status: 404 });
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
      return NextResponse.json({ error: 'Missing note id' }, { status: 400 });
    }

    const query = 'DELETE FROM leed_notes WHERE id = $1 AND user_id = $2 RETURNING *';
    const { rows } = await pool.query(query, [id, user.id]);

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Note not found or unauthorized' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: rows[0] });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
