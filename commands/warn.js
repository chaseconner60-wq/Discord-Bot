const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { addWarning } = require('../warningStore');

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
    await interaction.reply(`⚠️ Warned **${target.tag}**. Reason: ${reason}\nThis is warning #${count} for this user.`);
  },
};
