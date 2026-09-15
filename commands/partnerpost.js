const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { setPartnerPanel } = require('../configStore');
const { listPartners } = require('../partnerStore');
const { buildPanelPayload } = require('../partnerPanel');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('partnerpost')
    .setDescription('Post the partner showcase panel in this channel (do this once, then use /partneradd)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    const partners = await listPartners(interaction.guild.id);
    const payload = buildPanelPayload(interaction.guild, partners);

    const message = await interaction.channel.send(payload);
    await setPartnerPanel(interaction.guild.id, interaction.channel.id, message.id);

    await interaction.reply({ content: '✅ Partner panel posted. Use `/partneradd` to add partners — this message will update automatically.', ephemeral: true });
  },
};
