const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { logModerationAction } = require('../moderationLogger');

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
    await interaction.reply(`👢 Kicked **${target.tag}**. Reason: ${reason}`);

    await logModerationAction(interaction.guild, {
      action: '👢 Member Kicked',
      color: 0xffa500,
      target,
      moderator: interaction.user,
      reason,
    });
  },
};
