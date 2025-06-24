const db = require('../db');

async function carregarDashboard(req, res) {
  const { perfil, id: usuarioId, igreja_id: igrejaUsuarioId } = req.usuario;

  try {
    let filtro = '';
    let params = [];

    if (perfil === 'ADMIN') {
        filtro = 'JOIN usuarios u ON d.usuario_id = u.id WHERE u.igreja_id = $1';
        params = [igrejaUsuarioId];
    } else if (perfil === 'PASTOR') {
        filtro = `WHERE d.usuario_id IN (
          SELECT uc.usuario_id 
          FROM usuarios_celulas uc 
          WHERE uc.celula_id IN (
            SELECT celula_id FROM usuarios_celulas WHERE usuario_id = $1
          )
        )`;
        params = [usuarioId];
    } else if (perfil === 'MEMBRO') {
      filtro = 'WHERE d.usuario_id = $1';
      params = [usuarioId];
    }
    // SUPER_ADMIN não tem filtro

    const query = `
      SELECT
        TO_CHAR(data_pagamento, 'MM-YYYY') AS mes,
        UPPER(tipoTributo::text) AS tipotributo,
        SUM(valor)::numeric(10,2) AS total
      FROM dizimos d
      ${filtro}
      GROUP BY mes, UPPER(tipoTributo::text)
      ORDER BY mes, tipotributo;
    `;

    const resultado = await db.query(query, params);


    res.json(resultado.rows);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao gerar dados do dashboard' });
  }
}

async function carregarKpis(req, res) {
  const { perfil, id: usuarioId, igreja_id: igrejaUsuarioId } = req.usuario;

  try {
    let kpis = {};

    if (perfil === 'SUPER_ADMIN') {
      const [arrecadacao, totalUsuarios, totalIgrejas, totalCelulas] = await Promise.all([
        db.query(`SELECT COALESCE(SUM(valor), 0) as total FROM dizimos WHERE data_pagamento >= DATE_TRUNC('month', CURRENT_DATE)`),
        db.query(`SELECT COUNT(*) as total FROM usuarios`),
        db.query(`SELECT COUNT(*) as total FROM igrejas`),
        db.query(`SELECT COUNT(*) as total FROM celulas`)
      ]);
      kpis = {
        arrecadacaoMes: parseFloat(arrecadacao.rows[0].total),
        totalUsuarios: parseInt(totalUsuarios.rows[0].total),
        totalIgrejas: parseInt(totalIgrejas.rows[0].total),
        totalCelulas: parseInt(totalCelulas.rows[0].total)
      };
    } else if (perfil === 'ADMIN') {
      const [arrecadacao, totalUsuarios, totalCelulas] = await Promise.all([
         db.query(`SELECT COALESCE(SUM(valor), 0) as total FROM dizimos WHERE igreja_id = $1 AND data_pagamento >= DATE_TRUNC('month', CURRENT_DATE)`, [igrejaUsuarioId]),
         db.query(`SELECT COUNT(*) as total FROM usuarios WHERE igreja_id = $1`, [igrejaUsuarioId]),
         db.query(`SELECT COUNT(*) as total FROM celulas WHERE igreja_id = $1`, [igrejaUsuarioId])
      ]);
      kpis = {
        arrecadacaoMes: parseFloat(arrecadacao.rows[0].total),
        totalUsuarios: parseInt(totalUsuarios.rows[0].total),
        totalIgrejas: 1, // Admin só pertence a 1 igreja
        totalCelulas: parseInt(totalCelulas.rows[0].total)
      };
    } else if (perfil === 'PASTOR') {
      // 1. Encontra as células do pastor
      const { rows: celulasDoPastor } = await db.query('SELECT celula_id FROM usuarios_celulas WHERE usuario_id = $1', [usuarioId]);
      
      // Se o pastor não lidera células, retorna KPIs zerados.
      if (celulasDoPastor.length === 0) {
        return res.json({ arrecadacaoMes: 0, totalUsuarios: 1, totalIgrejas: 1, totalCelulas: 0 });
      }
      
      const celulaIds = celulasDoPastor.map(c => c.celula_id);

      // 2. Com as células, busca os KPIs
      const [arrecadacao, totalMembros] = await Promise.all([
        db.query(`SELECT COALESCE(SUM(valor), 0) as total FROM dizimos WHERE usuario_id IN (SELECT usuario_id FROM usuarios_celulas WHERE celula_id = ANY($1)) AND data_pagamento >= DATE_TRUNC('month', CURRENT_DATE)`, [celulaIds]),
        db.query(`SELECT COUNT(*) as total FROM usuarios WHERE id IN (SELECT usuario_id FROM usuarios_celulas WHERE celula_id = ANY($1))`, [celulaIds])
      ]);

      kpis = {
        arrecadacaoMes: parseFloat(arrecadacao.rows[0].total),
        totalUsuarios: parseInt(totalMembros.rows[0].total),
        totalIgrejas: 1, // Pastor só pertence a 1 igreja
        totalCelulas: celulaIds.length
      };
    } else { // MEMBRO
      return res.json({ arrecadacaoMes: 0, totalUsuarios: 0, totalIgrejas: 0, totalCelulas: 0 });
    }

    res.json(kpis);

  } catch (err) {
    res.status(500).json({ erro: 'Erro ao buscar KPIs' });
  }
}

async function carregarFieis(req, res) {
  const { perfil, id: usuarioId, igreja_id: igrejaUsuarioId } = req.usuario;
  const { celula_id } = req.query;

  try {
    let filtro = '';
    let params = [];

    if (perfil === 'SUPER_ADMIN') {
      if (celula_id) {
        filtro = 'WHERE u.id IN (SELECT usuario_id FROM usuarios_celulas WHERE celula_id = $1)';
        params = [celula_id];
      } else {
        filtro = '';
        params = [];
      }
    } else if (perfil === 'ADMIN') {
      if (celula_id) {
        filtro = 'WHERE u.igreja_id = $1 AND u.id IN (SELECT usuario_id FROM usuarios_celulas WHERE celula_id = $2)';
        params = [igrejaUsuarioId, celula_id];
      } else {
        filtro = 'WHERE u.igreja_id = $1';
        params = [igrejaUsuarioId];
      }
    } else if (perfil === 'PASTOR') {
      if (celula_id) {
        filtro = `WHERE d.usuario_id IN (SELECT usuario_id FROM usuarios_celulas WHERE celula_id = $1)`;
        params = [celula_id];
      } else {
        filtro = `WHERE d.usuario_id IN (
          SELECT uc.usuario_id 
          FROM usuarios_celulas uc 
          WHERE uc.celula_id IN (
            SELECT celula_id FROM usuarios_celulas WHERE usuario_id = $1
          )
        )`;
        params = [usuarioId];
      }
    } else {
      // MEMBRO não tem acesso a este endpoint
      return res.status(403).json({ erro: 'Acesso negado' });
    }

    const query = `
      SELECT 
        u.nome,
        COALESCE(SUM(d.valor), 0)::numeric(10,2) as total_dizimos,
        COUNT(d.id) as total_pagamentos
      FROM usuarios u
      LEFT JOIN dizimos d ON u.id = d.usuario_id
      ${filtro}
      GROUP BY u.id, u.nome
      HAVING COALESCE(SUM(d.valor), 0) > 0
      ORDER BY total_dizimos DESC, u.nome ASC
      LIMIT 10;
    `;

    const resultado = await db.query(query, params);
    res.json(resultado.rows);

  } catch (err) {
    res.status(500).json({ erro: 'Erro ao buscar dados dos fiéis contribuintes' });
  }
}

module.exports = { carregarDashboard, carregarKpis, carregarFieis };
