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
}

export default async function handler(req, res) {
  try {
    await initTable();

    if (req.method === 'GET') {
      // ดึงข้อมูลทั้งหมดเรียงตามเวลา
      const { rows } = await pool.query('SELECT * FROM saved_texts ORDER BY created_at ASC');
      
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
    else {
      res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
      return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error('Database Error:', error);
    return res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
}
