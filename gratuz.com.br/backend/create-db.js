const { Pool } = require('pg');
require('dotenv').config();

// Conectar ao banco postgres (banco padrão)
const pool = new Pool({
  connectionString: "postgresql://postgres@localhost:5432/postgres"
});

async function createDatabase() {
  try {
    console.log('🔍 Verificando se o banco gratuz_db existe...');
    
    // Verificar se o banco existe
    const result = await pool.query(`
      SELECT 1 FROM pg_database WHERE datname = 'gratuz_db'
    `);
    
    if (result.rows.length === 0) {
      console.log('📝 Criando banco de dados gratuz_db...');
      await pool.query('CREATE DATABASE gratuz_db');
      console.log('✅ Banco gratuz_db criado com sucesso!');
    } else {
      console.log('✅ Banco gratuz_db já existe!');
    }
    
  } catch (error) {
    console.error('❌ Erro ao criar banco:', error.message);
    
    // Se der erro de autenticação, vamos tentar outras opções
    if (error.message.includes('autenticação') || error.message.includes('password')) {
      console.log('\n💡 Dicas para resolver:');
      console.log('1. Verifique se o PostgreSQL está rodando');
      console.log('2. Tente conectar com: psql -U postgres');
      console.log('3. Se pedir senha, use a senha que você definiu na instalação');
      console.log('4. Ou configure autenticação trust no pg_hba.conf');
    }
  } finally {
    await pool.end();
  }
}

createDatabase(); 