// backend/controllers/dizimosController.js
const db = require('../db');

async function registrarDizimo(req, res) {
  const { nome_membro, valor, data_pagamento, tipoTributo } = req.body;
  // Pega o id e a igreja_id do usuário logado (do token)
  const { id: usuario_id, igreja_id } = req.usuario;

  // Validação para garantir que o usuário pertence a uma igreja
  if (!igreja_id) {
    return res.status(400).json({ erro: 'Usuário não está associado a nenhuma igreja. Não é possível registrar a entrada.' });
  }

  try {
    await db.query(`
      INSERT INTO dizimos (usuario_id, igreja_id, nome_membro, valor, data_pagamento, tipotributo)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [usuario_id, igreja_id, nome_membro, valor, data_pagamento, tipoTributo]);

    res.status(201).json({ mensagem: 'Dízimo registrado com sucesso' });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao registrar dízimo' });
  }
}


// GET /dizimos
const getDizimos = async (req, res) => {
  const { perfil, igreja_id: igrejaUsuarioId, id: usuarioId } = req.usuario;
  const { search, igrejaId } = req.query;

  try {
    let query = `
      SELECT d.*, u.igreja_id 
      FROM dizimos d
      LEFT JOIN usuarios u ON d.usuario_id = u.id
    `;
    const params = [];
    const whereClauses = [];

    // Lógica de permissão
    if (perfil === 'ADMIN') {
      whereClauses.push(`u.igreja_id = $${params.length + 1}`);
      params.push(igrejaUsuarioId);
    } else if (perfil === 'PASTOR') {
      // 1. Encontra as células do pastor
      const { rows: celulasDoPastor } = await db.query('SELECT celula_id FROM usuarios_celulas WHERE usuario_id = $1', [usuarioId]);
      
      if (celulasDoPastor.length === 0) {
        // Se o pastor não lidera células, ele só pode ver os seus próprios dízimos.
        whereClauses.push(`d.usuario_id = $${params.length + 1}`);
        params.push(usuarioId);
      } else {
        const celulaIds = celulasDoPastor.map(c => c.celula_id);
        // 2. Monta a cláusula para buscar os dízimos de todos os usuários dessas células
        whereClauses.push(`d.usuario_id IN (SELECT usuario_id FROM usuarios_celulas WHERE celula_id = ANY($${params.length + 1}))`);
        params.push(celulaIds);
      }
    } else if (perfil === 'MEMBRO') {
      whereClauses.push(`d.usuario_id = $${params.length + 1}`);
      params.push(usuarioId);
    }
    // SUPER_ADMIN não tem filtro por padrão.

    // Filtros da requisição
    if (search) {
      whereClauses.push(`d.nome_membro ILIKE $${params.length + 1}`);
      params.push(`%${search}%`);
    }
    // O filtro de igreja só se aplica a SUPER_ADMINs e ADMINs.
    if (igrejaId && (perfil === 'SUPER_ADMIN' || perfil === 'ADMIN')) {
      whereClauses.push(`u.igreja_id = $${params.length + 1}`);
      params.push(igrejaId);
    }

    if (whereClauses.length > 0) {
      query += ' WHERE ' + whereClauses.join(' AND ');
    }

    query += ' ORDER BY d.data_pagamento DESC, d.id DESC';
    
    const { rows } = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
};

module.exports = { registrarDizimo, getDizimos };
