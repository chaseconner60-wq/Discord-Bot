const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('demote')
    .setDescription('Remove a role from a staff member')
    .addUserOption(option =>
      option.setName('user').setDescription('The member to demote').setRequired(true)
    )
    .addRoleOption(option =>
      option.setName('role').setDescription('The role to remove from them').setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

  async execute(interaction) {
    const target = interaction.options.getUser('user');
    const role = interaction.options.getRole('role');

    const member = await interaction.guild.members.fetch(target.id).catch(() => null);
    if (!member) {
      return interaction.reply({ content: 'That user is not in this server.', ephemeral: true });
    }

    const botMember = interaction.guild.members.me;
    if (role.position >= botMember.roles.highest.position) {
      return interaction.reply({
        content: `I can't remove **${role.name}** — that role is at or above my own highest role. Move my bot role above it in Server Settings > Roles.`,
        ephemeral: true,
      });
    }

    if (!member.roles.cache.has(role.id)) {
      return interaction.reply({ content: `**${target.tag}** doesn't have **${role.name}**.`, ephemeral: true });
    }

    await member.roles.remove(role);
    await interaction.reply(`⬇️ Demoted **${target.tag}** — removed **${role.name}**.`);
  },
};
