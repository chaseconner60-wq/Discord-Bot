require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, Events, GatewayIntentBits } = require('discord.js');
const { initDatabase } = require('./db');
const { openTicket, claimTicketAction, closeTicketAction } = require('./ticketActions');

const { DISCORD_TOKEN } = process.env;

if (!DISCORD_TOKEN) {
  console.error('Missing DISCORD_TOKEN in your .env file (or Railway variables).');
  process.exit(1);
}

// Intents control which events Discord sends your bot.
// GuildMessages + MessageContent are needed so ticket transcripts can include
// what was actually said. MessageContent is a "privileged" intent — you must
// also turn it on under your app's Bot page in the Discord Developer Portal,
// or the bot will fail to log in once this is enabled here.
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

client.commands = new Collection();

const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  if ('data' in command && 'execute' in command) {
    client.commands.set(command.data.name, command);
  } else {
    console.warn(`Skipping ${file}: missing "data" or "execute" export.`);
  }
}

client.once(Events.ClientReady, readyClient => {
  console.log(`Logged in as ${readyClient.user.tag}. Ready to go!`);
});

client.on(Events.InteractionCreate, async interaction => {
  try {
    if (interaction.isChatInputCommand()) {
      const command = interaction.client.commands.get(interaction.commandName);
      if (!command) {
        console.error(`No command matching "${interaction.commandName}" was found.`);
        return;
      }
      await command.execute(interaction);
      return;
    }

    if (interaction.isButton()) {
      if (interaction.customId === 'ticket_open') return await openTicket(interaction);
      if (interaction.customId === 'ticket_claim') return await claimTicketAction(interaction);
      if (interaction.customId === 'ticket_close') return await closeTicketAction(interaction);
    }
  } catch (error) {
    console.error('Error handling interaction:', error);
    const errorResponse = { content: 'Something went wrong handling that.', ephemeral: true };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(errorResponse).catch(() => {});
    } else {
      await interaction.reply(errorResponse).catch(() => {});
    }
  }
});

async function start() {
  try {
    await initDatabase();
  } catch (error) {
    console.error('Failed to initialize the database:', error);
    process.exit(1);
  }

  await client.login(DISCORD_TOKEN);
}

start();
