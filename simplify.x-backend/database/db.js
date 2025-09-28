const sqlite3 = require('sqlite3').verbose();
const DB_SOURCE = "./simplifyx.db";

const db = new sqlite3.Database(DB_SOURCE, (err) => {
    if (err) {
      console.error(err.message);
      throw err;
    } else {
        console.log('Conectado à base de dados SQLite.');
    }
});

module.exports = db;