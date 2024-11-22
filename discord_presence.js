const RPC = require('discord-rpc');

// Rich Presence-Client initialisieren
const client = new RPC.Client({ transport: 'ipc' });

async function setDiscordPresence(bot) {
    client.on('ready', () => {
        console.log('Rich Presence ist aktiv.');

        // Beispiel: Rich Presence konfigurieren
        client.setActivity({
            details: 'Watching People play with Feelings',
            state: 'Competitive',
            startTimestamp: Date.now(),
            largeImageKey: '914938197459472444_1_1_',
            largeImageText: 'Numbani',
            smallImageKey: 'icon',
            smallImageText: 'Level 100 Rogue',
            partyId: 'ae488379-351d-4a4f-ad32-2b9b01c91657',
            partySize: 1,
            partyMax: 5,
            joinSecret: 'MTI4NzM0OjFpMmhuZToxMjMxMjM=',
        });
    });

    try {
        await client.login({ clientId: process.env.CLIENT_ID });
    } catch (error) {
        console.error('Fehler beim Starten der Rich Presence:', error);
    }
}

// Korrekt exportieren
module.exports = setDiscordPresence;
