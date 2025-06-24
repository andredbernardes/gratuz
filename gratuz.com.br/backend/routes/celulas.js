const express = require('express');
const router = express.Router();
const autenticarToken = require('../middleware/authMiddleware');
const autorizarPerfis = require('../middleware/autorizarPerfis');
const { listarCelulas, criarCelula, listarCelulasDoPastor } = require('../controllers/celulaController');

router.get('/', autenticarToken, listarCelulas);
router.post('/', autenticarToken, autorizarPerfis('SUPER_ADMIN', 'ADMIN', 'PASTOR'), criarCelula);
router.get('/minhas', autenticarToken, listarCelulasDoPastor);

module.exports = router;
