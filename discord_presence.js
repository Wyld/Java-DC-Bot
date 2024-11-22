const { ActivityType } = require('discord.js');

async function setDiscordPresence(bot) {
    console.log('Aktualisiere Präsenz...');
    bot.user.setPresence({
        activities: [{ name: 'Feelings - Competitive', type: ActivityType.Playing }],
        status: 'online',
    });
    console.log('Präsenz aktualisiert.');
}

module.exports = setDiscordPresence;
