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
const { exec } = require('child_process');

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMembers,
  ],
});

const saveHubs = () => {
  // Speichern der Hubs in hubs.json
  fs.writeFileSync('hubs.json', JSON.stringify(Array.from(hubs.entries()), null, 2));

  // Git-Kommandos ausführen, um Änderungen zu committen und zu pushen
  exec('git config --global user.name "GitHub Actions Bot"');
  exec('git config --global user.email "actions@github.com"');
  exec('git add hubs.json');
  exec('git commit -m "Update hubs.json"', (err, stdout, stderr) => {
    if (err) {
      console.error('Fehler beim Commit:', stderr);
      return;
    }
    console.log('Änderungen committet:', stdout);

    // Änderungen pushen
    exec(
        `git push https://x-access-token:${process.env.GH_TOKEN}@github.com/<USER>/<REPO>.git HEAD:main`,
        (pushErr, pushStdout, pushStderr) => {
          if (pushErr) {
            console.error('Fehler beim Pushen:', pushStderr);
            return;
          }
          console.log('Änderungen erfolgreich gepusht:', pushStdout);
        }
    );
  });
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


client.login(token);
