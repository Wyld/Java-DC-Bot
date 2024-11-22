const express = require('express');
const app = express();

app.get('/keep_alive', (req, res) => {
    res.status(200).send('Bot läuft!');
});

const PORT = 7000;
app.listen(PORT, () => {
    console.log(`Server läuft auf http://localhost:${PORT}`);
});
