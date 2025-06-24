const tabelaDizimos = document.querySelector('#tabelaDizimos tbody');
const formDizimo = document.getElementById('formDizimo');
const buscaDizimoInput = document.getElementById('buscaDizimo');
const filtroIgrejaDizimoSelect = document.getElementById('filtroIgrejaDizimo');

let debounceTimer;

async function carregarDizimos() {
  const token = sessionStorage.getItem('token');
  const searchTerm = buscaDizimoInput.value;
  const igrejaId = filtroIgrejaDizimoSelect.value;

  const params = new URLSearchParams();
  if (searchTerm) params.append('search', searchTerm);
  if (igrejaId) params.append('igrejaId', igrejaId);

  if (!token) {
    return;
  }

  try {
    const response = await fetch(`http://localhost:3000/api/dizimos?${params.toString()}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) {
      throw new Error(`Erro: ${response.status}`);
    }

    const dizimos = await response.json();
    tabelaDizimos.innerHTML = '';

    if (dizimos.length === 0) {
      tabelaDizimos.innerHTML = '<tr><td colspan="4" class="text-center">Nenhum registro encontrado.</td></tr>';
      return;
    }

    dizimos.forEach(dizimo => {
      const valorFormatado = parseFloat(dizimo.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      const dataFormatada = new Date(dizimo.data_pagamento).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
      const tipoTributoFormatado = dizimo.tipotributo ? dizimo.tipotributo.charAt(0).toUpperCase() + dizimo.tipotributo.slice(1).toLowerCase() : 'Dízimo';
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${dizimo.nome_membro}</td>
        <td>${valorFormatado}</td>
        <td>${dataFormatada}</td>
        <td>${tipoTributoFormatado}</td>
      `;
      tabelaDizimos.appendChild(tr);
    });

  } catch (erro) {
  }
}

async function popularFiltroIgrejasDizimos() {
  const token = sessionStorage.getItem('token');
  const usuario = JSON.parse(sessionStorage.getItem('usuario'));
  if (usuario.perfil !== 'ADMIN') {
    filtroIgrejaDizimoSelect.parentElement.classList.add('d-none');
    return;
  }
  
  try {
    const response = await fetch('http://localhost:3000/api/igrejas', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const igrejas = await response.json();
    igrejas.forEach(igreja => {
      const option = document.createElement('option');
      option.value = igreja.id;
      option.textContent = igreja.nome;
      filtroIgrejaDizimoSelect.appendChild(option);
    });
  } catch (error) {
  }
}

// NOVA LÓGICA PARA O CAMPO DE MEMBRO
async function configurarCampoMembro() {
  const token = sessionStorage.getItem('token');
  const usuario = JSON.parse(sessionStorage.getItem('usuario'));
  const container = document.getElementById('membroContainer');

  if (!token || !usuario || !container) {
    container.innerHTML = '<input type="text" class="form-control" placeholder="Erro ao carregar membros" disabled>';
    return;
  }
  
  if (usuario.perfil === 'MEMBRO') {
    // Para MEMBRO: cria um input desabilitado com o nome dele
    container.innerHTML = `
      <label for="nomeMembro" class="form-label">Membro</label>
      <input type="text" id="nomeMembro" class="form-control" value="${usuario.nome}" readonly>`;
  } else {
    // Para ADMIN e PASTOR: cria um select com os membros
    try {
      const response = await fetch('http://localhost:3000/api/usuarios/membros', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Falha ao buscar membros');
      
      const membros = await response.json();
      
      const options = membros.map(m => `<option value="${m.nome}">${m.nome}</option>`).join('');
      
      container.innerHTML = `
        <label for="nomeMembro" class="form-label">Membro</label>
        <select id="nomeMembro" class="form-select" required>
          <option value="">Selecione um membro</option>
          ${options}
        </select>`;
        
      // Opcional: Adicionar funcionalidade de busca ao select (ex: com TomSelect ou Select2)
      // new TomSelect("#nomeMembro",{ create: false, sortField: { field: "text", direction: "asc" } });

    } catch (error) {
      container.innerHTML = '<input type="text" class="form-control" placeholder="Erro ao carregar" disabled>';
    }
  }
}

// AJUSTE NO ENVIO DO FORMULÁRIO
formDizimo.addEventListener('submit', async function (e) {
    e.preventDefault();

    // A busca pelo elemento #nomeMembro agora funciona para ambos (input e select)
    const nomeMembroEl = document.getElementById('nomeMembro');

    const dados = {
        nome_membro: nomeMembroEl.value,
        valor: document.getElementById('valorDizimo').value,
        data_pagamento: document.getElementById('dataPagamento').value,
        tipoTributo: document.getElementById('tipoTributo').value,
    };
    
    const token = sessionStorage.getItem('token');

    try {
      const response = await fetch('http://localhost:3000/api/dizimos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(dados)
      });

      if (!response.ok) {
        throw new Error(`Erro: ${response.status}`);
      }

      mostrarToast('Dízimo cadastrado com sucesso!', 'success');
      formDizimo.reset();
      carregarDizimos();

    } catch (erro) {
      mostrarToast('Erro ao tentar cadastrar dízimo.', 'error');
    }
});

// Adiciona event listeners para os filtros
buscaDizimoInput.addEventListener('input', () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(carregarDizimos, 500);
});
filtroIgrejaDizimoSelect.addEventListener('change', carregarDizimos);

// Inicialização da página
document.addEventListener('DOMContentLoaded', async () => {
  await carregarDizimos();
  await popularFiltroIgrejasDizimos();
  await configurarCampoMembro();
});
