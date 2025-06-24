// ----- VARIÁVEIS DE ELEMENTOS GLOBAIS -----
const buscaUsuarioInput = document.getElementById('buscaUsuario');
const filtroPerfilSelect = document.getElementById('filtroPerfil');
const filtroIgrejaSelect = document.getElementById('filtroIgreja');
const tabelaUsuariosBody = document.querySelector('#tabelaUsuarios tbody');
let debounceTimer;

// Elementos dos formulários
const formIgreja = document.getElementById('formIgreja');
const nomeIgrejaInput = document.getElementById('nomeIgreja');

const formCelula = document.getElementById('formCelula');
const nomeCelulaInput = document.getElementById('nomeCelula');
const igrejaCelulaSelect = document.getElementById('igrejaSelect');

const formUsuario = document.getElementById('formUsuario');
const nomeUsuarioInput = document.getElementById('nomeUsuario');
const emailUsuarioInput = document.getElementById('emailUsuario');
const senhaUsuarioInput = document.getElementById('senhaUsuario');
const perfilUsuarioSelect = document.getElementById('perfilUsuario');
const igrejaUsuarioSelect = document.getElementById('igrejaUsuario');
const celulaUsuarioSelect = document.getElementById('celulaUsuario');

// ----- LÓGICA DE CARREGAMENTO DE DADOS -----

async function carregarUsuarios() {
  const token = sessionStorage.getItem('token');
  if (!token) {
    window.location.href = 'index.html';
    return;
  }

  const searchTerm = buscaUsuarioInput.value;
  const perfil = filtroPerfilSelect.value;
  const igrejaId = filtroIgrejaSelect.value;

  const params = new URLSearchParams();
  if (searchTerm) params.append('search', searchTerm);
  if (perfil) params.append('perfil', perfil);
  if (igrejaId) params.append('igrejaId', igrejaId);

  try {
    const response = await fetch(`http://localhost:3000/api/usuarios?${params.toString()}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Falha ao carregar usuários');
    
    const usuarios = await response.json();
    tabelaUsuariosBody.innerHTML = '';
    if (usuarios.length === 0) {
      tabelaUsuariosBody.innerHTML = '<tr><td colspan="7" class="text-center">Nenhum usuário encontrado.</td></tr>';
      return;
    }
    usuarios.forEach((usuario, idxUsuario) => {
      const temMultiplasCelulas = usuario.celulas && usuario.celulas.length > 1;
      const accordionId = `accordionCelulasUsuario${usuario.id}`;
      const collapseId = `collapseCelulasUsuario${usuario.id}`;
      if (temMultiplasCelulas) {
        // Linha principal com botão de expandir
      const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>
            <button class="btn btn-link p-0 me-2 align-middle" data-bs-toggle="collapse" data-bs-target="#${collapseId}" aria-expanded="false" aria-controls="${collapseId}" tabindex="0" style="text-decoration:none;">
              <i class="bi bi-chevron-down"></i>
            </button>
            ${usuario.nome}
          </td>
          <td class="d-none d-xl-table-cell">${usuario.email}</td>
          <td class="d-none d-xl-table-cell">${perfilAmigavel(usuario.perfil)}</td>
          <td class="d-none d-xl-table-cell">${usuario.igreja_nome || 'N/A'}</td>
          <td><span class='celula-badge-nowrap'>${usuario.celulas[0]}</span>${usuario.celulas.length > 1 ? ` <span class='badge bg-primary ms-1'>+${usuario.celulas.length - 1}</span>` : ''}</td>
          <td class='text-center d-none d-lg-table-cell'>
            <div class='form-check form-switch d-flex justify-content-center mb-1'>
              <input class='form-check-input admin-switch' type='checkbox' data-usuario-id='${usuario.id}' data-celula-id='${usuario.celulas_id[0]}' ${(usuario.admin_celulas[0] ? 'checked' : '')}>
            </div>
          </td>
          <td>
            <div class="btn-group btn-group-sm" role="group">
              <button class="btn btn-sm btn-primary" onclick="abrirModalEditarUsuario(${usuario.id})" title="Editar">
                <i class="bi bi-pencil"></i>
              </button>
              <button class="btn btn-sm btn-danger" onclick="excluirUsuario(${usuario.id}, '${usuario.nome}')" title="Excluir">
                <i class="bi bi-trash"></i>
              </button>
            </div>
          </td>
        `;
        tabelaUsuariosBody.appendChild(tr);
        // Linha expandida (accordion)
        const trAccordion = document.createElement('tr');
        trAccordion.className = 'accordion-row';
        trAccordion.innerHTML = `
          <td colspan="7" class="p-0 border-0 bg-light">
            <div id="${collapseId}" class="accordion-collapse collapse" data-bs-parent="#tabelaUsuarios">
              <div class="p-3">
                <div class="fw-bold mb-2">Células que usuário(a) administra:</div>
                <div class="row g-2">
                  ${usuario.celulas.map((celula, idx) => {
                    if (idx === 0) return '';
                    return `
                      <div class="col-12 d-flex align-items-center mb-2">
                        <div class='form-check form-switch me-3' style='margin-right:16px;'>
                          <input class='form-check-input admin-switch' type='checkbox' data-usuario-id='${usuario.id}' data-celula-id='${usuario.celulas_id[idx]}' ${(usuario.admin_celulas[idx] ? 'checked' : '')}>
                        </div>
                        <span class='celula-badge-nowrap flex-grow-1 align-middle'>${celula}</span>
                      </div>
                    `;
                  }).join('')}
                </div>
              </div>
            </div>
          </td>
        `;
        tabelaUsuariosBody.appendChild(trAccordion);
      } else {
        // Usuário com uma célula ou nenhuma
        const tr = document.createElement('tr');
        let celulasHtml = 'N/A';
        if (usuario.celulas && usuario.celulas.length === 1) {
          celulasHtml = `<span class='celula-badge-nowrap'>${usuario.celulas[0]}</span>`;
        }
        let adminHtml = '<span class="text-muted">-</span>';
        if (usuario.celulas && usuario.celulas.length === 1 && usuario.celulas_id && usuario.admin_celulas) {
          adminHtml = `<div class='form-check form-switch d-flex justify-content-center mb-1'>
            <input class='form-check-input admin-switch' type='checkbox' data-usuario-id='${usuario.id}' data-celula-id='${usuario.celulas_id[0]}' ${(usuario.admin_celulas[0] ? 'checked' : '')}>
          </div>`;
        }
        const acoes = `
          <div class="btn-group btn-group-sm" role="group">
            <button class="btn btn-sm btn-primary" onclick="abrirModalEditarUsuario(${usuario.id})" title="Editar">
              <i class="bi bi-pencil"></i>
            </button>
            <button class="btn btn-sm btn-danger" onclick="excluirUsuario(${usuario.id}, '${usuario.nome}')" title="Excluir">
              <i class="bi bi-trash"></i>
            </button>
          </div>
        `;
      tr.innerHTML = `
        <td>${usuario.nome}</td>
          <td class="d-none d-xl-table-cell">${usuario.email}</td>
          <td class="d-none d-xl-table-cell">${perfilAmigavel(usuario.perfil)}</td>
          <td class="d-none d-xl-table-cell">${usuario.igreja_nome || 'N/A'}</td>
          <td>${celulasHtml}</td>
          <td class='text-center d-none d-lg-table-cell'>${adminHtml}</td>
          <td>${acoes}</td>
      `;
      tabelaUsuariosBody.appendChild(tr);
      }
      // Inicializa tooltip do Bootstrap
      setTimeout(() => {
        const tooltips = tabelaUsuariosBody.querySelectorAll('[data-bs-toggle="tooltip"]');
        tooltips.forEach(el => new bootstrap.Tooltip(el));
      }, 0);
    });
    // Listeners dos botões e switches
    document.querySelectorAll('.btn-editar-usuario').forEach(btn => {
      btn.addEventListener('click', (e) => abrirModalEditarUsuario(e.target.closest('button').dataset.id));
    });
    document.querySelectorAll('.btn-excluir-usuario').forEach(btn => {
      btn.addEventListener('click', (e) => excluirUsuario(e.target.closest('button').dataset.id));
    });
    document.querySelectorAll('.admin-switch').forEach(sw => {
      sw.addEventListener('change', (e) => alternarAdminCelula(e.target));
    });
  } catch (error) {
    tabelaUsuariosBody.innerHTML = '<tr><td colspan="7" class="text-center">Erro ao carregar usuários.</td></tr>';
  }
}

// ----- LÓGICA DOS FORMULÁRIOS DE CADASTRO -----

// Flags para prevenir envio duplo
let isSubmittingIgreja = false;
let isSubmittingCelula = false;
let isSubmittingUsuario = false;

async function popularDropdownIgrejas() {
  const token = sessionStorage.getItem('token');
  const usuarioLogado = JSON.parse(sessionStorage.getItem('usuario'));
  try {
    const response = await fetch('http://localhost:3000/api/igrejas', { headers: { 'Authorization': `Bearer ${token}` } });
    const igrejas = await response.json();
    const optionsHtml = igrejas.map(igreja => `<option value="${igreja.id}">${igreja.nome}</option>`).join('');

    // Popula o filtro da lista (apenas para Admins)
    if (filtroIgrejaSelect && usuarioLogado.perfil === 'ADMIN') {
      filtroIgrejaSelect.innerHTML = '<option value="">Todas as Igrejas</option>' + optionsHtml;
    } else if (filtroIgrejaSelect) {
      filtroIgrejaSelect.parentElement.classList.add('d-none');
    }

    // Popula o select do formulário de Célula
    if (igrejaCelulaSelect) {
      if (usuarioLogado.perfil === 'PASTOR') {
        igrejaCelulaSelect.innerHTML = '';
        const igrejaDoPastor = igrejas.find(i => i.id == usuarioLogado.igreja_id);
        if (igrejaDoPastor) {
          igrejaCelulaSelect.innerHTML = `<option value="${igrejaDoPastor.id}" selected>${igrejaDoPastor.nome}</option>`;
        }
        igrejaCelulaSelect.disabled = true;
      } else {
      igrejaCelulaSelect.innerHTML = '<option value="">Selecione a Igreja</option>' + optionsHtml;
        igrejaCelulaSelect.disabled = false;
      }
    }
    // Popula o select do formulário de Usuário
    if (igrejaUsuarioSelect) {
      if (usuarioLogado.perfil === 'PASTOR') {
        // Igreja travada para o pastor
        igrejaUsuarioSelect.innerHTML = '';
        const igrejaDoPastor = igrejas.find(i => i.id == usuarioLogado.igreja_id);
        if (igrejaDoPastor) {
          igrejaUsuarioSelect.innerHTML = `<option value="${igrejaDoPastor.id}" selected>${igrejaDoPastor.nome}</option>`;
        }
        igrejaUsuarioSelect.disabled = true;
        // Carrega apenas as células do pastor
        popularDropdownCelulasPastor();
      } else {
        igrejaUsuarioSelect.innerHTML = '<option value="">Selecione a Igreja</option>' + optionsHtml;
        igrejaUsuarioSelect.disabled = false;
        igrejaUsuarioSelect.onchange = (e) => {
          if (e.target.value) {
            popularDropdownCelulas(e.target.value);
            celulaUsuarioSelect.disabled = false;
          } else {
            celulaUsuarioSelect.innerHTML = '<option value="">Selecione uma igreja primeiro</option>';
            celulaUsuarioSelect.disabled = true;
          }
        };
      }
    }
  } catch (error) {
  }
}

async function popularDropdownCelulas(igrejaId) {
    if (!celulaUsuarioSelect || !igrejaId) {
        return;
    }
    const token = sessionStorage.getItem('token');
    celulaUsuarioSelect.innerHTML = '<option value="">Carregando...</option>';
    celulaUsuarioSelect.disabled = true;
    try {
        const res = await fetch(`http://localhost:3000/api/celulas?igreja_id=${igrejaId}`, { headers: { 'Authorization': `Bearer ${token}` } });
        celulaUsuarioSelect.innerHTML = '<option value="">Sem Célula</option>';
        celulaUsuarioSelect.disabled = false;
        if (res.ok) {
           const celulas = await res.json();
           if (celulas.length > 0) {
             celulas.forEach(c => { celulaUsuarioSelect.innerHTML += `<option value="${c.id}">${c.nome}</option>`; });
           }
        }
    } catch (err) {
        celulaUsuarioSelect.innerHTML = '<option value="">Erro ao carregar</option>';
        celulaUsuarioSelect.disabled = false;
    }
}

async function popularDropdownCelulasPastor() {
  const token = sessionStorage.getItem('token');
  celulaUsuarioSelect.innerHTML = '<option value="">Carregando...</option>';
  celulaUsuarioSelect.disabled = true;
  try {
    const res = await fetch('http://localhost:3000/api/celulas/minhas', { headers: { 'Authorization': `Bearer ${token}` } });
    celulaUsuarioSelect.innerHTML = '<option value="">Sem Célula</option>';
    celulaUsuarioSelect.disabled = false;
    if (res.ok) {
      const celulas = await res.json();
      const idsAdicionados = new Set();
      celulas.forEach(c => {
        if (!idsAdicionados.has(c.id)) {
          celulaUsuarioSelect.innerHTML += `<option value="${c.id}">${c.nome}</option>`;
          idsAdicionados.add(c.id);
        }
      });
    }
  } catch (err) {
    celulaUsuarioSelect.innerHTML = '<option value="">Erro ao carregar</option>';
    celulaUsuarioSelect.disabled = false;
  }
}

function setupFormListeners() {
    const token = sessionStorage.getItem('token');
    const btnSalvarIgreja = document.getElementById('btnSalvarIgreja');
    const btnSalvarCelula = document.querySelector('#formCelula button[type="submit"]');
    const btnSalvarUsuario = document.getElementById('btnCadastrarUsuario');

    formIgreja?.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (isSubmittingIgreja) return; // Previne envio duplo
        isSubmittingIgreja = true;
        if (btnSalvarIgreja) btnSalvarIgreja.disabled = true;

        try {
            const res = await fetch('http://localhost:3000/api/igrejas', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ nome: nomeIgrejaInput.value })
            });

            const data = await res.json();

            if (res.ok) {
                mostrarToast('Igreja salva com sucesso!', 'success');
                nomeIgrejaInput.value = '';
                try {
                  await popularDropdownIgrejas();
                } catch (err) {
                  // Ignora erro ao recarregar dropdown
                }
            } else {
                mostrarToast(data.erro || 'Erro ao salvar igreja.', 'error');
            }
        } catch (err) { 
          mostrarToast('Erro de rede ao salvar igreja.', 'error'); 
        } finally {
          isSubmittingIgreja = false; // Libera o lock
          if (btnSalvarIgreja) btnSalvarIgreja.disabled = false;
        }
    });

    formCelula?.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (isSubmittingCelula) return; // Previne envio duplo
        isSubmittingCelula = true;
        if (btnSalvarCelula) btnSalvarCelula.disabled = true;

        try {
            const res = await fetch('http://localhost:3000/api/celulas', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ nome: nomeCelulaInput.value, igreja_id: igrejaCelulaSelect.value })
            });
            const data = await res.json();
            if (res.ok) {
                mostrarToast('Célula salva com sucesso!', 'success');
                formCelula.reset();
            } else {
                mostrarToast(data.erro || 'Erro ao salvar célula.', 'error');
            }
        } catch (err) { 
          mostrarToast('Erro de rede ao salvar célula.', 'error'); 
        } finally {
          isSubmittingCelula = false; // Libera o lock
          if (btnSalvarCelula) btnSalvarCelula.disabled = false;
        }
    });

    formUsuario?.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (isSubmittingUsuario) return; // Previne envio duplo
        isSubmittingUsuario = true;
        if (btnSalvarUsuario) btnSalvarUsuario.disabled = true;

        try {
            const body = { 
                nome: nomeUsuarioInput.value, 
                email: emailUsuarioInput.value, 
                senha: senhaUsuarioInput.value,
                perfil: perfilUsuarioSelect.value, 
                igreja_id: igrejaUsuarioSelect.value,
                celula_id: celulaUsuarioSelect.value || null
            };

            const res = await fetch('http://localhost:3000/api/usuarios', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(body)
            });
            const data = await res.json();
            if (res.ok) {
                mostrarToast('Usuário salvo com sucesso!', 'success');
                formUsuario.reset();
                try {
                  const usuarios = await carregarUsuarios();
                } catch (uiError) {
                }
            } else {
                mostrarToast(data.erro || 'Erro ao salvar usuário.', 'error');
            }
        } catch (err) { 
          mostrarToast('Erro de rede ao salvar usuário.', 'error'); 
        } finally {
          isSubmittingUsuario = false; // Libera o lock
          if (btnSalvarUsuario) btnSalvarUsuario.disabled = false;
        }
    });
}

// ----- INICIALIZAÇÃO DA PÁGINA -----

async function initUsuariosPage() {
    setupFormListeners();

    // Popula os dropdowns e carrega a lista inicial
    await popularDropdownIgrejas();
    
    // Inicializa o select de células como desabilitado
    if (celulaUsuarioSelect) {
      celulaUsuarioSelect.innerHTML = '<option value="">Selecione uma igreja primeiro</option>';
      celulaUsuarioSelect.disabled = true;
    }
    
    carregarUsuarios();

    // Configura listeners dos filtros
    buscaUsuarioInput.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(carregarUsuarios, 500);
    });
    filtroPerfilSelect.addEventListener('change', carregarUsuarios);
    filtroIgrejaSelect.addEventListener('change', carregarUsuarios);
    
    // Garante que o card seja visível para pastores
    const usuarioLogado = JSON.parse(sessionStorage.getItem('usuario'));
    if (usuarioLogado && usuarioLogado.perfil === 'PASTOR') {
      const formsCard = document.querySelector('#usuarios .card');
      if (formsCard) {
        formsCard.classList.remove('d-none');
      }
    }
}

document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('usuarios')) {
        initUsuariosPage();
        const usuarioLogado = JSON.parse(sessionStorage.getItem('usuario'));
        if (usuarioLogado && usuarioLogado.perfil === 'PASTOR') {
          // Esconde a aba e o conteúdo de Igreja
          document.getElementById('igreja-tab').style.display = 'none';
          document.getElementById('igreja-tab-pane').style.display = 'none';
          // Habilita a aba de célula
          document.getElementById('celula-tab').classList.remove('disabled');
          document.getElementById('celula-tab').removeAttribute('tabindex');
          document.getElementById('celula-tab').style.display = '';
          document.getElementById('celula-tab-pane').style.display = '';
          // Ativa a aba de célula por padrão
          document.getElementById('celula-tab').classList.add('active');
          document.getElementById('celula-tab-pane').classList.add('show', 'active');
          document.getElementById('usuario-tab').classList.remove('active');
          document.getElementById('usuario-tab-pane').classList.remove('show', 'active');
          // Corrige o toggle das abas para não ficarem ambas ativas
          document.getElementById('celula-tab').addEventListener('click', function() {
            document.getElementById('celula-tab').classList.add('active');
            document.getElementById('celula-tab-pane').classList.add('show', 'active');
            document.getElementById('usuario-tab').classList.remove('active');
            document.getElementById('usuario-tab-pane').classList.remove('show', 'active');
          });
          document.getElementById('usuario-tab').addEventListener('click', function() {
            document.getElementById('usuario-tab').classList.add('active');
            document.getElementById('usuario-tab-pane').classList.add('show', 'active');
            document.getElementById('celula-tab').classList.remove('active');
            document.getElementById('celula-tab-pane').classList.remove('show', 'active');
          });
        }
    }
});

// Função para abrir o modal de edição de usuário
async function abrirModalEditarUsuario(usuarioId) {
  const token = sessionStorage.getItem('token');
  try {
    const usuarioLogado = JSON.parse(sessionStorage.getItem('usuario'));
    const res = await fetch(`http://localhost:3000/api/usuarios?search=&id=${usuarioId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const usuarios = await res.json();
    const usuario = Array.isArray(usuarios) ? usuarios.find(u => u.id == usuarioId) : usuarios;
    if (!usuario) return mostrarToast('Usuário não encontrado', 'error');
    document.getElementById('editUsuarioId').value = usuario.id;
    document.getElementById('editNomeUsuario').value = usuario.nome;
    document.getElementById('editEmailUsuario').value = usuario.email;
    document.getElementById('editPerfilUsuario').value = usuario.perfil;
    await popularDropdownEditarIgrejas(usuario.igreja_id);
    document.getElementById('editSenhaUsuario').value = '';

    // Multi-checkbox de células para todos os perfis
    const grupoCheckboxCelulas = document.getElementById('grupoCheckboxCelulas');
    const listaCheckbox = document.getElementById('checkboxCelulasLista');
    grupoCheckboxCelulas.style.display = '';
    // Carregar todas as células da igreja
    const resCelulas = await fetch(`http://localhost:3000/api/celulas?igreja_id=${usuario.igreja_id}`, { headers: { 'Authorization': `Bearer ${token}` } });
    const celulas = await resCelulas.json();
    // Buscar vínculos atuais
    const resVinculos = await fetch(`http://localhost:3000/api/usuarios/${usuario.id}/celulas`, { headers: { 'Authorization': `Bearer ${token}` } });
    const vinculos = await resVinculos.json();
    const vinculadas = vinculos.map(v => String(v.celula_id));
    listaCheckbox.innerHTML = '';
    celulas.forEach(celula => {
      const id = `editCelulaCheck_${celula.id}`;
      const checked = vinculadas.includes(String(celula.id)) ? 'checked' : '';
      listaCheckbox.innerHTML += `<div class='form-check'>
        <input class='form-check-input' type='checkbox' value='${celula.id}' id='${id}' name='editCelulas' ${checked}>
        <label class='form-check-label' for='${id}'>${celula.nome}</label>
      </div>`;
    });

    // Abre o modal
    const modal = new bootstrap.Modal(document.getElementById('modalEditarUsuario'));
    modal.show();
  } catch (err) {
    mostrarToast('Erro ao carregar dados do usuário', 'error');
  }
}

// Popular dropdowns do modal de edição
async function popularDropdownEditarIgrejas(selectedId) {
  const token = sessionStorage.getItem('token');
  const select = document.getElementById('editIgrejaUsuario');
  select.innerHTML = '';
  try {
    const res = await fetch('http://localhost:3000/api/igrejas', { headers: { 'Authorization': `Bearer ${token}` } });
    const igrejas = await res.json();
    igrejas.forEach(igreja => {
      const opt = document.createElement('option');
      opt.value = igreja.id;
      opt.textContent = igreja.nome;
      if (igreja.id == selectedId) opt.selected = true;
      select.appendChild(opt);
    });
  } catch {}
}

// Submissão do modal de edição
const formEditarUsuario = document.getElementById('formEditarUsuario');
if (formEditarUsuario) {
  formEditarUsuario.addEventListener('submit', async function(e) {
    e.preventDefault();
    const token = sessionStorage.getItem('token');
    const id = document.getElementById('editUsuarioId').value;
    const nome = document.getElementById('editNomeUsuario').value;
    const email = document.getElementById('editEmailUsuario').value;
    const perfil = document.getElementById('editPerfilUsuario').value;
    const igreja_id = document.getElementById('editIgrejaUsuario').value;
    const senha = document.getElementById('editSenhaUsuario').value;
    // Coletar células selecionadas
    const celulasSelecionadas = Array.from(document.querySelectorAll('input[name="editCelulas"]:checked')).map(cb => cb.value);
    const body = { nome, email, perfil, igreja_id, celulas: celulasSelecionadas };
    if (senha) body.senha = senha;
    try {
      const res = await fetch(`http://localhost:3000/api/usuarios/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(body)
      });
      if (!res.ok) throw new Error('Erro ao editar usuário');
      mostrarToast('Usuário atualizado com sucesso!', 'success');
      bootstrap.Modal.getInstance(document.getElementById('modalEditarUsuario')).hide();
      await carregarUsuarios();
    } catch (err) {
      mostrarToast('Erro ao editar usuário', 'error');
    }
  });
}

// Variáveis globais
let usuarios = [];
let igrejas = [];
let celulas = [];
let usuarioParaExcluir = null;

function excluirUsuario(id, nome) {
  usuarioParaExcluir = { id, nome };
  document.getElementById('nomeUsuarioExclusao').textContent = nome;
  const modal = new bootstrap.Modal(document.getElementById('confirmarExclusaoModal'));
  modal.show();
}

function confirmarExclusao() {
  if (!usuarioParaExcluir) return;
  
  const { id, nome } = usuarioParaExcluir;
  
  fetch(`http://localhost:3000/api/usuarios/${id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${sessionStorage.getItem('token')}`,
      'Content-Type': 'application/json'
    }
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Erro ao excluir usuário');
    }
    return response.json();
  })
  .then(data => {
    // Fechar modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('confirmarExclusaoModal'));
    modal.hide();
    
    // Limpar variável
    usuarioParaExcluir = null;
    
    // Mostrar mensagem de sucesso
    mostrarToast('Usuário excluído com sucesso!', 'success');
    
    // Recarregar lista
    carregarUsuarios();
  })
  .catch(error => {
    mostrarToast('Erro ao excluir usuário: ' + error.message, 'danger');
  });
}

// Alternar admin da célula
async function alternarAdminCelula(inputSwitch) {
  const usuario_id = inputSwitch.dataset.usuarioId;
  const celula_id = inputSwitch.dataset.celulaId;
  const admin = inputSwitch.checked;
  const token = sessionStorage.getItem('token');
  inputSwitch.disabled = true;
  try {
    const res = await fetch('http://localhost:3000/api/usuarios/celula/admin', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ usuario_id, celula_id, admin })
    });
    if (!res.ok) {
      const data = await res.json();
      mostrarToast(data.erro || 'Erro ao atualizar admin', 'error');
      inputSwitch.checked = !admin;
      return;
    }
    mostrarToast('Status de admin atualizado!', 'success');
  } catch (err) {
    mostrarToast('Erro ao atualizar admin', 'error');
    inputSwitch.checked = !admin; // Reverte visualmente
  } finally {
    inputSwitch.disabled = false;
  }
}

function perfilAmigavel(perfil) {
  switch (perfil) {
    case 'ADMIN': return 'Admin';
    case 'PASTOR': return 'Pastor(a)';
    case 'MEMBRO': return 'Membro';
    case 'SUPER_ADMIN': return 'Super_Admin';
    default: return perfil;
  }
}
