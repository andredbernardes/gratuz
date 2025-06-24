const db = require('../db');

async function listarIgrejas(req, res) {
  try {
    const resultado = await db.query('SELECT id, nome FROM igrejas ORDER BY nome');
    res.json(resultado.rows);
  } catch (err) {
    console.error('Erro ao listar igrejas:', err);
    res.status(500).json({ erro: 'Erro ao listar igrejas' });
  }
}

async function criarIgreja(req, res) {
  const { nome } = req.body;
  
  // Validação
  if (!nome) {
    return res.status(400).json({ erro: 'Nome da igreja é obrigatório' });
  }

  if (nome.trim().length < 3) {
    return res.status(400).json({ erro: 'Nome da igreja deve ter pelo menos 3 caracteres' });
  }

  try {
    // Verificar se já existe uma igreja com o mesmo nome
    const igrejaExistente = await db.query('SELECT id FROM igrejas WHERE LOWER(nome) = LOWER($1)', [nome.trim()]);
    if (igrejaExistente.rows.length > 0) {
      return res.status(409).json({ erro: 'Já existe uma igreja com este nome' });
    }

    const resultado = await db.query(
      'INSERT INTO igrejas (nome) VALUES ($1) RETURNING id, nome',
      [nome.trim()]
    );
    
    res.status(201).json({ 
      mensagem: 'Igreja cadastrada com sucesso',
      igreja: resultado.rows[0]
    });
  } catch (err) {
    console.error('Erro ao criar igreja:', err);
    res.status(500).json({ erro: 'Erro ao criar igreja' });
  }
}

module.exports = { listarIgrejas, criarIgreja };