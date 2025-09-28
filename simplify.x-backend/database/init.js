const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./simplifyx.db');

db.serialize(() => {
    console.log('A criar tabelas na base de dados...');

    // Tabela de ameaças (para as nossas listas)
    db.run(`CREATE TABLE IF NOT EXISTS threats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        value TEXT NOT NULL UNIQUE
    )`);

    // Tabela de utilizadores (para o login simulado)
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL 
    )`);
    
    // Tabela de listas brancas dos utilizadores
    db.run(`CREATE TABLE IF NOT EXISTS whitelists (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        domain TEXT NOT NULL,
        FOREIGN KEY(user_id) REFERENCES users(id)
    )`);

    console.log('Tabelas criadas com sucesso.');

    // Inserir alguns dados iniciais
    const stmt = db.prepare("INSERT OR IGNORE INTO threats (type, value) VALUES (?, ?)");
    const tlds = ['.xyz', '.top', '.club', '.info', '.biz'];
    tlds.forEach(tld => stmt.run('tld', tld));
    stmt.finalize();

    console.log('Dados iniciais inseridos.');
});

db.close();