const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const { getTicketConfig } = require('../configStore');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticketpanel')
    .setDescription('Post the ticket panel in this channel')
    .addStringOption(option =>
      option.setName('title').setDescription('Panel title').setRequired(false)
    )
    .addStringOption(option =>
      option.setName('description').setDescription('Panel description').setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    const config = await getTicketConfig(interaction.guild.id);
    if (!config.categoryId || !config.supportRoleId) {
      return interaction.reply({
        content: 'Run `/ticketsetup` first to configure a category, support role, and transcript channel.',
        ephemeral: true,
      });
    }

    const title = interaction.options.getString('title') ?? 'Need help?';
    const description =
      interaction.options.getString('description') ??
      'Click the button below to open a private ticket with our support team.';

    const embed = new EmbedBuilder()
      .setColor(0x2dd4bf)
      .setAuthor({ name: interaction.guild.name, iconURL: interaction.guild.iconURL() ?? undefined })
      .setTitle(`🎫 ${title}`)
      .setDescription(description)
      .setFooter({ text: 'A private channel will be created just for you.' });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('ticket_open').setLabel('Open Ticket').setEmoji('🎫').setStyle(ButtonStyle.Success)
    );

    await interaction.channel.send({ embeds: [embed], components: [row] });
    await interaction.reply({ content: 'Ticket panel posted.', ephemeral: true });
  },
};
