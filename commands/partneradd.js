const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { addPartner, listPartners } = require('../partnerStore');
const { refreshPartnerPanel, MAX_PARTNERS } = require('../partnerPanel');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('partneradd')
    .setDescription('Add a partner to the showcase panel')
    .addStringOption(option => option.setName('name').setDescription('Partner server name').setRequired(true))
    .addStringOption(option => option.setName('invite').setDescription('Invite link (e.g. https://discord.gg/xyz)').setRequired(true))
    .addStringOption(option => option.setName('description').setDescription('Short description of the server').setRequired(false))
    .addStringOption(option => option.setName('icon_url').setDescription('URL of their server icon/logo image').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    const name = interaction.options.getString('name');
    const invite = interaction.options.getString('invite');
    const description = interaction.options.getString('description');
    const iconUrl = interaction.options.getString('icon_url');

    if (!/^https?:\/\//i.test(invite)) {
      return interaction.reply({ content: 'That doesn\'t look like a valid URL — invite links need to start with https://', ephemeral: true });
    }

    const existing = await listPartners(interaction.guild.id);
    if (existing.length >= MAX_PARTNERS) {
      return interaction.reply({
        content: `The panel is capped at ${MAX_PARTNERS} partners (a Discord limit on embeds per message). Remove one with \`/partnerremove\` first.`,
        ephemeral: true,
      });
    }

    await addPartner(interaction.guild.id, {
      name,
      inviteUrl: invite,
      description,
      iconUrl,
      addedByTag: interaction.user.tag,
    });

    const result = await refreshPartnerPanel(interaction.guild);

    if (!result.updated) {
      return interaction.reply({
        content: `✅ Added **${name}**, but I couldn't find a live panel to update. Run \`/partnerpost\` in the channel where you want the panel shown.`,
        ephemeral: true,
      });
    }

    await interaction.reply({ content: `✅ Added **${name}** to the partner panel.`, ephemeral: true });
  },
};
