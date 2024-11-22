const { RPCClient } = require('discord-rpc');

// Discord Rich Presence einrichten
const rpc = new RPCClient({ transport: 'ipc' });

async function setDiscordPresence(client) {
    rpc.once('ready', () => {
        console.log('Rich Presence verbunden!');
        rpc.setActivity({
            details: 'Watching People play with Feelings',
            state: 'In einem Spiel',
            startTimestamp: new Date(),
            largeImageKey: 'game_icon',
            largeImageText: 'Großes Icon',
            smallImageKey: 'level_up',
            smallImageText: 'Level 100',
        });
    });

    rpc.login({ clientId: process.env.CLIENT_ID }).catch(console.error);
}

module.exports = { setDiscordPresence };
