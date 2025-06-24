# 🏛️ Gratuz - Gestão de Pagamentos para Igrejas

Sistema completo para gestão de dízimos, ofertas e outras receitas de igrejas, com controle de usuários por perfis e associação a igrejas e células.

## 🚀 Stack Tecnológica

### Frontend
- **HTML5** - Estrutura da aplicação
- **CSS3** - Estilização customizada
- **JavaScript (Vanilla)** - Lógica do cliente
- **Bootstrap 5.3.3** - Framework CSS responsivo
- **Chart.js** - Gráficos e visualizações

### Backend
- **Node.js** - Runtime JavaScript
- **Express.js 4.18.2** - Framework web REST API
- **PostgreSQL** - Banco de dados relacional
- **node-postgres (pg)** - Driver PostgreSQL para Node.js
- **JWT** - Autenticação baseada em tokens

## 📋 Pré-requisitos

- Node.js >= 16.0.0
- PostgreSQL >= 12.0
- npm ou yarn

## 🛠️ Instalação

### 1. Clone o repositório
```bash
git clone <url-do-repositorio>
cd gratuz.com.br
```

### 2. Configure o banco de dados
```bash
# Crie um banco PostgreSQL
createdb gratuz_db
```

### 3. Configure as variáveis de ambiente
```bash
cd backend
cp env.example .env
```

Edite o arquivo `.env`:
```env
DATABASE_URL="postgresql://usuario:senha@localhost:5432/gratuz_db"
JWT_SECRET="sua_chave_secreta_muito_segura_aqui"
PORT=3000
NODE_ENV=development
```

### 4. Instale as dependências
```bash
cd backend
npm install
```

### 5. Execute a migração do banco
```bash
npm run migrate
```

### 6. Inicie o servidor
```bash
npm run dev
```

O backend estará rodando em `http://localhost:3000`

## 📁 Estrutura do Projeto

```
gratuz.com.br/
├── assets/                 # Imagens e ícones
├── backend/               # API Node.js/Express
│   ├── controllers/       # Controladores da API
│   ├── middleware/        # Middlewares de autenticação
│   ├── routes/           # Rotas da API
│   ├── server.js         # Servidor principal
│   └── migrate.js        # Script de migração
├── css/                  # Estilos CSS
├── js/                   # JavaScript do frontend
├── index.html            # Página principal
└── README.md
```

## 🔐 Sistema de Autenticação

### Perfis de Usuário
- **ADMIN**: Acesso total ao sistema
- **PASTOR**: Gerencia sua igreja e células
- **MEMBRO**: Visualiza apenas seus dados

### Usuário Padrão
Após a migração, um usuário admin é criado automaticamente:
- **Email**: admin@gratuz.com
- **Senha**: 123456

### Funcionalidades por Perfil

#### ADMIN
- ✅ Cadastrar igrejas, células e usuários
- ✅ Visualizar todos os dízimos do sistema
- ✅ Gerenciar todos os usuários

#### PASTOR
- ✅ Visualizar membros da sua igreja
- ✅ Cadastrar dízimos para membros
- ✅ Visualizar relatórios da igreja

#### MEMBRO
- ✅ Visualizar seus próprios dízimos
- ✅ Cadastrar seus próprios dízimos

## 🗄️ Estrutura do Banco

### Tabelas Principais
- **usuarios**: Usuários do sistema
- **igrejas**: Igrejas cadastradas
- **celulas**: Células das igrejas
- **usuarios_celulas**: Associação usuário-célula
- **dizimos**: Registros de dízimos e ofertas

## 🚀 Scripts Disponíveis

```bash
# Desenvolvimento
npm run dev          # Inicia servidor com nodemon

# Produção
npm start            # Inicia servidor

# Banco de dados
npm run migrate      # Executa migração manual
```

## 🔧 Configuração de Desenvolvimento

### Variáveis de Ambiente (.env)
```env
# Obrigatórias
DATABASE_URL="postgresql://usuario:senha@localhost:5432/gratuz_db"
JWT_SECRET="chave_secreta_para_jwt"

# Opcionais
PORT=3000
NODE_ENV=development
```

### Endpoints da API

#### Autenticação
- `POST /login` - Login de usuário

#### Usuários
- `GET /usuarios` - Listar usuários
- `POST /usuarios` - Cadastrar usuário

#### Dízimos
- `GET /dizimos` - Listar dízimos
- `POST /dizimos` - Cadastrar dízimo

#### Igrejas
- `GET /igrejas` - Listar igrejas
- `POST /igrejas` - Cadastrar igreja

#### Células
- `GET /celulas` - Listar células
- `POST /celulas` - Cadastrar célula

#### Dashboard
- `GET /dashboard` - Dados do dashboard

## 🐛 Troubleshooting

### Problemas Comuns

1. **Erro de conexão com banco**
   - Verifique se o PostgreSQL está rodando
   - Confirme as credenciais no `.env`

2. **Erro de JWT**
   - Verifique se `JWT_SECRET` está configurado
   - Token expirado - faça login novamente

3. **Erro de CORS**
   - Verifique se as origens estão configuradas corretamente

## 📝 Logs

O sistema gera logs detalhados:
- Requisições HTTP
- Erros de autenticação
- Operações de banco de dados

## 🔒 Segurança

- ✅ JWT para autenticação
- ✅ Validação de dados
- ✅ Controle de acesso por perfis
- ✅ CORS configurado para arquivos locais
- ⚠️ **Senhas em texto plano** (conforme solicitado)

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença ISC.

---

**Desenvolvido com ❤️ para gestão de igrejas** 