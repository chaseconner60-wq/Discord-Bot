const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { listPartners } = require('../partnerStore');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('partnerlist')
    .setDescription('View the current list of partners'),

  async execute(interaction) {
    const partners = await listPartners(interaction.guild.id);

    if (partners.length === 0) {
      return interaction.reply({ content: 'No partners have been added yet.', ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setTitle('Current Partners')
      .setColor(0x2dd4bf)
      .setDescription(partners.map((p, i) => `**${i + 1}. ${p.name}** — ${p.inviteUrl}`).join('\n'));

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
