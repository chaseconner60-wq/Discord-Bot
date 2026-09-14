const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

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
    await interaction.reply(`⬆️ Promoted **${target.tag}** — added **${role.name}**.`);
  },
};
