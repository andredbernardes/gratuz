// Variáveis globais para armazenar as instâncias dos gráficos
let graficoPorTipo = null;
let graficoPorMes = null;
let graficoFieis = null;

let chartDizimos = null;
let chartTiposDizimos = null;

async function carregarDashboard() {
  const token = sessionStorage.getItem('token');
  if (!token) return;

  const deveMostrarFieis = verificarPermissaoGraficoFieis();
  const promises = [
    carregarKpis(token),
    carregarGraficos(token)
  ];

  if (deveMostrarFieis) {
    await popularFiltroCelulasFieis(token);
    const filtroCelula = document.getElementById('filtroCelulaFieis');
    if (filtroCelula) {
      filtroCelula.onchange = () => {
        carregarGraficoFieis(token, filtroCelula.value);
      };
      await carregarGraficoFieis(token, filtroCelula.value);
    }
  }

  await Promise.all(promises);
}

function verificarPermissaoGraficoFieis() {
  const usuario = JSON.parse(sessionStorage.getItem('usuario'));
  const perfil = usuario?.perfil;
  const containerFieis = document.getElementById('grafico-fieis-container');
  
  const temPermissao = perfil === 'ADMIN' || perfil === 'PASTOR' || perfil === 'SUPER_ADMIN';
  
  if (containerFieis) {
    containerFieis.style.display = temPermissao ? 'block' : 'none';
  }
  
  return temPermissao;
}

async function carregarKpis(token) {
  try {
    const response = await fetch('http://localhost:3000/api/dashboard/kpis', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Falha ao buscar KPIs');
    
    const kpis = await response.json();
    
    // --- Lógica do Mês Atual ---
    const dataAtual = new Date();
    // Pega o nome do mês abreviado (ex: "jun.") e capitaliza a primeira letra.
    const mesAbreviado = dataAtual.toLocaleString('pt-BR', { month: 'short' })
                                  .replace('.', '')
                                  .replace(/^\w/, (c) => c.toUpperCase());
    
    // Atualiza o título do card
    const tituloEl = document.getElementById('kpi-arrecadacao-titulo');
    if (tituloEl) {
      tituloEl.textContent = `Arrecadação (${mesAbreviado})`;
    }
    // --- Fim da Lógica ---

    // Garante que temos um número antes de formatar
    const arrecadacao = kpis.arrecadacaoMes || 0;
    const valorFormatado = arrecadacao.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    // Preenche os cards com os novos IDs
    document.getElementById('kpi-arrecadacao-mes').textContent = valorFormatado;
    document.getElementById('kpi-total-usuarios').textContent = kpis.totalUsuarios || 0;
    document.getElementById('kpi-total-igrejas').textContent = kpis.totalIgrejas || 0;
    document.getElementById('kpi-total-celulas').textContent = kpis.totalCelulas || 0;

  } catch (err) {
    document.getElementById('kpi-arrecadacao-mes').textContent = 'R$ -';
    document.getElementById('kpi-total-usuarios').textContent = '-';
    document.getElementById('kpi-total-igrejas').textContent = '-';
    document.getElementById('kpi-total-celulas').textContent = '-';
  }
}

async function carregarGraficos(token) {
  const canvas = document.getElementById('graficoDizimos');
  const tiposDizimosCanvas = document.getElementById('tiposDizimosChart');
  if (!canvas || !tiposDizimosCanvas) return;

  try {
    const response = await fetch('http://localhost:3000/api/dashboard', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Falha ao buscar dados dos gráficos');

    const dados = await response.json();
    if (!Array.isArray(dados) || dados.length === 0) {
      // Mostra mensagem de sem dados para ambos os gráficos
      mostrarMensagemSemDados(canvas.parentElement, 'sem-dados-dizimos');
      mostrarMensagemSemDados(tiposDizimosCanvas.parentElement, 'sem-dados-tipos');
      return;
    }

    // Esconde mensagens de sem dados
    esconderMensagemSemDados(canvas.parentElement, 'sem-dados-dizimos');
    esconderMensagemSemDados(tiposDizimosCanvas.parentElement, 'sem-dados-tipos');

    // Processa dados para o primeiro gráfico (Total por tipo)
    const totalPorTipo = dados.reduce((acc, curr) => {
      acc[curr.tipotributo] = (acc[curr.tipotributo] || 0) + parseFloat(curr.total);
      return acc;
    }, {});

    const labelsTipo = Object.keys(totalPorTipo);
    const valoresTipo = Object.values(totalPorTipo);

    // Processa dados para o segundo gráfico (Total por Mês)
    const totalPorMes = dados.reduce((acc, curr) => {
      acc[curr.mes] = (acc[curr.mes] || 0) + parseFloat(curr.total);
      return acc;
    }, {});
    
    const labelsMes = Object.keys(totalPorMes);
    const valoresMes = Object.values(totalPorMes);

    // Destrói instâncias antigas se existirem
    if (graficoPorTipo) graficoPorTipo.destroy();
    if (graficoPorMes) graficoPorMes.destroy();

    // Paleta de cores consistente para ambos os gráficos
    const paletaDeCores = ['#007BFF', '#FF6384', '#4BC0C0', '#FFCE56', '#9966FF', '#FF9F40'];

    // Cria Gráfico 1: Rosca - Total por Tipo de Tributo
    graficoPorTipo = new Chart(tiposDizimosCanvas.getContext('2d'), {
      type: 'doughnut',
      data: {
        labels: labelsTipo,
        datasets: [{
          label: 'Total por Tipo',
          data: valoresTipo,
          backgroundColor: paletaDeCores,
          hoverOffset: 4
        }]
      },
      options: { 
        responsive: true, 
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
          },
        }
      }
    });

    // Cria Gráfico 2: Rosca - Total por Mês
    graficoPorMes = new Chart(canvas.getContext('2d'), {
      type: 'doughnut',
      data: {
        labels: labelsMes,
        datasets: [{
          label: 'Total por Mês',
          data: valoresMes,
          backgroundColor: paletaDeCores,
          hoverOffset: 4
        }]
      },
      options: { 
        responsive: true, 
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
          },
        }
      }
    });

  } catch (err) {
    // Em caso de erro, mostra mensagem de sem dados
    mostrarMensagemSemDados(canvas.parentElement, 'sem-dados-dizimos');
    mostrarMensagemSemDados(tiposDizimosCanvas.parentElement, 'sem-dados-tipos');
  }
}

function mostrarMensagemSemDados(container, id) {
  if (!container) return;
  
  // Esconde o canvas
  const canvas = container.querySelector('canvas');
  if (canvas) canvas.style.display = 'none';
  
  // Cria ou mostra mensagem de sem dados
  let mensagemEl = container.querySelector(`#${id}`);
  if (!mensagemEl) {
    mensagemEl = document.createElement('div');
    mensagemEl.id = id;
    mensagemEl.className = 'text-center text-muted py-5';
    mensagemEl.innerHTML = `
      <i class="bi bi-inbox display-1"></i>
      <p class="mt-3">Sem dados no momento.</p>
    `;
    container.appendChild(mensagemEl);
  }
  mensagemEl.style.display = 'block';
}

function esconderMensagemSemDados(container, id) {
  if (!container) return;
  
  // Mostra o canvas
  const canvas = container.querySelector('canvas');
  if (canvas) canvas.style.display = 'block';
  
  // Esconde mensagem de sem dados
  const mensagemEl = container.querySelector(`#${id}`);
  if (mensagemEl) mensagemEl.style.display = 'none';
}

async function popularFiltroCelulasFieis(token) {
  const usuario = JSON.parse(sessionStorage.getItem('usuario'));
  const perfil = usuario?.perfil;
  const filtroCelula = document.getElementById('filtroCelulaFieis');
  if (!filtroCelula) return;

  // Limpa opções
  filtroCelula.innerHTML = '<option value="">Todas as Células</option>';

  let url = '';
  if (perfil === 'ADMIN' || perfil === 'SUPER_ADMIN') {
    url = `http://localhost:3000/api/celulas?igreja_id=${usuario.igreja_id}`;
  } else if (perfil === 'PASTOR') {
    url = 'http://localhost:3000/api/celulas/minhas';
  } else {
    filtroCelula.disabled = true;
    return;
  }

  try {
    const response = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
    if (!response.ok) throw new Error('Erro ao buscar células');
    const celulas = await response.json();
    celulas.forEach(celula => {
      const opt = document.createElement('option');
      opt.value = celula.id;
      opt.textContent = celula.nome;
      filtroCelula.appendChild(opt);
    });
    filtroCelula.disabled = false;
  } catch (err) {
    filtroCelula.disabled = true;
  }
}

async function carregarGraficoFieis(token, celulaId = '') {
  // Verificação adicional de segurança
  const usuario = JSON.parse(sessionStorage.getItem('usuario'));
  const perfil = usuario?.perfil;
  const temPermissao = perfil === 'ADMIN' || perfil === 'PASTOR' || perfil === 'SUPER_ADMIN';
  
  if (!temPermissao) {
    return;
  }

  const containerFieis = document.getElementById('grafico-fieis-container');
  if (!containerFieis || containerFieis.style.display === 'none') return;

  const canvas = document.getElementById('graficoFieis');
  const semDadosEl = document.getElementById('sem-dados-fieis');
  
  if (!canvas) return;

  try {
    let url = 'http://localhost:3000/api/dashboard/fieis';
    if (celulaId) {
      url += `?celula_id=${celulaId}`;
    }
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!response.ok) throw new Error('Falha ao buscar dados dos fiéis contribuintes');

    const dados = await response.json();
    
    if (!Array.isArray(dados) || dados.length === 0) {
      // Mostra mensagem de sem dados
      if (semDadosEl) semDadosEl.style.display = 'block';
      if (canvas.parentElement) canvas.parentElement.style.display = 'none';
      return;
    }

    // Esconde mensagem de sem dados
    if (semDadosEl) semDadosEl.style.display = 'none';
    if (canvas.parentElement) canvas.parentElement.style.display = 'block';

    // Processa dados para o gráfico
    const labels = dados.map(item => item.nome);
    const valores = dados.map(item => parseFloat(item.total_dizimos));
    const cores = dados.map((_, index) => {
      const coresArray = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0'];
      return coresArray[index % coresArray.length];
    });

    // Destrói instância antiga se existir
    if (graficoFieis) graficoFieis.destroy();

    // Cria gráfico de barras
    graficoFieis = new Chart(canvas.getContext('2d'), {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Total de Dízimos (R$)',
          data: valores,
          backgroundColor: cores,
          borderColor: cores.map(cor => cor.replace('0.8', '1')),
          borderWidth: 1,
          borderRadius: 4,
          borderSkipped: false,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                return `R$ ${context.parsed.y.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function(value) {
                return 'R$ ' + value.toLocaleString('pt-BR');
              }
            }
          },
          x: {
            ticks: {
              maxRotation: 45,
              minRotation: 0
            }
          }
        }
      }
    });

  } catch (err) {
    // Em caso de erro, mostra mensagem de sem dados
    if (semDadosEl) semDadosEl.style.display = 'block';
    if (canvas.parentElement) canvas.parentElement.style.display = 'none';
  }
}

// Expose the function globally
window.carregarDashboard = carregarDashboard;