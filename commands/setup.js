const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { startSetup } = require('../setupWizard');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Run the guided setup wizard to configure the bot for this server')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    await startSetup(interaction);
  },
};
