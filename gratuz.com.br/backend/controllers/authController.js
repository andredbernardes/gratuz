const db = require('../db');
const jwt = require('jsonwebtoken');

// LOGIN
async function loginUsuario(req, res) {
  const { email, senha } = req.body;

  // Validação básica
  if (!email || !senha) {
    return res.status(400).json({ erro: 'Email e senha são obrigatórios' });
  }

  try {
    const resultado = await db.query('SELECT * FROM usuarios WHERE email = $1', [email]);

    if (resultado.rows.length === 0) {
      return res.status(401).json({ erro: 'Credenciais inválidas' });
    }

    const usuario = resultado.rows[0];

    // Comparação simples de senha (sem hash)
    if (senha !== usuario.senha) {
      return res.status(401).json({ erro: 'Credenciais inválidas' });
    }

    const token = jwt.sign(
      { 
        id: usuario.id, 
        perfil: usuario.perfil, 
        email: usuario.email,
        igreja_id: usuario.igreja_id
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Remove senha do objeto de resposta
    const { senha: _, ...usuarioSemSenha } = usuario;
    res.json({ token, usuario: usuarioSemSenha });

  } catch (err) {
    res.status(500).json({ erro: 'Erro interno no servidor' });
  }
}

// CADASTRO sem hash de senha
async function cadastrarUsuario(req, res) {
  const { nome, email, senha, perfil } = req.body;

  // Validação
  if (!nome || !email || !senha || !perfil) {
    return res.status(400).json({ erro: 'Todos os campos são obrigatórios' });
  }

  if (senha.length < 6) {
    return res.status(400).json({ erro: 'Senha deve ter pelo menos 6 caracteres' });
  }

  const perfisValidos = ['ADMIN', 'PASTOR', 'MEMBRO'];
  if (!perfisValidos.includes(perfil)) {
    return res.status(400).json({ erro: 'Perfil inválido' });
  }

  try {
    // Verifica se email já existe
    const emailExistente = await db.query('SELECT id FROM usuarios WHERE email = $1', [email]);
    if (emailExistente.rows.length > 0) {
      return res.status(409).json({ erro: 'Email já cadastrado' });
    }

    const resultado = await db.query(
      'INSERT INTO usuarios (nome, email, senha, perfil) VALUES ($1, $2, $3, $4) RETURNING id, nome, email, perfil',
      [nome, email, senha, perfil]
    );

    res.status(201).json(resultado.rows[0]);
  } catch (err) {
    if (err.code === '23505') { // Unique violation
      res.status(409).json({ erro: 'Email já cadastrado' });
    } else {
      res.status(500).json({ erro: 'Erro ao cadastrar usuário' });
    }
  }
}

module.exports = { loginUsuario, cadastrarUsuario };
