const express = require('express');
const router = express.Router();
const db = require('../database/db.js');
const { classificarConteudo } = require('../analysis/classifier.js');

// Cache em memória simples para evitar chamadas de API repetidas
const cache = new Map();

// Rota para obter as listas (agora vem da base de dados)
router.get('/lists', (req, res) => {
    db.all("SELECT type, value FROM threats", [], (err, rows) => {
        if (err) {
            res.status(500).json({ "error": err.message });
            return;
        }
        const lists = {
            tldsSuspeitos: rows.filter(r => r.type === 'tld').map(r => r.value)
            // Adicionar outras listas aqui
        };
        res.json(lists);
    });
});

// Rota para análise de domínio com cache
router.post('/analyze-domain', async (req, res) => {
    const { hostname } = req.body;
    if (cache.has(hostname)) {
        console.log(`[CACHE] A servir do cache para: ${hostname}`);
        return res.json(cache.get(hostname));
    }
    
    // Simulação de chamada de API WHOIS
    const eRecente = Math.random() > 0.7;
    let responseData = { isRecent: false };
    if (eRecente) {
        // ... (lógica da data falsa como antes) ...
        responseData = { isRecent: true, /* ... */ };
    }
    
    cache.set(hostname, responseData); // Guarda no cache
    setTimeout(() => cache.delete(hostname), 1000 * 60 * 60); // Expira o cache em 1 hora

    res.json(responseData);
});

// Rota para análise de conteúdo com o classificador ML
router.post('/analyze-content', (req, res) => {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'Texto é obrigatório' });
    
    const resultado = classificarConteudo(text);
    res.json(resultado);
});


// --- ROTAS DE UTILIZADOR ---
router.post('/user/login', (req, res) => {
    // SIMULAÇÃO: Num sistema real, aqui haveria hash de passwords, etc.
    res.json({ success: true, message: 'Login com sucesso!', token: 'fake-jwt-token-12345' });
});

router.get('/user/whitelist', (req, res) => {
    // SIMULAÇÃO: Obter a whitelist do utilizador com base no seu token
    db.all("SELECT domain FROM whitelists WHERE user_id = 1", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ whitelist: rows.map(r => r.domain) });
    });
});

module.exports = router;