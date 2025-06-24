const pool = require('./db.js');

async function testConnection() {
  try {
    console.log('Testando conexão com o banco...');
    const result = await pool.query('SELECT NOW()');
    console.log('✅ Conexão OK:', result.rows[0]);
    
    // Testar se as tabelas existem
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log('📋 Tabelas encontradas:', tables.rows.map(t => t.table_name));
    
    // Testar se há usuários
    const users = await pool.query('SELECT COUNT(*) as count FROM usuarios');
    console.log('👥 Usuários no banco:', users.rows[0].count);
    
  } catch (error) {
    console.error('❌ Erro de conexão:', error.message);
  } finally {
    await pool.end();
  }
}

testConnection(); 