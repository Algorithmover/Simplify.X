// Simula um classificador de texto treinado para detetar scams.
// Palavras-chave com "pesos" que contribuem para a pontuação de scam.
const SCAM_KEYWORDS = {
    'parabéns': 10, 'você ganhou': 20, 'prémio': 15, 'exclusivo': 10,
    'aja agora': 15, 'oferta': 10, 'expira': 10, 'tempo limitado': 15,
    'clique aqui': 5, 'garantido': 20, 'grátis': 10, 'sorteio': 10,
    'renda extra': 15, 'fácil': 10, 'dinheiro': 10, 'investimento': 15,
    'segredo': 10, 'milionário': 20, 'risco zero': 25,
    'login de segurança': 30, 'conta suspensa': 35, 'verificar dados': 25
};

function classificarConteudo(texto) {
    let scamScore = 0;
    const textoLowerCase = texto.toLowerCase();

    for (const keyword in SCAM_KEYWORDS) {
        if (textoLowerCase.includes(keyword)) {
            scamScore += SCAM_KEYWORDS[keyword];
        }
    }

    // Normaliza a pontuação para uma probabilidade entre 0 e 100
    const probabilidade = Math.min(100, scamScore);

    return {
        probabilidadeDeScam: probabilidade,
        isScam: probabilidade > 60 // Limite para considerar como scam
    };
}

module.exports = { classificarConteudo };