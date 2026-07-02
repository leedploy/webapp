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
      'SELECT * FROM saved_texts WHERE user_id = $1 ORDER BY sort_order ASC, created_at DESC',
      [user.id]
    );
    
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
    const user = await checkSession();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await initDB();
    const { category, content, profile = 'Grok imagine' } = await req.json();
    if (!category || !content) {
      return NextResponse.json({ error: 'Missing category or content' }, { status: 400 });
    }
    
    const query = 'INSERT INTO saved_texts (category, content, profile, user_id) VALUES ($1, $2, $3, $4) RETURNING *';
    const { rows } = await pool.query(query, [category, content, profile, user.id]);
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
    const profile = req.nextUrl.searchParams.get('profile');
    
    if (profile) {
      const query = 'DELETE FROM saved_texts WHERE profile = $1 AND user_id = $2 RETURNING *';
      const { rows } = await pool.query(query, [profile, user.id]);
      return NextResponse.json({ success: true, deletedCount: rows.length });
    }
    
    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }
    const query = 'DELETE FROM saved_texts WHERE id = $1 AND user_id = $2 RETURNING *';
    const { rows } = await pool.query(query, [id, user.id]);
    
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Memo not found or unauthorized' }, { status: 404 });
    }
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
    const { id, content, score } = body;
    
    if (!id || content === undefined) {
      return NextResponse.json({ error: 'Missing id or content' }, { status: 400 });
    }
    
    let query = 'UPDATE saved_texts SET content = $1 WHERE id = $2 AND user_id = $3 RETURNING *';
    let values = [content, id, user.id];
    
    if (score !== undefined) {
      query = 'UPDATE saved_texts SET content = $1, score = $2 WHERE id = $3 AND user_id = $4 RETURNING *';
      values = [content, score, id, user.id];
    }
    
    const { rows } = await pool.query(query, values);
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Memo not found or unauthorized' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: rows[0] });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}

export async function PATCH(req) {
  try {
    const user = await checkSession();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await initDB();
    const body = await req.json();
    
    if (body.action === 'rename_profile') {
      const { oldName, newName } = body;
      if (!oldName || !newName) return NextResponse.json({ error: 'Missing names' }, { status: 400 });
      const query = 'UPDATE saved_texts SET profile = $1 WHERE profile = $2 AND user_id = $3 RETURNING *';
      const { rows } = await pool.query(query, [newName, oldName, user.id]);
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
          await client.query(
            'UPDATE saved_texts SET sort_order = $1 WHERE id = $2 AND user_id = $3', 
            [item.sort_order, item.id, user.id]
          );
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
