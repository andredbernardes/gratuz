// Variáveis globais que não dependem da navbar
const loginSection = document.getElementById('loginSection');
const mainContent = document.getElementById('main-content');
const perfilBoasVindas = document.getElementById('perfilBoasVindas');
const pageFooter = document.getElementById('page-footer');

// Variáveis que SERÃO definidas após o carregamento da navbar
let navbar;
let perfilDropdown;

// Event listener para login
document.getElementById('loginForm')?.addEventListener('submit', async function (e) {
  e.preventDefault();
  const email = document.getElementById('emailLogin').value.trim();
  const senha = document.getElementById('senhaLogin').value;

  if (!email || !senha) return mostrarToast('Email e senha são obrigatórios', 'error');
  if (!email.includes('@')) return mostrarToast('Email inválido', 'error');

  try {
    const response = await fetch('http://localhost:3000/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, senha })
    });

    if (!response.ok) {
      const erro = await response.json();
      throw new Error(erro.erro || 'Credenciais inválidas');
    }

    const data = await response.json();
    sessionStorage.setItem('token', data.token);
    sessionStorage.setItem('usuario', JSON.stringify(data.usuario));

    window.location.href = 'dashboard.html'; // Redireciona para o dashboard

  } catch (erro) {
    mostrarToast(`Erro no login: ${erro.message}`, 'error');
  }
});

// Função para atualizar nome do usuário
function atualizarNomeUsuarioNaTela() {
  const usuario = JSON.parse(sessionStorage.getItem('usuario'));
  if (usuario) {
    // Mostra apenas o primeiro e segundo nome
    let nomes = usuario.nome.trim().split(' ');
    let nomeCurto = nomes[0] || '';
    if (nomes.length > 1) nomeCurto += ' ' + nomes[1];

    // Prefixo para Pastor (apenas no dropdown)
    let prefixo = '';
    if (usuario.perfil === 'PASTOR') {
      prefixo = 'Pastor ';
    }

    // No dashboard, mostrar só o nome curto
    if (perfilBoasVindas) perfilBoasVindas.textContent = nomeCurto;
    
    // Atualiza o dropdown do perfil
    const perfilNomeUsuario = document.getElementById('perfilNomeUsuario');
    const perfilTipoUsuario = document.getElementById('perfilTipoUsuario');
    
    if (perfilNomeUsuario) perfilNomeUsuario.textContent = nomeCurto;
    if (perfilTipoUsuario) {
      const perfilTraduzido = {
        'ADMIN': 'Administrador',
        'PASTOR': 'Pastor(a)',
        'MEMBRO': 'Membro'
      };
      perfilTipoUsuario.textContent = perfilTraduzido[usuario.perfil] || usuario.perfil;
    }
  }
}

function ajustarUIPorPerfil() {
  const usuario = JSON.parse(sessionStorage.getItem('usuario'));
  const perfil = usuario?.perfil;

  if (!perfil) return;

  const navItemUsuarios = document.getElementById('nav-item-usuarios');
  const navItemRelatorios = document.getElementById('nav-item-relatorios');

  // Regra para MEMBRO
  if (perfil === 'MEMBRO') {
    if (navItemUsuarios) navItemUsuarios.classList.add('d-none');
    if (navItemRelatorios) navItemRelatorios.classList.add('d-none');
    // Em páginas específicas, podemos ocultar mais coisas
    const kpiContainer = document.getElementById('kpi-container');
    if (kpiContainer) kpiContainer.classList.add('d-none');
  } 
  // Regra para PASTOR
  else if (perfil === 'PASTOR') {
    if (navItemUsuarios) navItemUsuarios.classList.remove('d-none');
    if (navItemRelatorios) navItemRelatorios.classList.remove('d-none');
  }
  // Regra para ADMIN
  else if (perfil === 'ADMIN') {
    if (navItemUsuarios) navItemUsuarios.classList.remove('d-none');
    if (navItemRelatorios) navItemRelatorios.classList.remove('d-none');
  }
  // Regra para SUPER_ADMIN
  else if (perfil === 'SUPER_ADMIN') {
    if (navItemUsuarios) navItemUsuarios.classList.remove('d-none');
    if (navItemRelatorios) navItemRelatorios.classList.remove('d-none');
  }
}

// Função para verificar autenticação
function verificarAutenticacao() {
  const token = sessionStorage.getItem('token');
  const paginaLogin = window.location.pathname.endsWith('index.html') || window.location.pathname === '/';

  if (token) {
    // Se está logado e na página de login, redireciona para o dashboard
    if (paginaLogin) {
      window.location.href = 'dashboard.html';
      return;
    }
    // Se está logado e em página interna, continua e atualiza a UI
    atualizarNomeUsuarioNaTela();
    ajustarUIPorPerfil();
    marcarMenuAtivo();
  } else {
    // Se não está logado e tenta acessar página interna, redireciona para o login
    if (!paginaLogin) {
      window.location.href = 'index.html';
    }
  }
}

// Função para logout
function logout() {
  sessionStorage.clear();
  verificarAutenticacao();
  location.reload(); // Força a recarga para limpar estados
}

// Função para mostrar toasts
function mostrarToast(mensagem, tipo = 'info') {
  const toastEl = document.getElementById('toastSistema');
  const toastMensagem = document.getElementById('toastMensagem');

  if (!toastEl || !toastMensagem) {
    return;
  }

  const tipos = {
    success: 'text-bg-success',
    error: 'text-bg-danger',
    warning: 'text-bg-warning',
    info: 'text-bg-primary'
  };

  // Remove classes antigas
  toastEl.className = 'toast align-items-center border-0';
  toastEl.classList.add(tipos[tipo] || 'text-bg-primary');

  toastMensagem.textContent = mensagem;

  const toast = new bootstrap.Toast(toastEl);
  toast.show();
}

// Função para verificar se o token ainda é válido
async function verificarTokenValido() {
  const token = sessionStorage.getItem('token');
  
  if (!token) return false;

  try {
    const response = await fetch('http://localhost:3000/api/dashboard', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!response.ok) {
      sessionStorage.clear();
      return false;
    }
    
    return true;
  } catch (error) {
    return false;
  }
}

// Inicialização
document.addEventListener('DOMContentLoaded', verificarAutenticacao);

/**
 * Carrega componentes HTML compartilhados, como a navbar.
 * @param {string} selector - O seletor do elemento onde o componente será injetado.
 * @param {string} path - O caminho para o arquivo HTML do componente.
 */
async function carregarComponente(selector, path) {
  try {
    const response = await fetch(path);
    if (!response.ok) throw new Error(`Não foi possível carregar ${path}`);
    const text = await response.text();
    const element = document.querySelector(selector);
    if (element) {
      element.innerHTML = text;
    }
  } catch (error) {
  }
}

// Inicialização da aplicação
async function initApp() {
  const ePaginaInterna = !window.location.pathname.endsWith('/') && !window.location.pathname.endsWith('index.html');
  
  if (ePaginaInterna) {
    // Carrega navbar e footer em paralelo para otimizar
    await Promise.all([
      carregarComponente('#navbar-placeholder', '_navbar.html'),
      carregarComponente('#footer-placeholder', '_footer.html')
    ]);
    
    // Agora que a navbar carregou, podemos definir as variáveis
    navbar = document.getElementById('navbarMenu');
    perfilDropdown = document.getElementById('perfilDropdown');
  }

  verificarAutenticacao();
  
  // Chama a função de carregamento de dados específica da página
  const pagina = window.location.pathname;
  if (pagina.endsWith('dashboard.html') && typeof carregarDashboard === 'function') {
    carregarDashboard();
  } else if (pagina.endsWith('dizimos.html') && typeof carregarDizimos === 'function') {
    carregarDizimos();
  } else if (pagina.endsWith('usuarios.html') && typeof initUsuariosPage === 'function') {
    initUsuariosPage();
  } else if (pagina.endsWith('relatorios.html') && typeof inicializarRelatorios === 'function') {
    inicializarRelatorios();
  }
  
  // Ajusta a UI por perfil após a inicialização da página específica
  setTimeout(() => {
    ajustarUIPorPerfil();
  }, 100);
}

document.addEventListener('DOMContentLoaded', initApp);

  // Obtém o nome do arquivo atual da URL
  const currentPage = window.location.pathname.split("/").pop();

  // Mapeia as páginas para os IDs dos links do menu
  const menuMap = {
    "dashboard": "menu-dashboard",
    "usuarios": "menu-usuarios",
    "dizimos": "menu-dizimos",
    "relatorios": "menu-relatorios"
  };

  // Aplica a classe 'active' ao item de menu correspondente
  const activeMenuId = menuMap[currentPage];
  if (activeMenuId) {
    const activeLink = document.getElementById(activeMenuId);
    if (activeLink) {
      activeLink.classList.add("active");
      activeLink.classList.add("text-primary"); // cor azul
    }
  }

// Função para destacar o link do menu ativo
function marcarMenuAtivo() {
  const paginaAtual = window.location.pathname.split('/').pop();
  if (!paginaAtual || paginaAtual === 'index.html') return;

  const idMenu = `menu-${paginaAtual.replace('.html', '')}`;
  const linkAtivo = document.getElementById(idMenu);
  
  if (linkAtivo) {
    linkAtivo.classList.add('active');
  }
}
