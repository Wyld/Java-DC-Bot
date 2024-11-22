require('dotenv').config();
const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle } = require('discord.js');
const { keepAlive } = require('./keep_alive');
const { runFlask } = require('./flask_app'); // Flask-Webserver
const setDiscordPresence = require('./discord_presence'); // Präsenz setzen
const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// Slash Commands
const commands = [
  new SlashCommandBuilder().setName('ping').setDescription('Antwortet mit Pong!'),
  new SlashCommandBuilder()
      .setName('reactionroles')
      .setDescription('Erstellt eine Nachricht mit Rollen-Buttons.')
      .addStringOption(option =>
          option.setName('roles').setDescription('Liste von markierten Rollen, z.B. @Rolle1 @Rolle2').setRequired(true))
      .addStringOption(option =>
          option.setName('emojis').setDescription('Liste von Emojis für die Rollen, z.B. :emoji1: :emoji2:').setRequired(true)),
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(token);

// Befehle registrieren
(async () => {
  try {
    console.log('Befehle registrieren...');
    await rest.put(Routes.applicationCommands(clientId), { body: commands });
    console.log('Befehle erfolgreich registriert!');
  } catch (error) {
    console.error('Fehler beim Registrieren:', error);
  }
})();

// Nutzung der Funktion
client.once('ready', async () => {
  console.log(`Bot ${client.user.tag} ist online.`);
  await setDiscordPresence(client); // Discord-Präsenz setzen
});

// Helper: Emoji-Validierung
const isValidEmoji = emoji => {
  const unicodeEmojiRegex = /^[\p{Extended_Pictographic}]+$/u;
  const discordEmojiRegex = /^<a?:\w+:\d+>$/;
  return unicodeEmojiRegex.test(emoji) || discordEmojiRegex.test(emoji);
};

// Interaktionen
client.on('interactionCreate', async interaction => {
  if (interaction.isCommand() && interaction.commandName === 'reactionroles') {
    const roles = interaction.options.getString('roles').split(' ');
    const emojis = interaction.options.getString('emojis').split(' ');

    if (roles.length !== emojis.length) {
      return interaction.reply({
        content: 'Die Anzahl der Rollen und Emojis muss übereinstimmen!',
        ephemeral: true,
      });
    }

    const rows = [];
    for (let i = 0; i < roles.length; i++) {
      const roleId = roles[i].replace(/[<@&>]/g, '');
      const emojiInput = emojis[i];
      const role = interaction.guild.roles.cache.get(roleId);

      if (!role || !isValidEmoji(emojiInput)) {
        return interaction.reply({
          content: `Ungültige Rolle oder Emoji: ${emojiInput}.`,
          ephemeral: true,
        });
      }

      const button = new ButtonBuilder()
          .setCustomId(`reactionrole_${roleId}`)
          .setLabel(role.name)
          .setEmoji(emojiInput)
          .setStyle(ButtonStyle.Primary);

      if (rows.length === 0 || rows[rows.length - 1].components.length === 5) {
        rows.push(new ActionRowBuilder());
      }
      rows[rows.length - 1].addComponents(button);
    }

    await interaction.reply({
      content: 'Klicke auf die Buttons, um Rollen hinzuzufügen oder zu entfernen.',
      components: rows,
    });
  } else if (interaction.isButton()) {
    const roleId = interaction.customId.split('_')[1];
    const role = interaction.guild.roles.cache.get(roleId);

    if (!role) {
      return interaction.reply({ content: 'Diese Rolle existiert nicht!', ephemeral: true });
    }

    const member = interaction.guild.members.cache.get(interaction.user.id);

    if (member.roles.cache.has(roleId)) {
      await member.roles.remove(roleId);
      return interaction.reply({ content: `Rolle **${role.name}** entfernt.`, ephemeral: true });
    } else {
      await member.roles.add(roleId);
      return interaction.reply({ content: `Rolle **${role.name}** hinzugefügt.`, ephemeral: true });
    }
  }
});

// Discord-Bot starten
client.login(process.env.DISCORD_TOKEN);

