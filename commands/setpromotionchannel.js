const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { setPromotionLogChannel } = require('../configStore');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setpromotionchannel')
    .setDescription('Set the channel where staff promotions and demotions get announced')
    .addChannelOption(option =>
      option
        .setName('channel')
        .setDescription('The text channel to post staff announcements in')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    const channel = interaction.options.getChannel('channel');

    await setPromotionLogChannel(interaction.guild.id, channel.id);
    await interaction.reply(`🎉 Staff promotions/demotions will now be announced in ${channel}.`);
  },
};
