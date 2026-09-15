const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { setTicketConfig } = require('../configStore');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticketsetup')
    .setDescription('Configure the ticket system')
    .addChannelOption(option =>
      option
        .setName('category')
        .setDescription('The category new ticket channels should be created under')
        .addChannelTypes(ChannelType.GuildCategory)
        .setRequired(true)
    )
    .addRoleOption(option =>
      option.setName('support_role').setDescription('The role that can see and respond to tickets').setRequired(true)
    )
    .addChannelOption(option =>
      option
        .setName('transcript_channel')
        .setDescription('Where closed ticket transcripts get posted')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    const category = interaction.options.getChannel('category');
    const supportRole = interaction.options.getRole('support_role');
    const transcriptChannel = interaction.options.getChannel('transcript_channel');

    await setTicketConfig(interaction.guild.id, {
      categoryId: category.id,
      supportRoleId: supportRole.id,
      transcriptChannelId: transcriptChannel.id,
    });

    await interaction.reply(
      `✅ Ticket system configured:\n` +
      `• New tickets will be created under **${category.name}**\n` +
      `• **${supportRole.name}** can see and respond to tickets\n` +
      `• Transcripts will be posted in ${transcriptChannel}\n\n` +
      `Now run \`/ticketpanel\` in the channel where members should open tickets.`
    );
  },
};
