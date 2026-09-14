const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { logModerationAction } = require('../moderationLogger');
const { addCase } = require('../caseStore');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kick a member from the server')
    .addUserOption(option =>
      option.setName('user').setDescription('The member to kick').setRequired(true)
    )
    .addStringOption(option =>
      option.setName('reason').setDescription('Reason for the kick').setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

  async execute(interaction) {
    const target = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') ?? 'No reason provided';
    const member = await interaction.guild.members.fetch(target.id).catch(() => null);

    if (!member) {
      return interaction.reply({ content: 'That user is not in this server.', ephemeral: true });
    }
    if (!member.kickable) {
      return interaction.reply({
        content: 'I can\'t kick that user — check my role is above theirs and I have Kick Members permission.',
        ephemeral: true,
      });
    }

    await member.kick(reason);

    const record = await addCase(interaction.guild.id, {
      type: 'Kick',
      targetId: target.id,
      targetTag: target.tag,
      moderatorTag: interaction.user.tag,
      reason,
    });

    await interaction.reply(`👢 Kicked **${target.tag}**. Reason: ${reason}\nCase #${record.caseNumber}`);

    await logModerationAction(interaction.guild, {
      action: `👢 Member Kicked — Case #${record.caseNumber}`,
      color: 0xffa500,
      target,
      moderator: interaction.user,
      reason,
    });
  },
};
