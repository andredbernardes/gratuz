// Variáveis globais
let graficoRelatorio = null;
let dadosRelatorio = null;

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    verificarAutenticacao();
    carregarNavbar();
    carregarSidebar();
    inicializarRelatorios();
});

// Inicializar página de relatórios
async function inicializarRelatorios() {
    const token = sessionStorage.getItem('token');
    if (!token) return;

    // Configurar períodos padrão (últimos 6 meses)
    configurarPeriodosPadrao();
    
    // Popular filtro de células
    await popularFiltroCelulas(token);
    
    // Configurar event listeners
    configurarEventListeners();
    
    // Verificar permissões
    verificarPermissoesRelatorios();
}

// Configurar períodos padrão
function configurarPeriodosPadrao() {
    const hoje = new Date();
    const seisMesesAtras = new Date();
    seisMesesAtras.setMonth(hoje.getMonth() - 6);
    
    const periodoInicio = document.getElementById('periodoInicio');
    const periodoFim = document.getElementById('periodoFim');
    
    if (periodoInicio && periodoFim) {
        periodoInicio.value = seisMesesAtras.toISOString().slice(0, 7);
        periodoFim.value = hoje.toISOString().slice(0, 7);
    }
}

// Popular filtro de células
async function popularFiltroCelulas(token) {
    const usuario = JSON.parse(sessionStorage.getItem('usuario'));
    const perfil = usuario?.perfil;
    const filtroCelula = document.getElementById('filtroCelula');
    if (!filtroCelula) return;

    // Limpa opções
    filtroCelula.innerHTML = '<option value="">Todas as Células</option>';

    let url = '';
    if (perfil === 'ADMIN' || perfil === 'SUPER_ADMIN') {
        url = `http://localhost:3000/api/celulas?igreja_id=${usuario.igreja_id}`;
    } else if (perfil === 'PASTOR') {
        url = 'http://localhost:3000/api/celulas/minhas';
    } else {
        return; // MEMBRO não pode acessar relatórios
    }

    try {
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const celulas = await response.json();
            celulas.forEach(celula => {
                const option = document.createElement('option');
                option.value = celula.id;
                option.textContent = celula.nome;
                filtroCelula.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Erro ao carregar células:', error);
    }
}

// Configurar event listeners
function configurarEventListeners() {
    // Botão gerar relatório
    const btnGerarRelatorio = document.getElementById('btnGerarRelatorio');
    if (btnGerarRelatorio) {
        btnGerarRelatorio.addEventListener('click', gerarRelatorio);
    }

    // Botão exportar PDF
    const btnExportarPDF = document.getElementById('btnExportarPDF');
    if (btnExportarPDF) {
        btnExportarPDF.addEventListener('click', () => exportarRelatorio('pdf'));
    }

    // Botão exportar Excel
    const btnExportarExcel = document.getElementById('btnExportarExcel');
    if (btnExportarExcel) {
        btnExportarExcel.addEventListener('click', () => exportarRelatorio('excel'));
    }

    // Botão limpar filtros
    const btnLimparFiltros = document.getElementById('btnLimparFiltros');
    if (btnLimparFiltros) {
        btnLimparFiltros.addEventListener('click', limparFiltros);
    }

    // Mudança no tipo de relatório
    const tipoRelatorio = document.getElementById('tipoRelatorio');
    if (tipoRelatorio) {
        tipoRelatorio.addEventListener('change', ajustarFiltrosPorTipo);
    }
}

// Verificar permissões de relatórios
function verificarPermissoesRelatorios() {
    const usuario = JSON.parse(sessionStorage.getItem('usuario'));
    const perfil = usuario?.perfil;
    
    // Apenas ADMIN, PASTOR e SUPER_ADMIN podem acessar relatórios
    if (perfil === 'MEMBRO') {
        window.location.href = 'dashboard.html';
        return;
    }
}

// Ajustar filtros conforme tipo de relatório
function ajustarFiltrosPorTipo() {
    const tipoRelatorio = document.getElementById('tipoRelatorio').value;
    const filtroCelula = document.getElementById('filtroCelula');
    const periodoInicio = document.getElementById('periodoInicio');
    const periodoFim = document.getElementById('periodoFim');

    // Resetar valores
    filtroCelula.value = '';
    periodoInicio.value = '';
    periodoFim.value = '';

    switch (tipoRelatorio) {
        case 'dizimos':
        case 'contribuintes':
            // Relatórios de dízimos precisam de período
            configurarPeriodosPadrao();
            break;
        case 'celulas':
        case 'membros':
            // Relatórios de células/membros não precisam de período
            break;
    }
}

// Gerar relatório
async function gerarRelatorio() {
    const token = sessionStorage.getItem('token');
    if (!token) return;

    const tipoRelatorio = document.getElementById('tipoRelatorio').value;
    if (!tipoRelatorio) {
        mostrarAlerta('Selecione um tipo de relatório', 'warning');
        return;
    }

    // Mostrar loading
    mostrarLoading(true);
    ocultarResultados();

    try {
        const filtros = obterFiltros();
        const dados = await buscarDadosRelatorio(token, tipoRelatorio, filtros);
        
        if (dados && dados.length > 0) {
            dadosRelatorio = dados;
            exibirRelatorio(dados, tipoRelatorio);
            habilitarBotoesExportacao();
        } else {
            mostrarSemDados();
        }
    } catch (error) {
        console.error('Erro ao gerar relatório:', error);
        mostrarAlerta('Erro ao gerar relatório', 'danger');
    } finally {
        mostrarLoading(false);
    }
}

// Obter filtros do formulário
function obterFiltros() {
    return {
        periodoInicio: document.getElementById('periodoInicio').value,
        periodoFim: document.getElementById('periodoFim').value,
        celulaId: document.getElementById('filtroCelula').value
    };
}

// Buscar dados do relatório
async function buscarDadosRelatorio(token, tipo, filtros) {
    const usuario = JSON.parse(sessionStorage.getItem('usuario'));
    const perfil = usuario?.perfil;
    
    let url = `http://localhost:3000/api/relatorios/${tipo}?`;
    
    // Adicionar filtros
    if (filtros.periodoInicio) url += `periodo_inicio=${filtros.periodoInicio}&`;
    if (filtros.periodoFim) url += `periodo_fim=${filtros.periodoFim}&`;
    if (filtros.celulaId) url += `celula_id=${filtros.celulaId}&`;
    
    // Adicionar filtro de igreja para ADMIN/PASTOR
    if (perfil === 'ADMIN' || perfil === 'PASTOR') {
        url += `igreja_id=${usuario.igreja_id}&`;
    }

    const response = await fetch(url, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    if (response.ok) {
        return await response.json();
    } else {
        throw new Error('Erro ao buscar dados');
    }
}

// Exibir relatório
function exibirRelatorio(dados, tipo) {
    // Calcular resumos
    const resumos = calcularResumos(dados, tipo);
    
    // Atualizar cards de resumo
    atualizarCardsResumo(resumos);
    
    // Criar gráfico
    criarGrafico(dados, tipo);
    
    // Preencher tabela
    preencherTabela(dados, tipo);
    
    // Mostrar resultado
    document.getElementById('resultadoRelatorio').style.display = 'block';
}

// Calcular resumos
function calcularResumos(dados, tipo) {
    if (tipo === 'dizimos' || tipo === 'contribuintes') {
        const total = dados.reduce((sum, item) => sum + parseFloat(item.valor || 0), 0);
        const media = dados.length > 0 ? total / dados.length : 0;
        const membrosUnicos = new Set(dados.map(item => item.usuario_id)).size;
        
        return {
            totalGeral: total,
            mediaMembro: media,
            totalContribuicoes: dados.length,
            membrosAtivos: membrosUnicos
        };
    } else {
        return {
            totalGeral: 0,
            mediaMembro: 0,
            totalContribuicoes: dados.length,
            membrosAtivos: dados.length
        };
    }
}

// Atualizar cards de resumo
function atualizarCardsResumo(resumos) {
    document.getElementById('totalGeral').textContent = formatarMoeda(resumos.totalGeral);
    document.getElementById('mediaMembro').textContent = formatarMoeda(resumos.mediaMembro);
    document.getElementById('totalContribuicoes').textContent = resumos.totalContribuicoes;
    document.getElementById('membrosAtivos').textContent = resumos.membrosAtivos;
}

// Criar gráfico
function criarGrafico(dados, tipo) {
    const ctx = document.getElementById('graficoRelatorio');
    if (!ctx) return;

    // Destruir gráfico anterior
    if (graficoRelatorio) {
        graficoRelatorio.destroy();
    }

    const configGrafico = obterConfigGrafico(dados, tipo);
    graficoRelatorio = new Chart(ctx, configGrafico);
}

// Obter configuração do gráfico
function obterConfigGrafico(dados, tipo) {
    switch (tipo) {
        case 'dizimos':
            return criarGraficoDizimos(dados);
        case 'contribuintes':
            return criarGraficoContribuintes(dados);
        case 'celulas':
            return criarGraficoCelulas(dados);
        case 'membros':
            return criarGraficoMembros(dados);
        default:
            return criarGraficoPadrao(dados);
    }
}

// Criar gráfico de dízimos
function criarGraficoDizimos(dados) {
    // Agrupar por mês
    const dadosPorMes = {};
    dados.forEach(item => {
        const mes = new Date(item.data).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
        dadosPorMes[mes] = (dadosPorMes[mes] || 0) + parseFloat(item.valor);
    });

    return {
        type: 'line',
        data: {
            labels: Object.keys(dadosPorMes),
            datasets: [{
                label: 'Dízimos por Mês',
                data: Object.values(dadosPorMes),
                borderColor: 'rgb(75, 192, 192)',
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Evolução dos Dízimos'
                }
            }
        }
    };
}

// Criar gráfico de contribuintes
function criarGraficoContribuintes(dados) {
    // Agrupar por usuário
    const dadosPorUsuario = {};
    dados.forEach(item => {
        const nome = item.nome_usuario;
        dadosPorUsuario[nome] = (dadosPorUsuario[nome] || 0) + parseFloat(item.valor);
    });

    // Pegar top 10
    const top10 = Object.entries(dadosPorUsuario)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10);

    return {
        type: 'bar',
        data: {
            labels: top10.map(([nome]) => nome),
            datasets: [{
                label: 'Total Contribuído',
                data: top10.map(([, valor]) => valor),
                backgroundColor: 'rgba(54, 162, 235, 0.8)'
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Top 10 Contribuintes'
                }
            }
        }
    };
}

// Criar gráfico de células
function criarGraficoCelulas(dados) {
    return {
        type: 'doughnut',
        data: {
            labels: dados.map(item => item.nome_celula),
            datasets: [{
                data: dados.map(item => item.total_membros),
                backgroundColor: [
                    '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0',
                    '#9966FF', '#FF9F40', '#FF6384', '#C9CBCF'
                ]
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Distribuição de Membros por Célula'
                }
            }
        }
    };
}

// Criar gráfico de membros
function criarGraficoMembros(dados) {
    return {
        type: 'bar',
        data: {
            labels: dados.map(item => item.nome_usuario),
            datasets: [{
                label: 'Membros',
                data: dados.map(() => 1),
                backgroundColor: 'rgba(75, 192, 192, 0.8)'
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Lista de Membros'
                }
            }
        }
    };
}

// Criar gráfico padrão
function criarGraficoPadrao(dados) {
    return {
        type: 'bar',
        data: {
            labels: ['Dados'],
            datasets: [{
                label: 'Quantidade',
                data: [dados.length],
                backgroundColor: 'rgba(75, 192, 192, 0.8)'
            }]
        },
        options: {
            responsive: true
        }
    };
}

// Preencher tabela
function preencherTabela(dados, tipo) {
    const tbody = document.querySelector('#tabelaRelatorio tbody');
    if (!tbody) return;

    tbody.innerHTML = '';

    dados.forEach(item => {
        const tr = document.createElement('tr');
        
        switch (tipo) {
            case 'dizimos':
            case 'contribuintes':
                tr.innerHTML = `
                    <td>${item.nome_usuario || 'N/A'}</td>
                    <td>${item.nome_celula || 'N/A'}</td>
                    <td>${formatarData(item.data)}</td>
                    <td>${formatarMoeda(item.valor)}</td>
                    <td>${item.metodo_pagamento || 'N/A'}</td>
                `;
                break;
            case 'celulas':
                tr.innerHTML = `
                    <td>${item.nome_celula || 'N/A'}</td>
                    <td>${item.total_membros || 0}</td>
                    <td>${item.administrador || 'N/A'}</td>
                    <td>${item.igreja || 'N/A'}</td>
                    <td>${item.status || 'Ativa'}</td>
                `;
                break;
            case 'membros':
                tr.innerHTML = `
                    <td>${item.nome_usuario || 'N/A'}</td>
                    <td>${item.nome_celula || 'N/A'}</td>
                    <td>${item.perfil || 'N/A'}</td>
                    <td>${item.email || 'N/A'}</td>
                    <td>${item.status || 'Ativo'}</td>
                `;
                break;
        }
        
        tbody.appendChild(tr);
    });
}

// Habilitar botões de exportação
function habilitarBotoesExportacao() {
    document.getElementById('btnExportarPDF').disabled = false;
    document.getElementById('btnExportarExcel').disabled = false;
}

// Exportar relatório
function exportarRelatorio(tipo) {
    if (!dadosRelatorio) {
        mostrarAlerta('Gere um relatório primeiro', 'warning');
        return;
    }

    const tipoRelatorio = document.getElementById('tipoRelatorio').value;
    const filtros = obterFiltros();

    switch (tipo) {
        case 'pdf':
            exportarPDF(dadosRelatorio, tipoRelatorio, filtros);
            break;
        case 'excel':
            exportarExcel(dadosRelatorio, tipoRelatorio, filtros);
            break;
    }
}

// Exportar PDF
function exportarPDF(dados, tipo, filtros) {
    // Implementar exportação PDF
    mostrarAlerta('Funcionalidade de exportação PDF em desenvolvimento', 'info');
}

// Exportar Excel
function exportarExcel(dados, tipo, filtros) {
    // Implementar exportação Excel
    mostrarAlerta('Funcionalidade de exportação Excel em desenvolvimento', 'info');
}

// Limpar filtros
function limparFiltros() {
    document.getElementById('tipoRelatorio').value = '';
    document.getElementById('periodoInicio').value = '';
    document.getElementById('periodoFim').value = '';
    document.getElementById('filtroCelula').value = '';
    
    ocultarResultados();
    desabilitarBotoesExportacao();
}

// Mostrar loading
function mostrarLoading(mostrar) {
    const loading = document.getElementById('loadingRelatorio');
    if (loading) {
        loading.style.display = mostrar ? 'block' : 'none';
    }
}

// Ocultar resultados
function ocultarResultados() {
    document.getElementById('resultadoRelatorio').style.display = 'none';
    document.getElementById('semDados').style.display = 'none';
}

// Mostrar sem dados
function mostrarSemDados() {
    document.getElementById('semDados').style.display = 'block';
}

// Desabilitar botões de exportação
function desabilitarBotoesExportacao() {
    document.getElementById('btnExportarPDF').disabled = true;
    document.getElementById('btnExportarExcel').disabled = true;
}

// Funções auxiliares
function formatarMoeda(valor) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(valor || 0);
}

function formatarData(data) {
    if (!data) return 'N/A';
    return new Date(data).toLocaleDateString('pt-BR');
}

function mostrarAlerta(mensagem, tipo) {
    // Implementar sistema de alertas
    alert(mensagem);
} 