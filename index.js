require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, Events, GatewayIntentBits, EmbedBuilder, PermissionsBitField, REST, Routes } = require('discord.js');
const { initDatabase } = require('./db');
const { openTicket, claimTicketAction, requestCloseConfirmation, confirmClose, cancelClose } = require('./ticketActions');
const { handleSetupSelection } = require('./setupWizard');

const { DISCORD_TOKEN, CLIENT_ID } = process.env;

if (!DISCORD_TOKEN) {
  console.error('Missing DISCORD_TOKEN in your .env file (or Railway variables).');
  process.exit(1);
}

const rest = new REST().setToken(DISCORD_TOKEN);

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

client.on(Events.GuildCreate, async guild => {
  // Global commands can take up to an hour to show up in a brand-new server.
  // Registering the same commands directly to this specific guild makes them
  // appear instantly. Discord automatically prefers the guild copy over the
  // global one when both exist, so this never causes duplicates.
  if (CLIENT_ID) {
    try {
      const commandsData = [...client.commands.values()].map(c => c.data.toJSON());
      await rest.put(Routes.applicationGuildCommands(CLIENT_ID, guild.id), { body: commandsData });
      console.log(`Instantly registered ${commandsData.length} commands to new guild: ${guild.name}`);
    } catch (error) {
      console.error(`Failed to instantly register commands for guild ${guild.name}:`, error);
    }
  } else {
    console.warn('CLIENT_ID is not set — skipping instant per-guild command registration.');
  }

  // Finds a channel it can actually post in and drops a welcome message pointing admins to /setup.
  try {
    const me = guild.members.me ?? (await guild.members.fetchMe());

    const targetChannel =
      (guild.systemChannel &&
        guild.systemChannel.permissionsFor(me)?.has(PermissionsBitField.Flags.SendMessages) &&
        guild.systemChannel) ||
      guild.channels.cache
        .filter(c => c.isTextBased() && c.permissionsFor(me)?.has(PermissionsBitField.Flags.SendMessages))
        .sort((a, b) => a.rawPosition - b.rawPosition)
        .first();

    if (!targetChannel) return;

    const embed = new EmbedBuilder()
      .setColor(0x2dd4bf)
      .setTitle('👋 Thanks for adding Utility Pro!')
      .setDescription(
        `I handle moderation, staff promotions, a support ticket system, and a partner showcase — all configurable.\n\n` +
        `**To get started, run \`/setup\`** — a quick guided setup (channel and role pickers, no typing IDs) that configures everything in about a minute.\n\n` +
        `You can re-run \`/setup\` any time to change your settings later.`
      )
      .setFooter({ text: 'Only members with "Manage Server" can run /setup.' });

    await targetChannel.send({ embeds: [embed] });
  } catch (error) {
    console.error('Failed to send welcome message on guild join:', error);
  }
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
      if (interaction.customId === 'ticket_claim') return await claimTicketAction(interaction);
      if (interaction.customId === 'ticket_close') return await requestCloseConfirmation(interaction);
      if (interaction.customId === 'ticket_close_confirm') return await confirmClose(interaction);
      if (interaction.customId === 'ticket_close_cancel') return await cancelClose(interaction);
    }

    if (interaction.isStringSelectMenu()) {
      if (interaction.customId === 'ticket_type_select') {
        return await openTicket(interaction, interaction.values[0]);
      }
    }

    if (interaction.isChannelSelectMenu() || interaction.isRoleSelectMenu()) {
      if (interaction.customId === 'setup_select') {
        return await handleSetupSelection(interaction);
      }
    }
  } catch (error) {
    // Discord invalidates an interaction's token if we don't respond within 3
    // seconds (code 10062), or if it was somehow already acknowledged (40060).
    // These are rare, unavoidable races (a network hiccup, a redeploy landing
    // at the wrong instant, a double-click) rather than bugs in our code —
    // any reply attempt at this point would fail the same way, so we just log
    // it quietly and move on instead of dumping a full stack trace.
    if (error.code === 10062 || error.code === 40060) {
      console.warn(`Interaction expired before it could be handled (code ${error.code}) — this is an occasional Discord-side timing issue, not a bug.`);
      return;
    }

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
