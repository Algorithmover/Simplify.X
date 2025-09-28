// =================================================================
// SIMPLIFY.X - CONTENT SCRIPT (v4.0 - PROFESSIONAL)
// =================================================================

// --- Pontuações de Risco (devem ser consistentes com o background) ---
const PONTOS_DE_RISCO = {
    CONTEUDO_SCAM: 45,
    FORMJACKING_SUSPEITO: 80
};

// --- Listas de Verificação de Conteúdo ---
// Numa versão futura, estas listas também poderiam vir do servidor.
const GATEWAYS_PAGAMENTO_CONHECIDOS = ['stripe.com', 'paypal.com', 'mercadopago.com.br', 'pagseguro.uol.com.br'];

// =================================================================
// MÓDULO 1: AÇÃO NA PÁGINA (INJETAR ELEMENTOS)
// =================================================================

// Função para injetar o banner de aviso no topo da página.
function injetarBannerDeAviso(mensagem) {
    // Evita injetar múltiplos banners na mesma página
    if (document.getElementById('simplifyx-warning-banner')) return;

    // Cria o elemento do banner
    const banner = document.createElement('div');
    banner.id = 'simplifyx-warning-banner';
    banner.textContent = `⚠️ ALERTA SIMPLIFY.X: ${mensagem}`;
    
    // Adiciona o nosso ficheiro CSS à página para estilizar o banner
    const link = document.createElement('link');
    link.href = chrome.runtime.getURL('warning.css');
    link.type = 'text/css';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
    
    // Insere o banner no topo do corpo da página
    document.body.prepend(banner);

    // Empurra o conteúdo da página para baixo para que o banner não o cubra
    document.body.style.transform = `translateY(${banner.offsetHeight}px)`;
}

// Ouve por ordens do background.js para mostrar o aviso.
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'SHOW_WARNING') {
        injetarBannerDeAviso(request.message);
    }
});


// =================================================================
// MÓDULO 2: COLETA E ANÁLISE DE DADOS DA PÁGINA
// =================================================================

// Função que monitoriza formulários de pagamento para detetar Formjacking.
function monitorarFormulariosDePagamento() {
    document.querySelectorAll('form').forEach(form => {
        const temCampoCartao = form.querySelector('input[name*="card"], input[name*="cc-num"]');
        if (temCampoCartao) {
            form.addEventListener('submit', () => {
                try {
                    const formAction = form.action;
                    const dominioDestino = new URL(formAction).hostname;
                    const dominioAtual = window.location.hostname;
                    
                    // Condição de perigo: envia dados para um domínio diferente E que não é um gateway de pagamento conhecido.
                    if (dominioDestino !== dominioAtual && !GATEWAYS_PAGAMENTO_CONHECIDOS.some(gw => dominioDestino.includes(gw))) {
                         chrome.runtime.sendMessage({
                            type: "CONTENT_ANALYSIS",
                            findings: [{
                                id: 'FORMJACKING_SUSPEITO',
                                descricao: `Formulário de pagamento envia dados para um domínio suspeito: ${dominioDestino}`,
                                pontuacao: PONTOS_DE_RISCO.FORMJACKING_SUSPEITO
                            }]
                        });
                    }
                } catch (e) { /* Ignora erros de URL inválida na ação do formulário */ }
            });
        }
    });
}

// Função principal que é executada quando a página termina de carregar.
function executarAnaliseDeConteudo() {
    // 1. Envia o texto da página para o background.js (que o enviará para o servidor ML)
    // Usamos uma amostra do texto para não enviar MBs de dados.
    const amostraDeTexto = document.body.innerText.substring(0, 5000);
    chrome.runtime.sendMessage({
        type: "PAGE_TEXT_CONTENT",
        text: amostraDeTexto
    });

    // 2. Inicia o monitoramento ativo de formulários na página.
    monitorarFormulariosDePagamento();
}

// Espera a página estar totalmente carregada para executar as análises.
window.addEventListener('load', executarAnaliseDeConteudo);