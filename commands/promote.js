const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { addCase } = require('../caseStore');
const { announceStaffChange } = require('../staffAnnouncer');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('promote')
    .setDescription('Give a staff member a role')
    .addUserOption(option =>
      option.setName('user').setDescription('The member to promote').setRequired(true)
    )
    .addRoleOption(option =>
      option.setName('role').setDescription('The role to give them').setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

  async execute(interaction) {
    const target = interaction.options.getUser('user');
    const role = interaction.options.getRole('role');

    const member = await interaction.guild.members.fetch(target.id).catch(() => null);
    if (!member) {
      return interaction.reply({ content: 'That user is not in this server.', ephemeral: true });
    }

    // The bot can only manage roles below its own highest role.
    const botMember = interaction.guild.members.me;
    if (role.position >= botMember.roles.highest.position) {
      return interaction.reply({
        content: `I can't assign **${role.name}** — that role is at or above my own highest role. Move my bot role above it in Server Settings > Roles.`,
        ephemeral: true,
      });
    }

    if (member.roles.cache.has(role.id)) {
      return interaction.reply({ content: `**${target.tag}** already has **${role.name}**.`, ephemeral: true });
    }

    await member.roles.add(role);

    const record = addCase(interaction.guild.id, {
      type: 'Promote',
      targetId: target.id,
      targetTag: target.tag,
      moderatorTag: interaction.user.tag,
      reason: `Given the role ${role.name}`,
    });

    await interaction.reply(`⬆️ Promoted **${target.tag}** — added **${role.name}**. Case #${record.caseNumber}`);

    await announceStaffChange(interaction.guild, {
      direction: 'promote',
      targetUser: target,
      role,
      moderator: interaction.user,
      caseNumber: record.caseNumber,
    });
  },
};
