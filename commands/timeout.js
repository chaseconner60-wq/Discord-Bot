const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('Temporarily mute a member (Discord timeout)')
    .addUserOption(option =>
      option.setName('user').setDescription('The member to timeout').setRequired(true)
    )
    .addIntegerOption(option =>
      option
        .setName('minutes')
        .setDescription('How many minutes to mute for (max 40320 = 28 days)')
        .setMinValue(1)
        .setMaxValue(40320)
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('reason').setDescription('Reason for the timeout').setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    const target = interaction.options.getUser('user');
    const minutes = interaction.options.getInteger('minutes');
    const reason = interaction.options.getString('reason') ?? 'No reason provided';

    const member = await interaction.guild.members.fetch(target.id).catch(() => null);
    if (!member) {
      return interaction.reply({ content: 'That user is not in this server.', ephemeral: true });
    }
    if (!member.moderatable) {
      return interaction.reply({
        content: 'I can\'t timeout that user — check my role is above theirs and I have Moderate Members permission.',
        ephemeral: true,
      });
    }

    await member.timeout(minutes * 60 * 1000, reason);
    await interaction.reply(`🔇 Timed out **${target.tag}** for ${minutes} minute(s). Reason: ${reason}`);
  },
};
