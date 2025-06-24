// Função para carregar dados do perfil no formulário
async function carregarDadosPerfil() {
  const token = sessionStorage.getItem('token');
  if (!token) return;

  try {
    const response = await fetch('http://localhost:3000/api/usuarios/perfil', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) {
      throw new Error('Erro ao buscar dados do perfil.');
    }

    const usuario = await response.json();
    document.getElementById('perfilNome').value = usuario.nome;
    document.getElementById('perfilEmail').value = usuario.email;

  } catch (err) {
    mostrarToast(err.message, 'error');
  }
}

// Event listener para o formulário de perfil
document.getElementById('formPerfil')?.addEventListener('submit', async function(e) {
  e.preventDefault();

  const token = sessionStorage.getItem('token');
  const nome = document.getElementById('perfilNome').value;
  const senha = document.getElementById('perfilSenha').value;
  const confirmaSenha = document.getElementById('perfilConfirmaSenha').value;

  if (senha !== confirmaSenha) {
    return mostrarToast('As senhas não coincidem.', 'error');
  }

  const body = { nome };
  if (senha) {
    body.senha = senha;
  }

  try {
    const response = await fetch('http://localhost:3000/api/usuarios/perfil', {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` 
      },
      body: JSON.stringify(body)
    });
    
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.erro || 'Erro ao atualizar perfil.');
    }
    
    // Atualiza o nome no sessionStorage e na tela
    sessionStorage.setItem('usuario', JSON.stringify(data));
    atualizarNomeUsuarioNaTela();

    mostrarToast('Perfil atualizado com sucesso!', 'success');
    
    // Limpa campos de senha
    document.getElementById('perfilSenha').value = '';
    document.getElementById('perfilConfirmaSenha').value = '';

  } catch (err) {
    mostrarToast(err.message, 'error');
  }
});

// Adiciona um gatilho para carregar os dados quando a página de perfil for mostrada
document.addEventListener('DOMContentLoaded', function() {
  // Verifica se o ID do formulário de perfil existe na página atual
  if (document.getElementById('formPerfil')) {
    carregarDadosPerfil();
  }
}); 