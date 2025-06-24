const db = require('../db');
const express = require('express');
const router = express.Router();
const { registrarDizimo, getDizimos } = require('../controllers/dizimosController');
const autenticarToken = require('../middleware/authMiddleware');
const autorizarPerfis = require('../middleware/autorizarPerfis');

// ✅ POST /dizimos
router.post('/', autenticarToken, autorizarPerfis('SUPER_ADMIN', 'ADMIN', 'PASTOR', 'MEMBRO'), registrarDizimo);


// ADMIN, PASTOR e MEMBRO podem listar seus dizimos
router.get('/', autenticarToken, autorizarPerfis('SUPER_ADMIN', 'ADMIN', 'PASTOR', 'MEMBRO'), getDizimos);

// MEMBRO pode acessar só seus dízimos
router.get('/meus', autenticarToken, autorizarPerfis('MEMBRO'), async (req, res) => {
  try {
    const resultado = await db.query(`
      SELECT * FROM dizimos
      WHERE usuario_id = $1
      ORDER BY data_pagamento DESC
    `, [req.usuario.id]);

    res.json(resultado.rows);
  } catch (err) {
    console.error('Erro ao buscar seus dízimos:', err);
    res.status(500).json({ erro: 'Erro ao buscar seus dízimos' });
  }
});

module.exports = router;
