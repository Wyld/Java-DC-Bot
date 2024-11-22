const express = require('express');

const app = express();

// Keep-Alive-Endpoint
app.get('/', (req, res) => res.send('Keep-Alive aktiv!'));

// Port aus Umgebungsvariablen lesen
const PORT = process.env.KEEP_ALIVE_PORT || 7000; // Separater Port

app.listen(PORT, () => {
    console.log(`Keep-alive läuft auf Port ${PORT}`);
});
