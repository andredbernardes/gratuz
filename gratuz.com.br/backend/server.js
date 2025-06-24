// server.js

const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Validação de variáveis de ambiente
if (!process.env.JWT_SECRET) {
  console.error('❌ JWT_SECRET não configurado no .env');
  process.exit(1);
}

const app = express();

// --- SERVIR ARQUIVOS ESTÁTICOS DO FRONT-END ---
// Define o caminho para a pasta raiz do projeto (um nível acima de 'backend')
const frontendPath = path.join(__dirname, '..');
// Serve os arquivos estáticos (HTML, CSS, JS, assets)
app.use(express.static(frontendPath));
console.log(`📦 Servindo arquivos estáticos de: ${frontendPath}`);
// --- FIM - SERVIR ARQUIVOS ESTÁTICOS ---

// Middleware de segurança CORS - Permitir arquivos locais
app.use(cors({
  origin: function (origin, callback) {
    // Permitir requisições sem origem (arquivos locais) e localhost
    if (!origin || origin === 'null' || origin.includes('localhost') || origin.includes('127.0.0.1')) {
      callback(null, true);
    } else if (process.env.NODE_ENV === 'production') {
      // Em produção, permitir apenas domínios específicos
      callback(null, ['https://seu-dominio.com']);
    } else {
      callback(null, true);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Middleware para adicionar headers CORS manualmente
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  // Responder a requisições OPTIONS (preflight)
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Middleware de logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Rota de health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Página inicial da API
app.get('/', (req, res) => {
  res.json({
    message: 'API Gratuz rodando ✅',
    version: '1.0.0',
    endpoints: {
      auth: '/login',
      usuarios: '/usuarios',
      dizimos: '/dizimos',
      dashboard: '/dashboard',
      igrejas: '/igrejas',
      celulas: '/celulas'
    }
  });
});

// Importa rotas com tratamento de erro
let authRoutes, usuarioRoutes, dizimoRoutes, dashboardRoutes, igrejasRoutes, celulasRoutes, relatoriosRoutes;

try {
  authRoutes = require('./routes/auth');
  usuarioRoutes = require('./routes/usuarios');
  dizimoRoutes = require('./routes/dizimos');
  dashboardRoutes = require('./routes/dashboard');
  igrejasRoutes = require('./routes/igrejas');
  celulasRoutes = require('./routes/celulas');
  relatoriosRoutes = require('./routes/relatorios');
} catch (error) {
  console.error('❌ Erro ao carregar rotas:', error.message);
  process.exit(1);
}

// Usa rotas da API sob o prefixo /api
app.use('/api/login', authRoutes);
app.use('/api/usuarios', usuarioRoutes);
app.use('/api/dizimos', dizimoRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/igrejas', igrejasRoutes);
app.use('/api/celulas', celulasRoutes);
app.use('/api/relatorios', relatoriosRoutes);

// Middleware de tratamento de erros
app.use((err, req, res, next) => {
  console.error('Erro não tratado:', err);
  res.status(500).json({ 
    erro: 'Erro interno do servidor',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Middleware para rotas não encontradas
app.use('*', (req, res) => {
  res.status(404).json({ erro: 'Rota não encontrada' });
});

// Inicia servidor
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📊 Ambiente: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 URL: http://localhost:${PORT}`);
  console.log(`🌐 CORS configurado para arquivos locais`);
});

// Tratamento de erros não capturados
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  server.close(() => process.exit(1));
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  server.close(() => process.exit(1));
});

module.exports = app;
