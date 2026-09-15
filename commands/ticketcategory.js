const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder } = require('discord.js');
const { setTicketCategory, removeTicketCategory, listTicketCategories } = require('../ticketCategoryStore');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticketcategory')
    .setDescription('Manage which Discord category each ticket type routes to')
    .addSubcommand(sub =>
      sub
        .setName('add')
        .setDescription('Route a ticket type to a specific category')
        .addStringOption(option =>
          option.setName('label').setDescription('The dropdown option name, e.g. "Billing"').setRequired(true)
        )
        .addChannelOption(option =>
          option
            .setName('category')
            .setDescription('The category tickets of this type should be created under')
            .addChannelTypes(ChannelType.GuildCategory)
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('remove')
        .setDescription('Remove a ticket type routing')
        .addStringOption(option => option.setName('label').setDescription('The dropdown option name to remove').setRequired(true))
    )
    .addSubcommand(sub => sub.setName('list').setDescription('List all configured ticket type routings'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'add') {
      const label = interaction.options.getString('label');
      const category = interaction.options.getChannel('category');
      await setTicketCategory(interaction.guild.id, label, category.id);
      return interaction.reply(
        `✅ Tickets labeled **${label}** will now be created under **${category.name}**.\n` +
        `Run \`/ticketpanel\` again to refresh the dropdown so it includes this option.`
      );
    }

    if (sub === 'remove') {
      const label = interaction.options.getString('label');
      const removed = await removeTicketCategory(interaction.guild.id, label);
      if (!removed) {
        return interaction.reply({ content: `No routing found for **${label}**.`, ephemeral: true });
      }
      return interaction.reply(`🗑️ Removed the routing for **${label}**. Tickets with that label will now use the default category.`);
    }

    if (sub === 'list') {
      const routings = await listTicketCategories(interaction.guild.id);
      if (routings.length === 0) {
        return interaction.reply({
          content: 'No custom routings set — all ticket types currently go to the default category from `/ticketsetup`.',
          ephemeral: true,
        });
      }

      const embed = new EmbedBuilder()
        .setTitle('Ticket Type Routing')
        .setColor(0x2dd4bf)
        .setDescription(routings.map(r => `**${r.label}** → <#${r.categoryId}>`).join('\n'));

      return interaction.reply({ embeds: [embed], ephemeral: true });
    }
  },
};
