const { Pool } = require('pg');
require('dotenv').config();

// Configurações para testar
const configs = [
  { name: "Sem senha", url: "postgresql://postgres@localhost:5432/gratuz" },
  { name: "Senha vazia", url: "postgresql://postgres:@localhost:5432/gratuz" },
  { name: "Senha postgres", url: "postgresql://postgres:postgres@localhost:5432/gratuz" },
  { name: "Senha admin", url: "postgresql://postgres:admin@localhost:5432/gratuz" },
  { name: "Senha 123456", url: "postgresql://postgres:123456@localhost:5432/gratuz" },
  { name: "Senha password", url: "postgresql://postgres:password@localhost:5432/gratuz" },
  { name: "Senha Sidi@2025", url: "postgresql://postgres:Sidi@2025@localhost:5432/gratuz" },
  { name: "Host 127.0.0.1", url: "postgresql://postgres@127.0.0.1:5432/gratuz" },
  { name: "Host 127.0.0.1 com senha", url: "postgresql://postgres:postgres@127.0.0.1:5432/gratuz" }
];

async function testConnection(config) {
  const pool = new Pool({ connectionString: config.url });
  
  try {
    console.log(`\n🔍 Testando: ${config.name}`);
    console.log(`   URL: ${config.url}`);
    
    const result = await pool.query('SELECT NOW() as current_time, current_database() as db_name');
    console.log(`   ✅ SUCESSO!`);
    console.log(`   ⏰ Hora: ${result.rows[0].current_time}`);
    console.log(`   🗄️  Banco: ${result.rows[0].db_name}`);
    
    // Testar se as tabelas existem
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    if (tables.rows.length > 0) {
      console.log(`   📋 Tabelas: ${tables.rows.map(t => t.table_name).join(', ')}`);
    } else {
      console.log(`   📋 Nenhuma tabela encontrada`);
    }
    
    await pool.end();
    return { success: true, config };
    
  } catch (error) {
    console.log(`   ❌ FALHOU: ${error.message}`);
    await pool.end();
    return { success: false, config, error: error.message };
  }
}

async function testAllConnections() {
  console.log('🚀 Testando todas as configurações de conexão...\n');
  
  const results = [];
  
  for (const config of configs) {
    const result = await testConnection(config);
    results.push(result);
    
    // Se uma conexão funcionou, vamos testar mais algumas coisas
    if (result.success) {
      console.log(`\n🔧 Testando funcionalidades adicionais...`);
      
      const pool = new Pool({ connectionString: config.url });
      try {
        // Testar se conseguimos criar tabelas
        await pool.query(`
          CREATE TABLE IF NOT EXISTS test_connection (
            id SERIAL PRIMARY KEY,
            test_time TIMESTAMP DEFAULT NOW()
          )
        `);
        console.log(`   ✅ Criação de tabela: OK`);
        
        // Testar inserção
        await pool.query('INSERT INTO test_connection (test_time) VALUES (NOW())');
        console.log(`   ✅ Inserção: OK`);
        
        // Testar consulta
        const testResult = await pool.query('SELECT COUNT(*) as count FROM test_connection');
        console.log(`   ✅ Consulta: OK (${testResult.rows[0].count} registros)`);
        
        // Limpar tabela de teste
        await pool.query('DROP TABLE test_connection');
        console.log(`   ✅ Limpeza: OK`);
        
        await pool.end();
        
        console.log(`\n🎉 CONFIGURAÇÃO FUNCIONAL ENCONTRADA!`);
        console.log(`📝 Use esta configuração no seu .env:`);
        
        return config;
        
      } catch (error) {
        console.log(`   ❌ Erro em funcionalidades: ${error.message}`);
        await pool.end();
      }
    }
  }
  
  console.log(`\n📊 RESUMO DOS TESTES:`);
  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;
  
  console.log(`✅ Sucessos: ${successCount}`);
  console.log(`❌ Falhas: ${failCount}`);
  
  if (successCount === 0) {
    console.log(`\n💡 NENHUMA CONEXÃO FUNCIONOU!`);
    console.log(`🔧 Possíveis soluções:`);
    console.log(`1. Verifique se o PostgreSQL está rodando`);
    console.log(`2. Verifique se o banco 'gratuz' existe`);
    console.log(`3. Verifique a senha do usuário postgres`);
    console.log(`4. Tente conectar via pgAdmin ou psql primeiro`);
  }
  
  return null;
}

testAllConnections(); 