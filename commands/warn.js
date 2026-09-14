const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { addWarning } = require('../warningStore');
const { logModerationAction } = require('../moderationLogger');
const { addCase } = require('../caseStore');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Issue a warning to a member')
    .addUserOption(option =>
      option.setName('user').setDescription('The member to warn').setRequired(true)
    )
    .addStringOption(option =>
      option.setName('reason').setDescription('Reason for the warning').setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    const target = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason');

    const count = addWarning(interaction.guild.id, target.id, reason, interaction.user.tag);

    const record = addCase(interaction.guild.id, {
      type: 'Warn',
      targetId: target.id,
      targetTag: target.tag,
      moderatorTag: interaction.user.tag,
      reason,
      extra: `Warning #${count} for this user`,
    });

    await interaction.reply(`⚠️ Warned **${target.tag}**. Reason: ${reason}\nThis is warning #${count} for this user. Case #${record.caseNumber}`);

    await logModerationAction(interaction.guild, {
      action: `⚠️ Member Warned — Case #${record.caseNumber}`,
      color: 0xffcc00,
      target,
      moderator: interaction.user,
      reason,
      extra: `Warning #${count} for this user`,
    });
  },
};
