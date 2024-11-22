const express = require('express');
require('dotenv').config();

const app = express();

app.get('/', (req, res) => res.send('Der Bot läuft!'));
app.get('/keep_alive', (req, res) => res.send('Keep-alive aktiv!'));

const PORT = process.env.PORT || 10000;

function runFlask() {
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`Flask-Webserver läuft auf Port ${PORT}`);
    });
}

module.exports = { runFlask };
