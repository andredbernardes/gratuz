const db = require('../db');

async function listarCelulas(req, res) {
  const { igreja_id } = req.query;
  
  try {
    let query = `
      SELECT c.id, c.nome, c.igreja_id, i.nome AS igreja
      FROM celulas c
      JOIN igrejas i ON c.igreja_id = i.id
    `;
    
    let params = [];
    
    // Se igreja_id foi fornecido, filtrar por igreja
    if (igreja_id) {
      query += ' WHERE c.igreja_id = $1';
      params.push(igreja_id);
    }
    
    query += ' ORDER BY c.nome';
    
    const resultado = await db.query(query, params);
    res.json(resultado.rows);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao listar células' });
  }
}

async function criarCelula(req, res) {
  const { nome, igreja_id } = req.body;
  const usuario = req.usuario;

  // Validação
  if (!nome || !igreja_id) {
    return res.status(400).json({ erro: 'Nome e igreja_id são obrigatórios' });
  }

  // Se for Pastor, só pode cadastrar célula na própria igreja
  if (usuario.perfil === 'PASTOR' && String(igreja_id) !== String(usuario.igreja_id)) {
    return res.status(403).json({ erro: 'Pastor só pode cadastrar células na sua própria igreja.' });
  }

  try {
    // Verificar se a igreja existe
    const igrejaExistente = await db.query('SELECT id FROM igrejas WHERE id = $1', [igreja_id]);
    if (igrejaExistente.rows.length === 0) {
      return res.status(400).json({ erro: 'Igreja não encontrada' });
    }

    // Verificar se já existe uma célula com o mesmo nome na igreja
    const celulaExistente = await db.query(
      'SELECT id FROM celulas WHERE nome = $1 AND igreja_id = $2',
      [nome, igreja_id]
    );
    
    if (celulaExistente.rows.length > 0) {
      return res.status(409).json({ erro: 'Já existe uma célula com este nome nesta igreja' });
    }

    const resultado = await db.query(
      'INSERT INTO celulas (nome, igreja_id) VALUES ($1, $2) RETURNING id, nome, igreja_id',
      [nome, igreja_id]
    );
    
    res.status(201).json({ 
      mensagem: 'Célula cadastrada com sucesso',
      celula: resultado.rows[0]
    });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao criar célula' });
  }
}

// Nova rota: listar células do pastor logado
async function listarCelulasDoPastor(req, res) {
  const { id: usuarioId, perfil } = req.usuario;
  if (perfil !== 'PASTOR') return res.status(403).json({ erro: 'Acesso negado' });
  try {
    const resultado = await db.query(`
      SELECT c.id, c.nome, c.igreja_id
      FROM celulas c
      INNER JOIN usuarios_celulas uc ON c.id = uc.celula_id
      WHERE uc.usuario_id = $1
      ORDER BY c.nome
    `, [usuarioId]);
    res.json(resultado.rows);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao buscar células do pastor' });
  }
}

module.exports = { listarCelulas, criarCelula, listarCelulasDoPastor };