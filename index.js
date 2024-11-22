require('dotenv').config();
const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { fork } = require('child_process');
const RPC = require('discord-rpc'); // Discord RPC Bibliothek importieren

// Discord-Bot Konfiguration
const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// Erstelle eine Instanz von RichPresence
const rpc = new RPC.Client({ transport: 'ipc' });

const clientIdForRPC = process.env.CLIENT_ID; // Discord Application Client ID

// Slash Commands definieren
const commands = [
  new SlashCommandBuilder()
      .setName('ping')
      .setDescription('Antwortet mit Pong!'),
  new SlashCommandBuilder()
      .setName('reactionroles')
      .setDescription('Erstellt eine Nachricht mit Rollen-Buttons.')
      .addStringOption((option) =>
          option.setName('roles').setDescription('Liste von markierten Rollen, z.B. @Rolle1 @Rolle2').setRequired(true),
      )
      .addStringOption((option) =>
          option.setName('emojis').setDescription('Liste von Emojis für die Rollen, z.B. :emoji1: :emoji2:').setRequired(true),
      ),
].map((command) => command.toJSON());

const rest = new REST({ version: '10' }).setToken(token);

// Slash Commands registrieren
(async () => {
  try {
    console.log('Befehle registrieren...');
    await rest.put(Routes.applicationCommands(clientId), { body: commands });
    console.log('Befehle erfolgreich registriert!');
  } catch (error) {
    console.error('Fehler beim Registrieren:', error);
  }
})();

// Bot-Status setzen (Discord.js Präsenz)
client.once('ready', () => {
  console.log(`Eingeloggt als ${client.user.tag}`);

  client.user.setPresence({
    activities: [
      {
        name: 'People play with Feelings', // Aktivitätsname
        type: 'WATCHING', // Typ der Aktivität
      },
    ],
    status: 'online', // Status des Bots
  });
  console.log("Discord.js Präsenz gesetzt.");

  // Rich Presence (discord-rpc)
  rpc.once('ready', () => {
    console.log('Rich Presence aktiviert!');
    rpc.setActivity({
      details: 'Watching People play with Feelings',
      state: 'Competitive',
      startTimestamp: new Date(),
      endTimestamp: new Date().setMinutes(new Date().getMinutes() + 30),
      largeImageKey: 'game_icon',
      largeImageText: 'Mein Spiel',
      smallImageKey: 'level_up',
      smallImageText: 'Level 100',
      partyId: 'ae488379-351d-4a4f-ad32-2b9b01c91657',
      partySize: 1,
      partyMax: 5,
      joinSecret: 'MTI4NzM0OjFpMmhuZToxMjMxMjM=',
    });
  });

  rpc.login({ clientId: clientIdForRPC }).catch(console.error);
});

// Emoji-Validierungsfunktion
const isValidEmoji = (emoji) => {
  const unicodeEmojiRegex = /^[\p{Extended_Pictographic}]+$/u; // Unicode-Emojis
  const discordEmojiRegex = /^<a?:\w+:\d+>$/; // Discord-Custom-Emojis
  return unicodeEmojiRegex.test(emoji) || discordEmojiRegex.test(emoji);
};

// Interaktionen: Slash Commands und Reaction Role-Buttons
client.on('interactionCreate', async (interaction) => {
  if (interaction.isCommand()) {
    if (interaction.commandName === 'reactionroles') {
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
        const roleName = interaction.guild.roles.cache.get(roleId)?.name || 'Unbekannte Rolle';

        if (!isValidEmoji(emojiInput)) {
          return interaction.reply({
            content: `Das Emoji ${emojiInput} ist ungültig oder nicht unterstützt!`,
            ephemeral: true,
          });
        }

        const button = new ButtonBuilder()
            .setCustomId(`reactionrole_${roleId}`)
            .setLabel(roleName)
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
    }
  } else if (interaction.isButton()) {
    const roleId = interaction.customId.split('_')[1];
    const role = interaction.guild.roles.cache.get(roleId);

    if (!role) {
      return interaction.reply({ content: 'Diese Rolle existiert nicht!', ephemeral: true });
    }

    const member = interaction.guild.members.cache.get(interaction.user.id);

    if (member.roles.cache.has(roleId)) {
      await member.roles.remove(roleId);
      return interaction.reply({
        content: `Die Rolle **${role.name}** wurde entfernt.`,
        ephemeral: true,
      });
    } else {
      await member.roles.add(roleId);
      return interaction.reply({
        content: `Die Rolle **${role.name}** wurde hinzugefügt.`,
        ephemeral: true,
      });
    }
  }
});

// Bot starten
client.login(token);

// Webserver in separatem Prozess starten
fork('./server.js');
