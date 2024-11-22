const express = require('express');
const { Thread } = require('worker_threads');

const app = express();

app.get('/', (req, res) => {
    res.status(200).send('Bot läuft!');
});

// Keep-Alive-Webserver starten
function keepAlive() {
    const server = new Thread(() => {
        app.listen(10000, () => {
            console.log('Keep-Alive-Server läuft auf http://localhost:10000');
        });
    });

    server.start();
}

module.exports = { keepAlive };
