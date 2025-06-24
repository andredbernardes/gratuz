const db = require('../db');

// Listar todos os usuários com filtros
const carregarUsuarios = async (req, res) => {
  const { id: usuarioLogadoId, perfil: perfilUsuario, igreja_id: igrejaUsuarioId } = req.usuario;
  const { search, perfil, igrejaId } = req.query;

  try {
    let query = `
      SELECT 
        u.id, u.nome, u.email, u.perfil, u.igreja_id,
        i.nome AS igreja_nome, 
        ARRAY_REMOVE(ARRAY_AGG(DISTINCT c.nome), NULL) AS celulas,
        ARRAY_REMOVE(ARRAY_AGG(DISTINCT c.id), NULL) AS celulas_id,
        ARRAY_REMOVE(ARRAY_AGG(uc.admin), NULL) AS admin_celulas
      FROM usuarios u
      LEFT JOIN usuarios_celulas uc ON uc.usuario_id = u.id
      LEFT JOIN celulas c ON uc.celula_id = c.id
      LEFT JOIN igrejas i ON u.igreja_id = i.id
    `;

    const params = [];
    const whereClauses = [];

    // Lógica de permissão baseada no perfil do usuário logado
    if (perfilUsuario === 'ADMIN') {
      whereClauses.push(`u.igreja_id = $${params.length + 1}`);
      params.push(igrejaUsuarioId);
    } else if (perfilUsuario === 'PASTOR') {
      // 1. Encontra as células do pastor
      const { rows: celulasDoPastor } = await db.query('SELECT celula_id FROM usuarios_celulas WHERE usuario_id = $1', [usuarioLogadoId]);
      
      if (celulasDoPastor.length === 0) {
        // Se o pastor não lidera células, ele só pode ver a si mesmo.
        whereClauses.push(`u.id = $${params.length + 1}`);
        params.push(usuarioLogadoId);
      } else {
        const celulaIds = celulasDoPastor.map(c => c.celula_id);
        // Busca todos os usuários vinculados a essas células OU o próprio pastor, sem duplicidade
        whereClauses.push(`(u.id = $${params.length + 2} OR u.id IN (SELECT usuario_id FROM usuarios_celulas WHERE celula_id = ANY($${params.length + 1})))`);
        params.push(celulaIds, usuarioLogadoId);
      }
    } else if (perfilUsuario === 'MEMBRO') {
      whereClauses.push(`u.id = $${params.length + 1}`);
      params.push(usuarioLogadoId);
    }
    // SUPER_ADMIN não tem cláusula, vê todos.

    // Filtros da requisição (query params)
    if (search) {
      whereClauses.push(`(u.nome ILIKE $${params.length + 1} OR u.email ILIKE $${params.length + 1})`);
      params.push(`%${search}%`);
    }
    if (perfil) {
      whereClauses.push(`u.perfil = $${params.length + 1}`);
      params.push(perfil);
    }
    // O filtro de igreja só se aplica a SUPER_ADMINs e ADMINs.
    if (igrejaId && (perfilUsuario === 'SUPER_ADMIN' || perfilUsuario === 'ADMIN')) {
      whereClauses.push(`u.igreja_id = $${params.length + 1}`);
      params.push(igrejaId);
    }

    if (whereClauses.length > 0) {
      query += ' WHERE ' + whereClauses.join(' AND ');
    }
    
    query += ' GROUP BY u.id, u.nome, u.email, u.perfil, u.igreja_id, i.nome';
    query += ' ORDER BY u.nome ASC';

    const { rows } = await db.query(query, params);
    res.json(rows);
  } catch (error) {
    console.error('Erro ao buscar usuários:', error);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
};

// POST /usuarios
async function cadastrarUsuario(req, res) {
  const { nome, email, senha, perfil, igreja_id, celula_id } = req.body;

  // Validação
  if (!nome || !email || !senha || !perfil) {
    return res.status(400).json({ erro: 'Nome, email, senha e perfil são obrigatórios' });
  }

  if (senha.length < 6) {
    return res.status(400).json({ erro: 'Senha deve ter pelo menos 6 caracteres' });
  }

  const perfisValidos = ['SUPER_ADMIN', 'ADMIN', 'PASTOR', 'MEMBRO'];
  if (!perfisValidos.includes(perfil)) {
    return res.status(400).json({ erro: 'Perfil inválido' });
  }

  try {
    // Verifica se email já existe (de forma mais robusta)
    const emailExistente = await db.query(
      'SELECT id FROM usuarios WHERE LOWER(TRIM(email)) = LOWER(TRIM($1))', 
      [email]
    );
    if (emailExistente.rows.length > 0) {
      return res.status(409).json({ erro: 'Email já cadastrado' });
    }

    // Validação extra para PASTOR
    if (req.usuario.perfil === 'PASTOR') {
      // Só pode cadastrar na própria igreja
      if (igreja_id != req.usuario.igreja_id) {
        return res.status(403).json({ erro: 'Pastor só pode cadastrar membros na sua própria igreja.' });
      }
      // Só pode cadastrar MEMBRO ou PASTOR
      if (perfil !== 'MEMBRO' && perfil !== 'PASTOR') {
        return res.status(403).json({ erro: 'Pastor só pode cadastrar usuários com perfil Membro ou Pastor.' });
      }
      // Se informar celula_id, só pode ser de uma célula à qual ele está associado
      if (celula_id) {
        const celulasDoPastor = await db.query('SELECT celula_id FROM usuarios_celulas WHERE usuario_id = $1', [req.usuario.id]);
        const celulaIds = celulasDoPastor.rows.map(c => c.celula_id);
        if (!celulaIds.includes(Number(celula_id))) {
          return res.status(403).json({ erro: 'Pastor só pode cadastrar membros em células às quais está associado.' });
        }
      }
    }

    // Verifica se igreja existe (se fornecida)
    if (igreja_id) {
      const igrejaExistente = await db.query('SELECT id FROM igrejas WHERE id = $1', [igreja_id]);
      if (igrejaExistente.rows.length === 0) {
        return res.status(400).json({ erro: 'Igreja não encontrada' });
      }
    }

    // Insere usuário diretamente, sem transação explícita para uma única operação.
    const resultado = await db.query(
      'INSERT INTO usuarios (nome, email, senha, perfil, igreja_id, celula_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, nome, email, perfil, celula_id',
      [nome, email, senha, perfil, igreja_id || null, celula_id || null]
    );

    const novoUsuario = resultado.rows[0];

    // Se foi informada célula, cria o vínculo na tabela usuarios_celulas
    if (celula_id) {
      await db.query(
        'INSERT INTO usuarios_celulas (usuario_id, celula_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [novoUsuario.id, celula_id]
      );
    }

    res.status(201).json(novoUsuario);

  } catch (err) {
    console.error('Erro ao cadastrar usuário:', err);
    if (err.code === '23505') { // Unique violation
      res.status(409).json({ erro: 'Email já cadastrado' });
    } else {
      res.status(500).json({ erro: 'Erro ao cadastrar usuário' });
    }
  }
}

// GET /usuarios/perfil
async function getMeuPerfil(req, res) {
  const usuarioId = req.usuario.id;
  try {
    const resultado = await db.query('SELECT id, nome, email, perfil FROM usuarios WHERE id = $1', [usuarioId]);
    if (resultado.rows.length === 0) {
      return res.status(404).json({ erro: 'Usuário não encontrado' });
    }
    res.json(resultado.rows[0]);
  } catch (err) {
    console.error('Erro ao buscar perfil:', err);
    res.status(500).json({ erro: 'Erro ao buscar perfil' });
  }
}

// PUT /usuarios/perfil
async function updateMeuPerfil(req, res) {
  const usuarioId = req.usuario.id;
  const { nome, senha } = req.body;

  if (!nome) {
    return res.status(400).json({ erro: 'O nome é obrigatório' });
  }
  
  try {
    let query, params;
    
    if (senha) {
      // Atualiza nome e senha
      if (senha.length < 6) {
        return res.status(400).json({ erro: 'A nova senha deve ter pelo menos 6 caracteres' });
      }
      query = 'UPDATE usuarios SET nome = $1, senha = $2 WHERE id = $3 RETURNING id, nome, email, perfil';
      params = [nome, senha, usuarioId];
    } else {
      // Atualiza apenas o nome
      query = 'UPDATE usuarios SET nome = $1 WHERE id = $2 RETURNING id, nome, email, perfil';
      params = [nome, usuarioId];
    }
    
    const resultado = await db.query(query, params);
    res.json(resultado.rows[0]);

  } catch (err) {
    console.error('Erro ao atualizar perfil:', err);
    res.status(500).json({ erro: 'Erro ao atualizar perfil' });
  }
}

// Listar membros para preencher o select de dízimos
async function listarMembrosParaDizimo(req, res) {
  const { perfil, igreja_id, id: usuarioId, nome } = req.usuario;

  try {
    let query;
    let params = [];

    if (perfil === 'ADMIN') {
      // Admin vê todos os usuários
      query = 'SELECT id, nome FROM usuarios ORDER BY nome ASC';
    } else if (perfil === 'PASTOR') {
      // Pastor vê todos os membros da sua igreja
      query = 'SELECT id, nome FROM usuarios WHERE igreja_id = $1 ORDER BY nome ASC';
      params = [igreja_id];
    } else { // MEMBRO
      // Membro só pode se ver
      return res.json([{ id: usuarioId, nome }]);
    }

    const { rows } = await db.query(query, params);
    res.json(rows);

  } catch (err) {
    console.error('Erro ao listar membros para dízimo:', err);
    res.status(500).json({ erro: 'Erro ao buscar lista de membros' });
  }
}

// PUT /usuarios/:id
async function editarUsuario(req, res) {
  const usuarioId = req.params.id;
  const { nome, email, perfil, igreja_id, celula_id, senha, celulas } = req.body;
  if (!nome || !email || !perfil) {
    return res.status(400).json({ erro: 'Nome, email e perfil são obrigatórios' });
  }
  try {
    let query = 'UPDATE usuarios SET nome = $1, email = $2, perfil = $3, igreja_id = $4, celula_id = $5';
    let params = [nome, email, perfil, igreja_id || null, celula_id || null];
    if (senha) {
      query += ', senha = $6 WHERE id = $7 RETURNING id, nome, email, perfil, igreja_id, celula_id';
      params.push(senha, usuarioId);
    } else {
      query += ' WHERE id = $6 RETURNING id, nome, email, perfil, igreja_id, celula_id';
      params.push(usuarioId);
    }
    const resultado = await db.query(query, params);

    // Atualizar vínculos de células se for admin/super_admin editando pastor
    if (((req.usuario.perfil === 'ADMIN' || req.usuario.perfil === 'SUPER_ADMIN') && perfil === 'PASTOR' && Array.isArray(celulas))
      || (req.usuario.perfil === 'PASTOR' && perfil === 'PASTOR' && Array.isArray(celulas))) {
      // Para PASTOR, só pode vincular células que ele administra
      let celulasPermitidas = celulas;
      if (req.usuario.perfil === 'PASTOR') {
        const { rows: celulasDoPastor } = await db.query('SELECT celula_id FROM usuarios_celulas WHERE usuario_id = $1', [req.usuario.id]);
        const celulaIds = celulasDoPastor.map(c => String(c.celula_id));
        celulasPermitidas = celulas.filter(cid => celulaIds.includes(String(cid)));
      }
      // Remove todos os vínculos antigos
      await db.query('DELETE FROM usuarios_celulas WHERE usuario_id = $1', [usuarioId]);
      // Insere os novos vínculos
      for (const celulaId of celulasPermitidas) {
        await db.query('INSERT INTO usuarios_celulas (usuario_id, celula_id, admin) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING', [usuarioId, celulaId, true]);
      }
    }

    res.json(resultado.rows[0]);
  } catch (err) {
    console.error('Erro ao editar usuário:', err);
    res.status(500).json({ erro: 'Erro ao editar usuário' });
  }
}

// DELETE /usuarios/:id
async function excluirUsuario(req, res) {
  const usuarioId = req.params.id;
  try {
    // Remove vínculos do usuário com células
    await db.query('DELETE FROM usuarios_celulas WHERE usuario_id = $1', [usuarioId]);
    // Remove o usuário
    await db.query('DELETE FROM usuarios WHERE id = $1', [usuarioId]);
    res.json({ mensagem: 'Usuário excluído com sucesso' });
  } catch (err) {
    console.error('Erro ao excluir usuário:', err);
    res.status(500).json({ erro: 'Erro ao excluir usuário' });
  }
}

// Atualizar admin da célula
async function atualizarAdminCelula(req, res) {
  const { usuario_id, celula_id, admin } = req.body;
  if (!usuario_id || !celula_id || typeof admin !== 'boolean') {
    return res.status(400).json({ erro: 'Dados obrigatórios: usuario_id, celula_id, admin (boolean)' });
  }
  try {
    // Validação: só PASTOR ou ADMIN podem ser admin de célula
    if (admin === true) {
      const usuario = await db.query('SELECT perfil FROM usuarios WHERE id = $1', [usuario_id]);
      if (usuario.rows.length === 0) return res.status(404).json({ erro: 'Usuário não encontrado' });
      if (!['PASTOR', 'ADMIN'].includes(usuario.rows[0].perfil)) {
        return res.status(403).json({ erro: 'Um membro não pode administrar uma célula.' });
      }
    }
    await db.query('UPDATE usuarios_celulas SET admin = $1 WHERE usuario_id = $2 AND celula_id = $3', [admin, usuario_id, celula_id]);
    res.json({ mensagem: 'Status de admin atualizado com sucesso' });
  } catch (err) {
    console.error('Erro ao atualizar admin da célula:', err);
    res.status(500).json({ erro: 'Erro ao atualizar admin da célula' });
  }
}

module.exports = { carregarUsuarios, cadastrarUsuario, getMeuPerfil, updateMeuPerfil, listarMembrosParaDizimo, editarUsuario, excluirUsuario, atualizarAdminCelula };
