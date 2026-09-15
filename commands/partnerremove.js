const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { removePartner } = require('../partnerStore');
const { refreshPartnerPanel } = require('../partnerPanel');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('partnerremove')
    .setDescription('Remove a partner from the showcase panel')
    .addStringOption(option => option.setName('name').setDescription('Partner server name (must match exactly)').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    const name = interaction.options.getString('name');

    const removed = await removePartner(interaction.guild.id, name);
    if (!removed) {
      return interaction.reply({ content: `No partner found named **${name}**. Check \`/partnerlist\` for exact names.`, ephemeral: true });
    }

    const result = await refreshPartnerPanel(interaction.guild);
    if (!result.updated) {
      return interaction.reply({ content: `✅ Removed **${name}**, but no live panel was found to update.`, ephemeral: true });
    }

    await interaction.reply({ content: `✅ Removed **${name}** from the partner panel.`, ephemeral: true });
  },
};
