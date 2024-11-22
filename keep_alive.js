const http = require('http');

// Server zum "am Leben halten" des Bots
function keepAlive() {
    const server = http.createServer((req, res) => {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('Bot is alive!\n');
    });

    const PORT = process.env.PORT || 7000; // Default-Port 7000
    server.listen(PORT, () => {
        console.log(`Keep-alive server läuft auf Port ${PORT}`);
    });
}

module.exports = keepAlive; // Funktion exportieren
