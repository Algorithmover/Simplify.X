// =================================================================
// SIMPLIFY.X - BACKGROUND SCRIPT (v4.0 - PROFESSIONAL)
// =================================================================

// --- Configuração Central ---
const API_URL = 'http://localhost:3000'; // O endereço do nosso servidor Node.js

// --- Sistema de Pontuação de Risco ---
// Estes valores definem o "peso" de cada ameaça encontrada.
const PONTOS_DE_RISCO = {
    TLD_SUSPEITO: 30,
    TYPOSQUATTING: 40,
    DOMINIO_RECENTE: 50,
    CONTEUDO_SCAM: 45,
    FORMJACKING_SUSPEITO: 80
};
const LIMITE_DE_RISCO = 50; // Se a pontuação total atingir este valor, a página é considerada perigosa.

// --- Listas de Ameaças (serão carregadas dinamicamente do servidor) ---
let SITES_CONHECIDOS = [];
let TLDs_SUSPEITOS = [];

// =================================================================
// 1. INICIALIZAÇÃO E COMUNICAÇÃO COM O SERVIDOR
// =================================================================

// Função para carregar as listas do nosso servidor quando a extensão inicia.
async function carregarListasDoServidor() {
    console.log("simplify.x: A tentar carregar listas de ameaças do servidor...");
    try {
        const response = await fetch(`${API_URL}/api/lists`);
        if (!response.ok) throw new Error(`Erro na rede: ${response.statusText}`);
        const data = await response.json();
        
        SITES_CONHECIDOS = data.sitesConhecidos || [];
        TLDs_SUSPEITOS = data.tldsSuspeitos || [];
        
        console.log("simplify.x: Listas de ameaças carregadas com sucesso!", { tlds: TLDs_SUSPEITOS.length, sites: SITES_CONHECIDOS.length });
    } catch (error) {
        console.error("simplify.x: Falha ao carregar listas do servidor. A extensão pode não funcionar corretamente.", error);
    }
}

// Ouve o evento de instalação/atualização da extensão para carregar as listas.
chrome.runtime.onInstalled.addListener(() => {
    carregarListasDoServidor();
});

// Ouve o evento de inicialização do navegador para carregar as listas.
chrome.runtime.onStartup.addListener(() => {
    carregarListasDoServidor();
});


// =================================================================
// 2. MÓDULOS DE ANÁLISE
// =================================================================

// Módulo que analisa a estrutura da URL (usa as listas carregadas do servidor).
function analisarEstruturaUrl(url) {
    const findings = [];
    try {
        const urlObj = new URL(url);
        const hostname = urlObj.hostname;

        if (TLDs_SUSPEITOS.some(tld => hostname.endsWith(tld))) {
            findings.push({ id: 'TLD_SUSPEITO', descricao: `Domínio suspeito (${hostname.substring(hostname.lastIndexOf('.'))})`, pontuacao: PONTOS_DE_RISCO.TLD_SUSPEITO });
        }
        if (SITES_CONHECIDOS.some(site => hostname.includes(site.split('.')[0]) && hostname !== `www.${site}` && hostname !== site)) {
            findings.push({ id: 'TYPOSQUATTING', descricao: `Pode estar a imitar um site conhecido (${site})`, pontuacao: PONTOS_DE_RISCO.TYPOSQUATTING });
        }
    } catch (e) { console.warn("URL inválida para análise:", url); }
    return findings;
}

// Módulo que pede ao nosso servidor para verificar a idade do domínio.
async function verificarIdadeDominio(hostname) {
    try {
        const response = await fetch(`${API_URL}/api/analyze-domain`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ hostname })
        });
        if (!response.ok) return [];

        const data = await response.json();
        if (data.isRecent) {
            return [{
                id: 'DOMINIO_RECENTE',
                descricao: `Domínio criado há apenas ${data.daysOld} dias`,
                pontuacao: PONTOS_DE_RISCO.DOMINIO_RECENTE
            }];
        }
    } catch (error) {
        console.error("simplify.x: Erro ao contactar a API de análise de domínio:", error);
    }
    return [];
}


// =================================================================
// 3. LÓGICA PRINCIPAL E ORQUESTRAÇÃO
// =================================================================

// Função principal que orquestra a análise completa da página.
async function analisarPaginaCompleta(tabId, url) {
    if (!url || !url.startsWith('http')) return;

    console.log(`simplify.x: A iniciar análise para ${url}`);
    
    // Análise inicial baseada apenas na URL
    const descobertasUrl = analisarEstruturaUrl(url);
    const descobertasIdade = await verificarIdadeDominio(new URL(url).hostname);

    const todasAsDescobertas = [...descobertasUrl, ...descobertasIdade];
    const pontuacaoTotal = todasAsDescobertas.reduce((acc, finding) => acc + finding.pontuacao, 0);

    // Guarda o resultado na storage para o popup poder ler
    const resultadoFinal = {
        pontuacao: pontuacaoTotal,
        descobertas: todasAsDescobertas,
        limite: LIMITE_DE_RISCO,
        analiseCompleta: false // Ainda falta a análise do conteúdo
    };
    chrome.storage.local.set({ [tabId]: resultadoFinal });
    
    // Se a pontuação já for alta, envia um aviso imediatamente.
    if (pontuacaoTotal >= LIMITE_DE_RISCO) {
        notificarPerigo(tabId, todasAsDescobertas[0].descricao);
    }
}

// Função que envia o alerta (notificação e instrução para o banner)
function notificarPerigo(tabId, razao) {
    // 1. Envia uma notificação de sistema
    chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: 'Alerta de Segurança simplify.x',
        message: `Página suspeita detetada: ${razao}.`
    });
    
    // 2. Envia uma mensagem para o content.js injetar o banner na página
    chrome.tabs.sendMessage(tabId, {
        type: 'SHOW_WARNING',
        message: `PERIGO: ${razao}`
    });
}

// Ouve quando uma aba é totalmente carregada para iniciar a análise.
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.active) {
        analisarPaginaCompleta(tabId, tab.url);
    }
});

// Ouve as mensagens do content.js com a análise de conteúdo e formjacking.
chrome.runtime.onMessage.addListener((request, sender) => {
    const tabId = sender.tab.id;
    if (!tabId) return;

    if (request.type === "CONTENT_ANALYSIS") {
        // Pega no resultado da análise de URL que já tínhamos guardado
        chrome.storage.local.get([tabId.toString()], function(result) {
            let data = result[tabId] || { pontuacao: 0, descobertas: [] };
            
            const pontuacaoAntiga = data.pontuacao;

            // Adiciona as novas descobertas do conteúdo ao resultado geral
            data.descobertas.push(...request.findings);
            data.pontuacao = data.descobertas.reduce((acc, finding) => acc + finding.pontuacao, 0);
            data.analiseCompleta = true; // Marca que a análise de conteúdo terminou

            // Guarda o resultado final e completo
            chrome.storage.local.set({ [tabId]: data });

            // Se a pontuação ultrapassou o limite AGORA (mas não antes), envia o alerta.
            if (data.pontuacao >= LIMITE_DE_RISCO && pontuacaoAntiga < LIMITE_DE_RISCO) {
                notificarPerigo(tabId, request.findings[0].descricao);
            }
        });
    }
});