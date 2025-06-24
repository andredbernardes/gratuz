const db = require('../db');

// Relatório de Dízimos
async function relatorioDizimos(req, res) {
    const { perfil, id: usuarioId, igreja_id: igrejaUsuarioId } = req.usuario;
    const { periodo_inicio, periodo_fim, celula_id } = req.query;

    try {
        let filtro = '';
        let params = [];
        let paramIndex = 1;

        // Filtro por perfil
        if (perfil === 'SUPER_ADMIN') {
            filtro = 'WHERE 1=1';
        } else if (perfil === 'ADMIN') {
            filtro = 'WHERE d.igreja_id = $' + paramIndex;
            params.push(igrejaUsuarioId);
            paramIndex++;
        } else if (perfil === 'PASTOR') {
            filtro = `WHERE d.igreja_id = $${paramIndex} AND d.usuario_id IN (
                SELECT uc.usuario_id FROM usuarios_celulas uc 
                WHERE uc.celula_id IN (
                    SELECT celula_id FROM usuarios_celulas WHERE usuario_id = $${paramIndex + 1}
                )
            )`;
            params.push(igrejaUsuarioId, usuarioId);
            paramIndex += 2;
        } else {
            return res.status(403).json({ erro: 'Acesso negado' });
        }

        // Filtro por período
        if (periodo_inicio) {
            filtro += ` AND DATE_TRUNC('month', d.data_pagamento) >= DATE_TRUNC('month', $${paramIndex}::date)`;
            params.push(periodo_inicio + '-01');
            paramIndex++;
        }

        if (periodo_fim) {
            filtro += ` AND DATE_TRUNC('month', d.data_pagamento) <= DATE_TRUNC('month', $${paramIndex}::date)`;
            params.push(periodo_fim + '-01');
            paramIndex++;
        }

        // Filtro por célula
        if (celula_id) {
            filtro += ` AND d.usuario_id IN (SELECT usuario_id FROM usuarios_celulas WHERE celula_id = $${paramIndex})`;
            params.push(celula_id);
        }

        const query = `
            SELECT 
                d.id,
                d.valor,
                d.data_pagamento as data,
                d.tipotributo as metodo_pagamento,
                u.nome as nome_usuario,
                u.id as usuario_id,
                c.nome as nome_celula,
                i.nome as nome_igreja
            FROM dizimos d
            JOIN usuarios u ON d.usuario_id = u.id
            LEFT JOIN usuarios_celulas uc ON u.id = uc.usuario_id
            LEFT JOIN celulas c ON uc.celula_id = c.id
            LEFT JOIN igrejas i ON d.igreja_id = i.id
            ${filtro}
            ORDER BY d.data_pagamento DESC
        `;

        const { rows } = await db.query(query, params);
        res.json(rows);

    } catch (error) {
        console.error('Erro no relatório de dízimos:', error);
        res.status(500).json({ erro: 'Erro interno do servidor' });
    }
}

// Relatório de Células
async function relatorioCelulas(req, res) {
    const { perfil, id: usuarioId, igreja_id: igrejaUsuarioId } = req.usuario;

    try {
        let filtro = '';
        let params = [];

        // Filtro por perfil
        if (perfil === 'SUPER_ADMIN') {
            filtro = '';
        } else if (perfil === 'ADMIN') {
            filtro = 'WHERE c.igreja_id = $1';
            params.push(igrejaUsuarioId);
        } else if (perfil === 'PASTOR') {
            filtro = `WHERE c.igreja_id = $1 AND c.id IN (
                SELECT celula_id FROM usuarios_celulas WHERE usuario_id = $2
            )`;
            params.push(igrejaUsuarioId, usuarioId);
        } else {
            return res.status(403).json({ erro: 'Acesso negado' });
        }

        const query = `
            SELECT 
                c.id,
                c.nome as nome_celula,
                c.descricao,
                c.status,
                i.nome as igreja,
                COUNT(DISTINCT uc.usuario_id) as total_membros,
                STRING_AGG(DISTINCT u.nome, ', ') as administrador
            FROM celulas c
            LEFT JOIN igrejas i ON c.igreja_id = i.id
            LEFT JOIN usuarios_celulas uc ON c.id = uc.celula_id
            LEFT JOIN usuarios u ON uc.usuario_id = u.id AND uc.admin = true
            ${filtro}
            GROUP BY c.id, c.nome, c.descricao, c.status, i.nome
            ORDER BY c.nome
        `;

        const { rows } = await db.query(query, params);
        res.json(rows);

    } catch (error) {
        console.error('Erro no relatório de células:', error);
        res.status(500).json({ erro: 'Erro interno do servidor' });
    }
}

// Relatório de Membros
async function relatorioMembros(req, res) {
    const { perfil, id: usuarioId, igreja_id: igrejaUsuarioId } = req.usuario;
    const { celula_id } = req.query;

    try {
        let filtro = '';
        let params = [];
        let paramIndex = 1;

        // Filtro por perfil
        if (perfil === 'SUPER_ADMIN') {
            filtro = 'WHERE 1=1';
        } else if (perfil === 'ADMIN') {
            filtro = 'WHERE u.igreja_id = $' + paramIndex;
            params.push(igrejaUsuarioId);
            paramIndex++;
        } else if (perfil === 'PASTOR') {
            filtro = `WHERE u.igreja_id = $${paramIndex} AND u.id IN (
                SELECT uc.usuario_id FROM usuarios_celulas uc 
                WHERE uc.celula_id IN (
                    SELECT celula_id FROM usuarios_celulas WHERE usuario_id = $${paramIndex + 1}
                )
            )`;
            params.push(igrejaUsuarioId, usuarioId);
            paramIndex += 2;
        } else {
            return res.status(403).json({ erro: 'Acesso negado' });
        }

        // Filtro por célula
        if (celula_id) {
            filtro += ` AND u.id IN (SELECT usuario_id FROM usuarios_celulas WHERE celula_id = $${paramIndex})`;
            params.push(celula_id);
        }

        const query = `
            SELECT 
                u.id,
                u.nome as nome_usuario,
                u.email,
                u.perfil,
                u.status,
                STRING_AGG(DISTINCT c.nome, ', ') as nome_celula,
                i.nome as nome_igreja
            FROM usuarios u
            LEFT JOIN usuarios_celulas uc ON u.id = uc.usuario_id
            LEFT JOIN celulas c ON uc.celula_id = c.id
            LEFT JOIN igrejas i ON u.igreja_id = i.id
            ${filtro}
            GROUP BY u.id, u.nome, u.email, u.perfil, u.status, i.nome
            ORDER BY u.nome
        `;

        const { rows } = await db.query(query, params);
        res.json(rows);

    } catch (error) {
        console.error('Erro no relatório de membros:', error);
        res.status(500).json({ erro: 'Erro interno do servidor' });
    }
}

// Relatório de Top Contribuintes
async function relatorioContribuintes(req, res) {
    const { perfil, id: usuarioId, igreja_id: igrejaUsuarioId } = req.usuario;
    const { periodo_inicio, periodo_fim, celula_id } = req.query;

    try {
        let filtro = '';
        let params = [];
        let paramIndex = 1;

        // Filtro por perfil
        if (perfil === 'SUPER_ADMIN') {
            filtro = 'WHERE 1=1';
        } else if (perfil === 'ADMIN') {
            filtro = 'WHERE d.igreja_id = $' + paramIndex;
            params.push(igrejaUsuarioId);
            paramIndex++;
        } else if (perfil === 'PASTOR') {
            filtro = `WHERE d.igreja_id = $${paramIndex} AND d.usuario_id IN (
                SELECT uc.usuario_id FROM usuarios_celulas uc 
                WHERE uc.celula_id IN (
                    SELECT celula_id FROM usuarios_celulas WHERE usuario_id = $${paramIndex + 1}
                )
            )`;
            params.push(igrejaUsuarioId, usuarioId);
            paramIndex += 2;
        } else {
            return res.status(403).json({ erro: 'Acesso negado' });
        }

        // Filtro por período
        if (periodo_inicio) {
            filtro += ` AND DATE_TRUNC('month', d.data_pagamento) >= DATE_TRUNC('month', $${paramIndex}::date)`;
            params.push(periodo_inicio + '-01');
            paramIndex++;
        }

        if (periodo_fim) {
            filtro += ` AND DATE_TRUNC('month', d.data_pagamento) <= DATE_TRUNC('month', $${paramIndex}::date)`;
            params.push(periodo_fim + '-01');
            paramIndex++;
        }

        // Filtro por célula
        if (celula_id) {
            filtro += ` AND d.usuario_id IN (SELECT usuario_id FROM usuarios_celulas WHERE celula_id = $${paramIndex})`;
            params.push(celula_id);
        }

        const query = `
            SELECT 
                u.id as usuario_id,
                u.nome as nome_usuario,
                c.nome as nome_celula,
                SUM(d.valor) as total_contribuido,
                COUNT(d.id) as total_contribuicoes,
                AVG(d.valor) as media_contribuicao,
                MAX(d.data_pagamento) as ultima_contribuicao
            FROM usuarios u
            JOIN dizimos d ON u.id = d.usuario_id
            LEFT JOIN usuarios_celulas uc ON u.id = uc.usuario_id
            LEFT JOIN celulas c ON uc.celula_id = c.id
            ${filtro}
            GROUP BY u.id, u.nome, c.nome
            ORDER BY total_contribuido DESC
            LIMIT 10
        `;

        const { rows } = await db.query(query, params);
        res.json(rows);

    } catch (error) {
        console.error('Erro no relatório de contribuintes:', error);
        res.status(500).json({ erro: 'Erro interno do servidor' });
    }
}

module.exports = {
    relatorioDizimos,
    relatorioCelulas,
    relatorioMembros,
    relatorioContribuintes
}; 