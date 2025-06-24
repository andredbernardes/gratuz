// routes/igrejas.js
const express = require('express');
const router = express.Router();
const autenticarToken = require('../middleware/authMiddleware');
const autorizarPerfis = require('../middleware/autorizarPerfis');
const { listarIgrejas, criarIgreja } = require('../controllers/igrejaController');

router.get('/', autenticarToken, listarIgrejas);
router.post('/', autenticarToken, autorizarPerfis('SUPER_ADMIN', 'ADMIN'), criarIgreja);

module.exports = router;