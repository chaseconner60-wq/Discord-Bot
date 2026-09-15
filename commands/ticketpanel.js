const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
} = require('discord.js');
const { getTicketConfig } = require('../configStore');
const { listTicketCategories } = require('../ticketCategoryStore');

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
        content: 'Run `/ticketsetup` first to configure a default category, support role, and transcript channel.',
        ephemeral: true,
      });
    }

    const routings = await listTicketCategories(interaction.guild.id);
    // Use configured sub-category labels if any exist, otherwise fall back to one generic option.
    const dropdownLabels = routings.length > 0 ? routings.map(r => r.label) : ['General Support'];

    const title = interaction.options.getString('title') ?? 'Need help?';
    const description =
      interaction.options.getString('description') ??
      'Pick the option below that best matches what you need, and a private ticket will be created for you.';

    const embed = new EmbedBuilder()
      .setColor(0x2dd4bf)
      .setAuthor({ name: interaction.guild.name, iconURL: interaction.guild.iconURL() ?? undefined })
      .setTitle(`🎫 ${title}`)
      .setDescription(description)
      .setFooter({ text: 'A private channel will be created just for you.' });

    const menu = new StringSelectMenuBuilder()
      .setCustomId('ticket_type_select')
      .setPlaceholder('Select a support category...')
      .addOptions(dropdownLabels.slice(0, 25).map(label => ({ label, value: label })));

    const row = new ActionRowBuilder().addComponents(menu);

    await interaction.channel.send({ embeds: [embed], components: [row] });
    await interaction.reply({ content: 'Ticket panel posted.', ephemeral: true });
  },
};
