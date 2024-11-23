require('dotenv').config();
const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  ButtonBuilder,
  ActionRowBuilder,
  ButtonStyle,
  ChannelType,
} = require('discord.js');
const fs = require('fs');
const setDiscordPresence = require('./discord_presence'); // Präsenz setzen
const hubs = new Map(); // Speichert die Hub-Einstellungen

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

// Helper: Speichern der Hubs
const saveHubs = () => {
  fs.writeFileSync('hubs.json', JSON.stringify(Array.from(hubs.entries()), null, 2));
};

// Hubs laden
if (fs.existsSync('hubs.json')) {
  try {
    const savedHubs = JSON.parse(fs.readFileSync('hubs.json', 'utf-8'));
    if (Array.isArray(savedHubs)) {
      savedHubs.forEach(([guildId, hubData]) => {
        hubs.set(guildId, hubData);
      });
    } else {
      console.error('Das gespeicherte Format in hubs.json ist ungültig.');
    }
  } catch (error) {
    console.error('Fehler beim Laden von hubs.json:', error);
  }
}

// Slash Commands
const commands = [
  new SlashCommandBuilder()
      .setName('ping')
      .setDescription('Zeigt den aktuellen Ping des Bots an.'),
  new SlashCommandBuilder()
      .setName('sethub')
      .setDescription('Legt einen Kanal als Hub für temporäre Sprachkanäle fest.')
      .addChannelOption(option =>
          option
              .setName('channel')
              .setDescription('Wähle den Kanal, der als Hub dienen soll.')
              .setRequired(true),
      )
      .addStringOption(option =>
          option
              .setName('privacy')
              .setDescription('Sichtbarkeit des temporären Kanals (public/private).')
              .addChoices(
                  { name: 'Public (sichtbar für alle)', value: 'public' },
                  { name: 'Private (nur für den User)', value: 'private' },
              )
              .setRequired(true),
      )
      .addIntegerOption(option =>
          option
              .setName('setlimit')
              .setDescription('Maximale Anzahl der Benutzer im Sprachkanal (1-99).')
              .setMinValue(1)
              .setMaxValue(99)
              .setRequired(true),
      ),
  new SlashCommandBuilder()
      .setName('removehub')
      .setDescription('Löscht einen bestehenden Hub.')
      .addChannelOption(option =>
          option
              .setName('channel')
              .setDescription('Wähle den Kanal aus, der als Hub gelöscht werden soll.')
              .setRequired(true),
      ),
  new SlashCommandBuilder()
      .setName('reactionroles')
      .setDescription('Erstellt eine Nachricht mit Rollen-Buttons.')
      .addStringOption((option) =>
          option
              .setName('roles')
              .setDescription('Liste von markierten Rollen, z.B. @Rolle1 @Rolle2')
              .setRequired(true),
      )
      .addStringOption((option) =>
          option
              .setName('emojis')
              .setDescription('Liste von Emojis für die Rollen, z.B. :emoji1: :emoji2:')
              .setRequired(true),
      ),
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

// Bot ist bereit
client.once('ready', async () => {
  console.log(`Bot ${client.user.tag} ist online.`);
  await setDiscordPresence(client); // Discord-Präsenz setzen
});

// Interaktionen
client.on('interactionCreate', async interaction => {
  if (interaction.isCommand()) {
    console.log(`Empfangener Befehl: ${interaction.commandName}`);

    if (interaction.commandName === 'ping') {
      const latency = Date.now() - interaction.createdTimestamp;
      const apiLatency = Math.round(client.ws.ping);
      return interaction.reply({
        content: `🏓 Pong!\nBot-Latenz: \`${latency}ms\`\nAPI-Latenz: \`${apiLatency}ms\``,
        ephemeral: true,
      });
    }

    if (interaction.commandName === 'sethub') {
      const channel = interaction.options.getChannel('channel');
      const privacy = interaction.options.getString('privacy');
      const limit = interaction.options.getInteger('setlimit');

      if (channel.type !== ChannelType.GuildVoice) {
        return interaction.reply({
          content: 'Der ausgewählte Kanal muss ein Sprachkanal sein!',
          ephemeral: true,
        });
      }

      const hubData = {
        hubChannelId: channel.id,
        privacy,
        limit,
      };

      if (!hubs.has(interaction.guild.id)) {
        hubs.set(interaction.guild.id, []);
      }
      hubs.get(interaction.guild.id).push(hubData);
      saveHubs();

      return interaction.reply({
        content: `Hub erfolgreich hinzugefügt:\n**Kanal:** ${channel.name}\n**Privacy:** ${privacy}\n**Limit:** ${limit}`,
        ephemeral: true,
      });
    }

    if (interaction.commandName === 'removehub') {
      const channel = interaction.options.getChannel('channel');

      if (!hubs.has(interaction.guild.id)) {
        return interaction.reply({
          content: 'Es gibt keine Hubs auf diesem Server.',
          ephemeral: true,
        });
      }

      const serverHubs = hubs.get(interaction.guild.id);
      const hubIndex = serverHubs.findIndex(hub => hub.hubChannelId === channel.id);

      if (hubIndex === -1) {
        return interaction.reply({
          content: 'Dieser Kanal ist kein registrierter Hub.',
          ephemeral: true,
        });
      }

      serverHubs.splice(hubIndex, 1);

      if (serverHubs.length === 0) {
        hubs.delete(interaction.guild.id);
      }
      saveHubs();

      return interaction.reply({
        content: `Hub für Kanal **${channel.name}** wurde erfolgreich entfernt.`,
        ephemeral: true,
      });
    }
  }
});

// Sprachkanäle verwalten
client.on('voiceStateUpdate', async (oldState, newState) => {
  if (!newState.channel || oldState.channel?.id === newState.channel?.id) return;

  const serverHubs = hubs.get(newState.guild.id);
  if (!serverHubs) return;

  const hub = serverHubs.find(hub => hub.hubChannelId === newState.channel.id);
  if (!hub) return;

  const { privacy, limit } = hub;
  const user = newState.member;

  try {
    // Debugging: Überprüfen, ob `limit` korrekt ist
    console.log(`Erstelle einen neuen Kanal mit einem Limit von ${limit} Benutzern`);

    // Erstellen des temporären Kanals
    const tempChannel = await newState.guild.channels.create({
      name: `Talk von ${user.displayName}`,
      type: ChannelType.GuildVoice,
      parent: newState.channel.parentId,
      permissionOverwrites: privacy === 'private' ? [
        { id: newState.guild.id, deny: ['ViewChannel'] }, // Serverweite Sichtbarkeit verweigern
        { id: user.id, allow: ['ViewChannel', 'Connect'] }, // Dem User alle Rechte geben
      ] : [], // Keine Einschränkungen bei "Public"
      userLimit: limit, // Maximale Anzahl Benutzer setzen
    });

    // Nutzer direkt in den Kanal verschieben
    await user.voice.setChannel(tempChannel);

    // Überprüfen, ob der Kanal leer ist und löschen
    const interval = setInterval(async () => {
      const refreshedChannel = await newState.guild.channels.fetch(tempChannel.id);
      if (refreshedChannel && refreshedChannel.members.size === 0) {
        clearInterval(interval);
        await tempChannel.delete();
      }
    }, 30 * 1000);

  } catch (error) {
    console.error('Fehler beim Erstellen des temporären Kanals:', error);
  }
});

// Kanal-ID, auf die der Bot reagieren soll
const TARGET_CHANNEL_ID = '1308157336182980748';

client.once('ready', () => {
  console.log(`Bot ist online! Eingeloggt als ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
  // Stelle sicher, dass die Nachricht nicht vom Bot selbst ist
  if (message.author.bot) return;

  // Reagiere nur in dem spezifizierten Kanal
  if (message.channel.id === TARGET_CHANNEL_ID) {
    try {
      // Reagiere mit 👍 und 👎
      await message.react('👍');
      await message.react('👎');
    } catch (error) {
      console.error('Fehler beim Hinzufügen von Reaktionen:', error);
    }
  }
});

// Emoji-Validierungsfunktion
const isValidEmoji = (emoji) => {
  // Unterstützt Unicode- und benutzerdefinierte Discord-Emojis
  const unicodeEmojiRegex = /^[\p{Extended_Pictographic}]+$/u; // Unicode-Emojis
  const discordEmojiRegex = /^<a?:\w+:\d+>$/; // Discord-Custom-Emojis
  return unicodeEmojiRegex.test(emoji) || discordEmojiRegex.test(emoji);
};

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand()) return;

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

      // Emoji-Validierung
      if (!isValidEmoji(emojiInput)) {
        return interaction.reply({
          content: `Das Emoji ${emojiInput} ist ungültig oder nicht unterstützt!`,
          ephemeral: true,
        });
      }

      const button = new ButtonBuilder()
          .setCustomId(`reactionrole_${roleId}`)
          .setLabel(roleName)
          .setEmoji(emojiInput) // Emoji hinzufügen
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
});


client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton()) return;

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
});

client.on('guildMemberAdd', async (member) => {
  console.log(`Neues Mitglied beigetreten: ${member.user.tag} (${member.id})`);
  console.log(`Server: ${member.guild.name} (${member.guild.id})`);

  // Liste der Rollen-IDs
  const roleIds = [
    '1307665315295006730',
    '1309983424349474906', // Rolle 1
    '1309983887580987464', // Rolle 2
    '1309984196110061628', // Rolle 3
  ];

  try {
    for (const roleId of roleIds) {
      const role = member.guild.roles.cache.get(roleId);

      if (!role) {
        console.error(`Die Rolle mit der ID ${roleId} existiert nicht im Server ${member.guild.name}.`);
        continue; // Fahre mit der nächsten Rolle fort
      }

      await member.roles.add(role);
      console.log(`Rolle "${role.name}" erfolgreich an ${member.user.tag} vergeben.`);
    }
  } catch (error) {
    console.error(`Fehler beim Hinzufügen der Rollen für ${member.user.tag}:`, error);
  }
});


client.login(token);
