// src/db.js
// Aqui a gente cria a conexão com o banco de dados Azure SQL
import sql from 'mssql';

let pool; // guarda a conexão pra não ficar abrindo toda hora

export async function getPool() {
  if (pool) return pool; // se já tiver conexão, usa ela

  // configurações do banco, pega do .env
  const config = {
    server: process.env.DB_SERVER, // endereço do banco
    port: parseInt(process.env.DB_PORT || '1433', 10), // porta padrão 1433
    database: process.env.DB_NAME, // nome do banco
    user: process.env.DB_USER, // usuário
    password: process.env.DB_PASSWORD, // senha
    options: {
      encrypt: process.env.DB_ENCRYPT !== 'false', // se usa criptografia (Azure precisa)
      trustServerCertificate: process.env.DB_TRUST_CERT === 'true' // pra dev local
    },
    pool: { max: 10, min: 1, idleTimeoutMillis: 30000 } // configura o pool de conexões
  };

  pool = await sql.connect(config); // conecta e guarda o pool
  return pool;
}

export { sql };