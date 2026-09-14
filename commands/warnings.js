const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { getWarnings, clearWarnings } = require('../warningStore');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warnings')
    .setDescription('View or clear a member\'s warnings')
    .addUserOption(option =>
      option.setName('user').setDescription('The member to check').setRequired(true)
    )
    .addBooleanOption(option =>
      option.setName('clear').setDescription('Clear all warnings for this user').setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    const target = interaction.options.getUser('user');
    const shouldClear = interaction.options.getBoolean('clear') ?? false;

    if (shouldClear) {
      await clearWarnings(interaction.guild.id, target.id);
      return interaction.reply(`🧽 Cleared all warnings for **${target.tag}**.`);
    }

    const list = await getWarnings(interaction.guild.id, target.id);
    if (list.length === 0) {
      return interaction.reply(`**${target.tag}** has no warnings.`);
    }

    const embed = new EmbedBuilder()
      .setTitle(`Warnings for ${target.tag}`)
      .setColor(0xffcc00)
      .setDescription(
        list
          .map((w, i) => `**${i + 1}.** ${w.reason} — by ${w.moderatorTag} <t:${Math.floor(Number(w.timestamp) / 1000)}:R>`)
          .join('\n')
      );

    await interaction.reply({ embeds: [embed] });
  },
};
