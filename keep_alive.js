const express = require('express');

const app = express();

app.get('/', (req, res) => res.send('Keep-Alive aktiv!'));

// Flask-kompatiblen Server starten
function runKeepAlive() {
    const PORT = process.env.PORT || 7000;
    app.listen(PORT, () => {
        console.log(`Keep-alive läuft auf Port ${PORT}`);
    });
}

module.exports = runKeepAlive;
