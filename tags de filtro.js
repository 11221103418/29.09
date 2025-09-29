// src/routes/tags.js
// Aqui é pra pegar as tags que tem no banco, pra mostrar filtro no frontend
import { Router } from 'express';
import { getPool } from '../db.js';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const pool = await getPool();
    const rs = await pool.request().query(`
      SELECT name, slug
      FROM dbo.tags
      ORDER BY name
    `);
    res.json(rs.recordset);
  } catch (err) {
    console.error('GET /tags deu erro:', err);
    res.status(500).json({ error: 'Deu ruim ao listar as tags' });
  }
});

export default router;