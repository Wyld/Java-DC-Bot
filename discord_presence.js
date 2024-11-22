const { ActivityType } = require('discord.js');

async function setDiscordPresence(bot) {
    console.log('Aktualisiere Präsenz...');
    bot.user.setPresence({
        activities: [{ name: 'Wylder Bot break Feelings', type: ActivityType.Watching }],
        status: 'online',
    });
    console.log('Präsenz aktualisiert.');
}

module.exports = setDiscordPresence;
