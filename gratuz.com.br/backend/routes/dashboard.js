const express = require('express');
const router = express.Router();
const autenticarToken = require('../middleware/authMiddleware');
const autorizarPerfis = require('../middleware/autorizarPerfis');
const { carregarDashboard, carregarKpis, carregarFieis } = require('../controllers/dashboardController');

router.get('/', autenticarToken, autorizarPerfis('SUPER_ADMIN', 'ADMIN', 'PASTOR', 'MEMBRO'), carregarDashboard);
router.get('/kpis', autenticarToken, autorizarPerfis('SUPER_ADMIN', 'ADMIN', 'PASTOR', 'MEMBRO'), carregarKpis);
router.get('/fieis', autenticarToken, autorizarPerfis('SUPER_ADMIN', 'ADMIN', 'PASTOR'), carregarFieis);

module.exports = router;
