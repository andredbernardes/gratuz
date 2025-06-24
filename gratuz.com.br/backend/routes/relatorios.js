const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const autorizarPerfis = require('../middleware/autorizarPerfis');
const relatoriosController = require('../controllers/relatoriosController');

// Middleware de autenticação para todas as rotas
router.use(authMiddleware);

// Middleware de autorização - apenas ADMIN, PASTOR e SUPER_ADMIN podem acessar relatórios
router.use(autorizarPerfis(['ADMIN', 'PASTOR', 'SUPER_ADMIN']));

// Rotas de relatórios
router.get('/dizimos', relatoriosController.relatorioDizimos);
router.get('/celulas', relatoriosController.relatorioCelulas);
router.get('/membros', relatoriosController.relatorioMembros);
router.get('/contribuintes', relatoriosController.relatorioContribuintes);

module.exports = router; 