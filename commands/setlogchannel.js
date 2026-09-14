const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { setLogChannel, getLogChannel } = require('../configStore');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setlogchannel')
    .setDescription('Set the channel where moderation actions (kicks, bans, warns) get logged')
    .addChannelOption(option =>
      option
        .setName('channel')
        .setDescription('The text channel to send logs to')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    const channel = interaction.options.getChannel('channel');

    setLogChannel(interaction.guild.id, channel.id);
    await interaction.reply(`📋 Moderation actions will now be logged in ${channel}.`);
  },
};
