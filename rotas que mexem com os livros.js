// src/routes/books.js
// Aqui ficam as rotas que mexem com os livros
import { Router } from 'express';
import { getPool, sql } from '../db.js';

const router = Router();

// Rota pra pegar lista de livros com filtros
router.get('/', async (req, res) => {
  try {
    const pool = await getPool();

    // pega os parâmetros da URL (query string)
    const {
      q, // busca texto
      domain, // domínio público ou não
      tags, // tags separadas por vírgula
      yearFrom, // ano mínimo
      yearTo, // ano máximo
      page = '1', // página (padrão 1)
      pageSize = '24' // tamanho da página (padrão 24)
    } = req.query;

    // converte pra número e limita valores
    const p = Math.max(parseInt(page, 10) || 1, 1);
    const ps = Math.min(parseInt(pageSize, 10) || 24, 100);
    const offset = (p - 1) * ps;

    // prepara a query com parâmetros pra evitar SQL injection
    const request = pool.request();
    request.input('q', sql.NVarChar, q ? `%${q}%` : null);
    request.input('domain', sql.NVarChar, domain || null);
    request.input('tags', sql.NVarChar, tags || null);
    request.input('yearFrom', sql.Int, yearFrom ? parseInt(yearFrom, 10) : null);
    request.input('yearTo', sql.Int, yearTo ? parseInt(yearTo, 10) : null);
    request.input('limit', sql.Int, ps);
    request.input('offset', sql.Int, offset);

    // query que filtra os livros conforme os parâmetros
    const query = `
      ;WITH tag_list AS (
        SELECT TRIM(value) AS slug
        FROM STRING_SPLIT(@tags, ',')
        WHERE @tags IS NOT NULL AND TRIM(value) <> ''
      ),
      filtered_books AS (
        SELECT b.id, b.title, b.[year], b.slug, b.cover_url, b.is_public_domain, a.name AS author
        FROM dbo.books b
        JOIN dbo.authors a ON a.id = b.author_id
        WHERE ( @q IS NULL OR
                b.title COLLATE Latin1_General_CI_AI LIKE @q OR
                a.name COLLATE Latin1_General_CI_AI LIKE @q )
          AND ( @domain IS NULL OR
                (@domain = N'public' AND b.is_public_domain = 1) OR
                (@domain = N'non-public' AND b.is_public_domain = 0) )
          AND ( @yearFrom IS NULL OR b.[year] >= @yearFrom )
          AND ( @yearTo IS NULL OR b.[year] <= @yearTo )
          AND (
            -- se não passou tag, ignora filtro de tag
            NOT EXISTS (SELECT 1 FROM tag_list)
            OR NOT EXISTS (
              SELECT 1
              FROM tag_list tl
              WHERE NOT EXISTS (
                SELECT 1
                FROM dbo.books_tags bt
                JOIN dbo.tags t ON t.id = bt.tag_id
                WHERE bt.book_id = b.id AND t.slug = tl.slug
              )
            )
          )
      )
      SELECT (SELECT COUNT(1) FROM filtered_books) AS total,
             (SELECT STRING_AGG(CONVERT(NVARCHAR(100), slug), ',') FROM tag_list) AS tags_aplicadas,
             fb.*
      FROM filtered_books fb
      ORDER BY fb.[year]
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY;
    `;

    const result = await request.query(query);

    // pega o total e as tags aplicadas da primeira linha (se tiver)
    const total = result.recordset.length ? result.recordset[0].total : 0;
    const tagsAplicadas = result.recordset.length ? result.recordset[0].tags_aplicadas : null;

    // monta o array só com os dados que interessam pro frontend
    const items = result.recordset.map(r => ({
      id: r.id,
      title: r.title,
      year: r.year,
      slug: r.slug,
      cover_url: r.cover_url,
      is_public_domain: !!r.is_public_domain,
      author: r.author
    }));

    // responde com JSON
    res.json({
      total,
      page: p,
      pageSize: ps,
      tags: tagsAplicadas ? tagsAplicadas.split(',').filter(Boolean) : [],
      items
    });
  } catch (err) {
    console.error('GET /books deu erro:', err);
    res.status(500).json({ error: 'Deu ruim ao listar os livros' });
  }
});

// Rota pra pegar detalhes de um livro pelo id
router.get('/:id', async (req, res) => {
  try {
    const pool = await getPool();
    const request = pool.request();
    request.input('id', sql.Int, parseInt(req.params.id, 10));

    const rs = await request.query(`
      SELECT b.*, a.name AS author
      FROM dbo.books b
      JOIN dbo.authors a ON a.id = b.author_id
      WHERE b.id = @id
    `);

    if (!rs.recordset.length) {
      return res.status(404).json({ error: 'Livro não achado' });
    }

    res.json(rs.recordset[0]);
  } catch (err) {
    console.error('GET /books/:id deu erro:', err);
    res.status(500).json({ error: 'Deu ruim ao buscar o livro' });
  }
});

// Rota pra pegar os links relacionados ao livro (fonte, onde comprar, etc)
router.get('/:id/links', async (req, res) => {
  try {
    const pool = await getPool();
    const request = pool.request();
    request.input('id', sql.Int, parseInt(req.params.id, 10));

    const rs = await request.query(`
      SELECT kind, label, url
      FROM dbo.links
      WHERE book_id = @id
      ORDER BY CASE kind
        WHEN 'source' THEN 0
        WHEN 'read_online' THEN 1
        WHEN 'library' THEN 2
        WHEN 'buy' THEN 3
        ELSE 9 END, label
    `);

    res.json(rs.recordset);
  } catch (err) {
    console.error('GET /books/:id/links deu erro:', err);
    res.status(500).json({ error: 'Deu ruim ao buscar os links' });
  }
});

export default router;