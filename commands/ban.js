const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { logModerationAction } = require('../moderationLogger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban a member from the server')
    .addUserOption(option =>
      option.setName('user').setDescription('The member to ban').setRequired(true)
    )
    .addStringOption(option =>
      option.setName('reason').setDescription('Reason for the ban').setRequired(false)
    )
    .addIntegerOption(option =>
      option
        .setName('delete_days')
        .setDescription('Days of their message history to delete (0-7)')
        .setMinValue(0)
        .setMaxValue(7)
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  async execute(interaction) {
    const target = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') ?? 'No reason provided';
    const deleteDays = interaction.options.getInteger('delete_days') ?? 0;

    const member = await interaction.guild.members.fetch(target.id).catch(() => null);
    if (member && !member.bannable) {
      return interaction.reply({
        content: 'I can\'t ban that user — check my role is above theirs and I have Ban Members permission.',
        ephemeral: true,
      });
    }

    await interaction.guild.members.ban(target.id, {
      reason,
      deleteMessageSeconds: deleteDays * 24 * 60 * 60,
    });
    await interaction.reply(`🔨 Banned **${target.tag}**. Reason: ${reason}`);

    await logModerationAction(interaction.guild, {
      action: '🔨 Member Banned',
      color: 0xff0000,
      target,
      moderator: interaction.user,
      reason,
      extra: deleteDays > 0 ? `Deleted ${deleteDays} day(s) of message history` : undefined,
    });
  },
};
