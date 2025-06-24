// Script de migração do banco de dados
const db = require('./db');

async function migrate() {
  console.log('🔄 Iniciando migração do banco de dados...');
  
  try {
    // Criar tabela usuarios
    await db.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        senha VARCHAR(255) NOT NULL,
        perfil VARCHAR(50) NOT NULL DEFAULT 'MEMBRO',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Tabela usuarios criada/verificada');

    // Criar tabela igrejas
    await db.query(`
      CREATE TABLE IF NOT EXISTS igrejas (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        endereco TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Tabela igrejas criada/verificada');

    // Adicionar coluna igreja_id na tabela usuarios se não existir
    await db.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name='usuarios' AND column_name='igreja_id') THEN
          ALTER TABLE usuarios ADD COLUMN igreja_id INTEGER REFERENCES igrejas(id);
        END IF;
      END $$;
    `);
    console.log('✅ Coluna igreja_id verificada na tabela usuarios');

    // Garante a existência e os valores corretos para o tipo ENUM 'tipo_tributo'
    await db.query(`
      DO $$
      BEGIN
          -- Se o tipo ENUM 'tipo_tributo' não existir, cria-o com todos os valores corretos.
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_tributo') THEN
              CREATE TYPE tipo_tributo AS ENUM ('DIZIMO', 'OFERTA', 'SEMEADURA', 'PRIMICIA');
          ELSE
              -- Se o tipo já existir, garante que todos os valores necessários estão presentes.
              -- Isso corrige ENUMs em estado "quebrado" sem gerar erros.
              ALTER TYPE tipo_tributo ADD VALUE IF NOT EXISTS 'DIZIMO';
              ALTER TYPE tipo_tributo ADD VALUE IF NOT EXISTS 'OFERTA';
              ALTER TYPE tipo_tributo ADD VALUE IF NOT EXISTS 'SEMEADURA';
              ALTER TYPE tipo_tributo ADD VALUE IF NOT EXISTS 'PRIMICIA';
          END IF;
      END
      $$;
    `);
    console.log('✅ Tipo ENUM tipo_tributo criado/atualizado com todos os valores.');

    // Criar tabela dizimos se não existir
    await db.query(`
      CREATE TABLE IF NOT EXISTS dizimos (
        id SERIAL PRIMARY KEY,
        usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
        nome_membro VARCHAR(255) NOT NULL,
        valor DECIMAL(10,2) NOT NULL,
        data_pagamento DATE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Tabela dizimos (base) criada/verificada.');
    
    // Garante que a coluna 'igreja_id' existe.
    await db.query(`
        ALTER TABLE dizimos ADD COLUMN IF NOT EXISTS igreja_id INTEGER REFERENCES igrejas(id) ON DELETE SET NULL;
    `);
    console.log('✅ Coluna igreja_id garantida na tabela dizimos.');

    // Garante que a coluna 'tipotributo' exista, mas remove a lógica de conversão complexa
    // para focar apenas na correção do ENUM. O banco de dados fará a coerção.
    await db.query(`
        ALTER TABLE dizimos ADD COLUMN IF NOT EXISTS tipotributo tipo_tributo DEFAULT 'DIZIMO';
    `);
    console.log('✅ Coluna tipotributo verificada.');

    // Criar tabela celulas
    await db.query(`
      CREATE TABLE IF NOT EXISTS celulas (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        igreja_id INTEGER NOT NULL REFERENCES igrejas(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Tabela celulas criada/verificada');

    // Criar tabela usuarios_celulas
    await db.query(`
      CREATE TABLE IF NOT EXISTS usuarios_celulas (
        usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
        celula_id INTEGER NOT NULL REFERENCES celulas(id) ON DELETE CASCADE,
        admin BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (usuario_id, celula_id)
      )
    `);
    console.log('✅ Tabela usuarios_celulas criada/verificada');

    // Criar índices para melhor performance
    await db.query('CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email)');
    await db.query('CREATE INDEX IF NOT EXISTS idx_usuarios_igreja ON usuarios(igreja_id)');
    await db.query('CREATE INDEX IF NOT EXISTS idx_celulas_igreja ON celulas(igreja_id)');
    await db.query('CREATE INDEX IF NOT EXISTS idx_dizimos_usuario ON dizimos(usuario_id)');
    await db.query('CREATE INDEX IF NOT EXISTS idx_dizimos_data ON dizimos(data_pagamento)');
    
    console.log('✅ Índices criados/verificados');

    // Inserir dados de exemplo se as tabelas estiverem vazias
    const igrejasCount = await db.query('SELECT COUNT(*) FROM igrejas');
    if (parseInt(igrejasCount.rows[0].count) === 0) {
      await db.query(`
        INSERT INTO igrejas (nome, endereco) VALUES 
        ('Igreja Exemplo', 'Rua Exemplo, 123 - Centro')
      `);
      console.log('✅ Dados de exemplo inseridos');
    }

    // Inserir usuário admin padrão se não existir
    const usuariosCount = await db.query('SELECT COUNT(*) FROM usuarios');
    if (parseInt(usuariosCount.rows[0].count) === 0) {
      await db.query(`
        INSERT INTO usuarios (nome, email, senha, perfil) VALUES 
        ('Administrador', 'admin@gratuz.com', '123456', 'ADMIN')
      `);
      console.log('✅ Usuário admin padrão criado (admin@gratuz.com / 123456)');
    }

    console.log('🎉 Migração concluída com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro durante a migração:', error);
    process.exit(1);
  } finally {
    await db.end();
  }
}

// Executar migração se o arquivo for executado diretamente
if (require.main === module) {
  migrate();
}

module.exports = migrate; 