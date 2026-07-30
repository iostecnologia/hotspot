const path = require('path');
const envFile = process.env.NODE_ENV === 'development' ? '.env.dev' : '.env';
require('dotenv').config({ path: path.join(__dirname, '..', envFile) });
const db = require('../db');

async function migrate() {
  const conn = await db.getConnection();
  try {
    console.log('=== Migration 016: Vouchers ===\n');

    console.log('Criando tabela vouchers...');
    await conn.query(`
      CREATE TABLE IF NOT EXISTS vouchers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        empresa_id INT NOT NULL,
        plano_id INT NOT NULL,
        codigo VARCHAR(50) NOT NULL UNIQUE,
        status ENUM('disponivel', 'ativo', 'expirado') NOT NULL DEFAULT 'disponivel',
        mac VARCHAR(17) NULL,
        data_ativacao TIMESTAMP NULL,
        expira_em TIMESTAMP NULL,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_vouchers_empresa (empresa_id),
        INDEX idx_vouchers_codigo (codigo)
      )
    `);

    console.log('\nMigration 016 concluida com sucesso!');
  } catch (err) {
    console.error('Erro na migration 016:', err);
    throw err;
  } finally {
    conn.release();
    process.exit(0);
  }
}

migrate();
