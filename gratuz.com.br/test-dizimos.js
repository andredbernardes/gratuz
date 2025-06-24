// Script de teste para verificar dados de dízimos
const db = require('./backend/db');

async function testarDizimos() {
  try {
    console.log('🔍 Testando dados de dízimos...');
    
    // Verificar se a tabela existe
    const tabelaExiste = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'dizimos'
      );
    `);
    
    if (!tabelaExiste.rows[0].exists) {
      console.log('❌ Tabela dizimos não existe!');
      return;
    }
    
    console.log('✅ Tabela dizimos existe');
    
    // Verificar estrutura da tabela
    const colunas = await db.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'dizimos' 
      ORDER BY ordinal_position;
    `);
    
    console.log('📋 Estrutura da tabela dizimos:');
    colunas.rows.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type}`);
    });
    
    // Verificar se há dados
    const count = await db.query('SELECT COUNT(*) as total FROM dizimos');
    console.log(`📊 Total de registros: ${count.rows[0].total}`);
    
    if (parseInt(count.rows[0].total) > 0) {
      // Mostrar alguns registros de exemplo
      const registros = await db.query('SELECT * FROM dizimos ORDER BY id DESC LIMIT 5');
      console.log('📝 Últimos 5 registros:');
      registros.rows.forEach((reg, index) => {
        console.log(`   ${index + 1}. ID: ${reg.id}, Nome: ${reg.nome_membro}, Valor: ${reg.valor}, Tipo: ${reg.tipotributo}, Data: ${reg.data_pagamento}`);
      });
    }
    
    // Inserir um registro de teste se não houver dados
    if (parseInt(count.rows[0].total) === 0) {
      console.log('➕ Inserindo registro de teste...');
      
      // Primeiro, verificar se há usuários
      const usuariosCount = await db.query('SELECT COUNT(*) as total FROM usuarios');
      if (parseInt(usuariosCount.rows[0].total) === 0) {
        console.log('❌ Não há usuários cadastrados. Execute a migração primeiro.');
        return;
      }
      
      // Pegar o primeiro usuário
      const usuario = await db.query('SELECT id FROM usuarios LIMIT 1');
      const usuarioId = usuario.rows[0].id;
      
      await db.query(`
        INSERT INTO dizimos (usuario_id, nome_membro, valor, data_pagamento, tipotributo)
        VALUES ($1, $2, $3, $4, $5)
      `, [usuarioId, 'João Silva', 100.00, '2024-01-15', 'DIZIMO']);
      
      console.log('✅ Registro de teste inserido com sucesso!');
    }
    
  } catch (error) {
    console.error('❌ Erro durante o teste:', error);
  } finally {
    await db.end();
  }
}

testarDizimos(); 