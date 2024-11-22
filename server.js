// server.js
require('dotenv').config();
const express = require('express');

// Express Setup
const app = express();
const PORT = process.env.PORT || 7000; // Port anpassen

// Keep-Alive Route
app.get('/keep_alive', (req, res) => {
    res.status(200).send('Bot ist online!');
});

// Webserver starten
app.listen(PORT, () => {
    console.log(`Webserver läuft auf http://localhost:${PORT}`);
});
