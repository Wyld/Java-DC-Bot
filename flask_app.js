const express = require('express');
require('dotenv').config();

const app = express();

// Root-Endpoint für Healthchecks
app.get('/', (req, res) => res.send('Der Bot läuft!'));

// Keep-Alive-Endpoint (optional)
app.get('/keep_alive', (req, res) => res.send('Keep-alive aktiv!'));

// Port aus Umgebungsvariablen (Render erfordert dies)
const PORT = process.env.PORT;
if (!PORT) {
    throw new Error('PORT environment variable not set!');
}

// Server starten und auf allen IPs lauschen
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Flask-Webserver läuft auf Port ${PORT}`);
});


