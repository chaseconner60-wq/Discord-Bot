// Registers your slash commands with Discord.
// Run this once whenever you add, remove, or edit a command's definition.
require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');
const { REST, Routes } = require('discord.js');

const { DISCORD_TOKEN, CLIENT_ID, GUILD_ID } = process.env;

if (!DISCORD_TOKEN || !CLIENT_ID) {
  console.error('Missing DISCORD_TOKEN or CLIENT_ID in your .env file.');
  process.exit(1);
}

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  if ('data' in command && 'execute' in command) {
    commands.push(command.data.toJSON());
  } else {
    console.warn(`Skipping ${file}: missing "data" or "execute" export.`);
  }
}

const rest = new REST().setToken(DISCORD_TOKEN);

(async () => {
  try {
    console.log(`Deploying ${commands.length} slash command(s)...`);

    let route;
    if (GUILD_ID) {
      // Guild commands update instantly — best for development/testing.
      route = Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID);
    } else {
      // Global commands can take up to an hour to propagate.
      route = Routes.applicationCommands(CLIENT_ID);
    }

    const data = await rest.put(route, { body: commands });
    console.log(`Successfully deployed ${data.length} slash command(s).`);
  } catch (error) {
    console.error('Error deploying commands:', error);
  }
})();
