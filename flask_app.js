const express = require('express');
const axios = require('axios');
require('dotenv').config();

const app = express();

// OAuth2-Konfiguration
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = 'http://localhost:10000/callback';
const SCOPE = 'identify email guilds';

// OAuth2-Login-Seite
app.get('/login', (req, res) => {
    const url = `https://discord.com/api/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(
        REDIRECT_URI
    )}&response_type=code&scope=${encodeURIComponent(SCOPE)}`;
    res.redirect(url);
});

// OAuth2-Rückruf-Handler
app.get('/callback', async (req, res) => {
    const { code } = req.query;

    if (!code) {
        return res.status(400).send('Authorization code fehlt!');
    }

    try {
        const response = await axios.post(
            'https://discord.com/api/oauth2/token',
            new URLSearchParams({
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET,
                grant_type: 'authorization_code',
                code,
                redirect_uri: REDIRECT_URI,
                scope: SCOPE,
            })
        );

        const { access_token } = response.data;

        // Benutzerinformationen abrufen
        const userResponse = await axios.get('https://discord.com/api/users/@me', {
            headers: { Authorization: `Bearer ${access_token}` },
        });

        res.send(`Willkommen, ${userResponse.data.username}!`);
    } catch (error) {
        console.error(error);
        res.status(500).send('Fehler beim OAuth-Prozess.');
    }
});

// Webserver starten
function runFlask() {
    app.listen(10001, () => {
        console.log('Flask-Webserver läuft auf http://localhost:10001');
    });
}

module.exports = { runFlask };
