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
  
  // เพิ่มคอลัมน์ sort_order เพื่อจัดเรียง หากยังไม่มี
  try {
    await pool.query('ALTER TABLE saved_texts ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;');
  } catch (e) {
    // Column might already exist, ignore error if db doesn't support IF NOT EXISTS in this context
  }
}

export default async function handler(req, res) {
  try {
    await initTable();

    if (req.method === 'GET') {
      // ดึงข้อมูลทั้งหมดเรียงตาม sort_order ก่อน แล้วตามด้วยเวลา
      const { rows } = await pool.query('SELECT * FROM saved_texts ORDER BY sort_order ASC, created_at DESC');
      
      const dataStore = { general: [], account: [] };
      rows.forEach(row => {
        if (dataStore[row.category]) {
          dataStore[row.category].push({ id: row.id, content: row.content, created_at: row.created_at });
        }
      });
      return res.status(200).json(dataStore);
    } 
    else if (req.method === 'POST') {
      const { category, content } = req.body;
      if (!category || !content) {
        return res.status(400).json({ error: 'Missing category or content' });
      }
      const query = 'INSERT INTO saved_texts (category, content) VALUES ($1, $2) RETURNING *';
      const { rows } = await pool.query(query, [category, content]);
      return res.status(200).json({ success: true, data: rows[0] });
    } 
    else if (req.method === 'DELETE') {
      const { id } = req.query;
      if (!id) {
        return res.status(400).json({ error: 'Missing id' });
      }
      const query = 'DELETE FROM saved_texts WHERE id = $1 RETURNING *';
      const { rows } = await pool.query(query, [id]);
      return res.status(200).json({ success: true, data: rows[0] });
    } 
    else if (req.method === 'PUT') {
      const { id, content } = req.body;
      if (!id || !content) {
        return res.status(400).json({ error: 'Missing id or content' });
      }
      const query = 'UPDATE saved_texts SET content = $1 WHERE id = $2 RETURNING *';
      const { rows } = await pool.query(query, [content, id]);
      return res.status(200).json({ success: true, data: rows[0] });
    }
    else if (req.method === 'PATCH') {
      const updates = req.body; // รับ array [{id: 1, sort_order: 0}, ...]
      if (!Array.isArray(updates)) {
        return res.status(400).json({ error: 'Expected an array of updates' });
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
        return res.status(200).json({ success: true });
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      } finally {
        client.release();
      }
    }
    else {
      res.setHeader('Allow', ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);
      return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error('Database Error:', error);
    return res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
}
