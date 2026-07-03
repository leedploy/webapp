import { NextResponse } from 'next/server';
import { pool, initDB } from '@/lib/db';
import { checkSession, verifyPassword } from '@/lib/auth';

export async function GET(req) {
  try {
    const user = await checkSession();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await initDB();
    const isTrash = req.nextUrl.searchParams.get('trash') === 'true';

    let query;
    if (isTrash) {
      query = `
        SELECT id, title, content, is_favorite, score, deleted_at, created_at, updated_at 
        FROM leed_notes 
        WHERE user_id = $1 AND deleted_at IS NOT NULL 
        ORDER BY deleted_at DESC
      `;
    } else {
      query = `
        SELECT id, title, content, is_favorite, score, deleted_at, created_at, updated_at 
        FROM leed_notes 
        WHERE user_id = $1 AND deleted_at IS NULL 
        ORDER BY score DESC, updated_at DESC
      `;
    }

    const { rows } = await pool.query(query, [user.id]);
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
    const { id, title, content, is_favorite, score, restore } = body;

    if (!id) {
      return NextResponse.json({ error: 'Missing note id' }, { status: 400 });
    }

    let rows;
    if (restore) {
      const query = `
        UPDATE leed_notes 
        SET deleted_at = NULL, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND user_id = $2 
        RETURNING *
      `;
      const result = await pool.query(query, [id, user.id]);
      rows = result.rows;
    } else {
      const query = `
        UPDATE leed_notes 
        SET title = COALESCE($1, title), 
            content = COALESCE($2, content), 
            is_favorite = COALESCE($3, is_favorite), 
            score = COALESCE($4, score), 
            updated_at = CURRENT_TIMESTAMP 
        WHERE id = $5 AND user_id = $6 
        RETURNING *
      `;
      const result = await pool.query(query, [title, content, is_favorite, score, id, user.id]);
      rows = result.rows;
    }

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

    let body = {};
    try {
      const text = await req.text();
      if (text) {
        body = JSON.parse(text);
      }
    } catch {
      // Stdin/body is empty or invalid
    }

    const id = req.nextUrl.searchParams.get('id') || body.id;
    const { password, permanent, emptyAll } = body;

    if (permanent || emptyAll) {
      if (!password) {
        return NextResponse.json({ error: 'กรุณากรอกรหัสผ่านเพื่อยืนยัน' }, { status: 400 });
      }

      // Fetch the user's password from the users table
      const userQuery = 'SELECT password FROM users WHERE id = $1';
      const { rows: userRows } = await pool.query(userQuery, [user.id]);
      if (userRows.length === 0) {
        return NextResponse.json({ error: 'ไม่พบข้อมูลผู้ใช้' }, { status: 404 });
      }
      
      const storedPassword = userRows[0].password;
      const isPasswordValid = verifyPassword(password, storedPassword);
      if (!isPasswordValid) {
        return NextResponse.json({ error: 'รหัสผ่านไม่ถูกต้อง' }, { status: 401 });
      }

      if (emptyAll) {
        // Permanent delete all trashed notes
        const query = 'DELETE FROM leed_notes WHERE user_id = $1 AND deleted_at IS NOT NULL RETURNING *';
        const { rows } = await pool.query(query, [user.id]);
        return NextResponse.json({ success: true, count: rows.length });
      } else {
        // Permanent delete single note
        const query = 'DELETE FROM leed_notes WHERE id = $1 AND user_id = $2 RETURNING *';
        const { rows } = await pool.query(query, [id, user.id]);
        if (rows.length === 0) {
          return NextResponse.json({ error: 'ไม่พบเอกสารหรือไม่มีสิทธิ์ลบ' }, { status: 404 });
        }
        return NextResponse.json({ success: true, data: rows[0] });
      }
    } else {
      // Soft delete (No password required)
      if (!id) {
        return NextResponse.json({ error: 'Missing note id' }, { status: 400 });
      }
      const query = 'UPDATE leed_notes SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1 AND user_id = $2 RETURNING *';
      const { rows } = await pool.query(query, [id, user.id]);
      if (rows.length === 0) {
        return NextResponse.json({ error: 'ไม่พบเอกสารหรือไม่มีสิทธิ์ลบ' }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: rows[0] });
    }
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
