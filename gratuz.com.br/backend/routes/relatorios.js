const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const autorizarPerfis = require('../middleware/autorizarPerfis');
const relatoriosController = require('../controllers/relatoriosController');

// Middleware de autenticação para todas as rotas
router.use(authMiddleware);

// Middleware de debug para verificar o usuário
router.use((req, res, next) => {
    console.log('Relatórios - Usuário autenticado:', req.usuario);
    console.log('Relatórios - Perfil do usuário:', req.usuario?.perfil);
    next();
});

// Middleware de autorização - apenas ADMIN, PASTOR e SUPER_ADMIN podem acessar relatórios
router.use(autorizarPerfis('ADMIN', 'PASTOR', 'SUPER_ADMIN'));

// Rotas de relatórios
router.get('/teste', (req, res) => {
    res.json({
        mensagem: 'Rota de teste funcionando',
        usuario: req.usuario,
        perfil: req.usuario?.perfil
    });
});

router.get('/dizimos', relatoriosController.relatorioDizimos);
router.get('/celulas', relatoriosController.relatorioCelulas);
router.get('/membros', relatoriosController.relatorioMembros);
router.get('/contribuintes', relatoriosController.relatorioContribuintes);

module.exports = router; 