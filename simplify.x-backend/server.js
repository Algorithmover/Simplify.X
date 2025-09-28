
const express = require('express');
const cors = require('cors');
const apiRoutes = require('./routes/api.js'); // Importa as nossas rotas

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Diz ao Express para usar o nosso ficheiro de rotas para qualquer pedido que comece com /api
app.use('/api', apiRoutes);

// Rota principal para verificar se o servidor está online
app.get('/', (req, res) => {
    res.send('Servidor simplify.x v4.0 está online!');
});

app.listen(PORT, () => {
    console.log(`Servidor simplify.x v4.0 a funcionar em http://localhost:${PORT}`);
});