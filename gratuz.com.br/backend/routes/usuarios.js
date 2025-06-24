const express = require('express');
const router = express.Router();

const { 
  cadastrarUsuario, 
  carregarUsuarios,
  getMeuPerfil,
  updateMeuPerfil,
  listarMembrosParaDizimo,
  editarUsuario,
  excluirUsuario,
  atualizarAdminCelula
} = require('../controllers/usuariosController');
const autenticarToken = require('../middleware/authMiddleware');
const autorizarPerfis = require('../middleware/autorizarPerfis');

// Rotas de Perfil do Usuário Logado
router.get('/perfil', autenticarToken, getMeuPerfil);
router.put('/perfil', autenticarToken, updateMeuPerfil);

// Rotas de Gerenciamento de Usuários
router.get('/', autenticarToken, autorizarPerfis('SUPER_ADMIN', 'ADMIN', 'PASTOR'), carregarUsuarios);
// SUPER_ADMIN, ADMIN e PASTOR podem cadastrar novos usuários
router.post('/', autenticarToken, autorizarPerfis('SUPER_ADMIN', 'ADMIN', 'PASTOR'), cadastrarUsuario);

// Rota para listar membros para o formulário de dízimos
router.get('/membros', autenticarToken, listarMembrosParaDizimo);

// Editar usuário
router.put('/:id', autenticarToken, autorizarPerfis('SUPER_ADMIN', 'ADMIN', 'PASTOR'), editarUsuario);
// Excluir usuário
router.delete('/:id', autenticarToken, autorizarPerfis('SUPER_ADMIN', 'ADMIN', 'PASTOR'), excluirUsuario);
// Atualizar admin da célula
router.put('/celula/admin', autenticarToken, autorizarPerfis('SUPER_ADMIN', 'ADMIN', 'PASTOR'), atualizarAdminCelula);

router.get('/:id/celulas', autenticarToken, autorizarPerfis('SUPER_ADMIN', 'ADMIN', 'PASTOR'), async (req, res) => {
  const usuarioId = req.params.id;
  try {
    const resultado = await require('../db').query('SELECT celula_id FROM usuarios_celulas WHERE usuario_id = $1', [usuarioId]);
    res.json(resultado.rows);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao buscar células do usuário' });
  }
});

module.exports = router;

