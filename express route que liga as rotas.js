// src/server.js
// Aqui é o arquivo principal que monta o servidor Express e liga as rotas
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import booksRouter from './routes/books.js';
import tagsRouter from './routes/tags.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const corsOrigin = process.env.CORS_ORIGIN || '*';

// Usa uns middlewares pra segurança e performance
app.use(helmet());           // coloca uns cabeçalhos de segurança
app.use(compression());      // comprime as respostas pra economizar banda
app.use(express.json());     // entende JSON no corpo das requisições
app.use(cors({ origin: corsOrigin })); // libera CORS só pro domínio que você quiser

// Rota simples pra ver se o servidor tá vivo
app.get('/health', (_req, res) => res.json({ ok: true }));

// Liga as rotas que criamos
app.use('/books', booksRouter);
app.use('/tags', tagsRouter);

// Se a rota não existir, responde 404
app.use((_req, res) => res.status(404).json({ error: 'Rota não encontrada' }));

// Se der erro não tratado, responde 500
app.use((err, _req, res, _next) => {
  console.error('Erro não tratado:', err);
  res.status(500).json({ error: 'Erro interno' });
});

// Começa o servidor
app.listen(port, () => {
  console.log(`API rodando em http://localhost:${port}`);
});