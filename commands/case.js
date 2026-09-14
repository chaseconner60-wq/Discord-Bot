const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { getCase, editCaseReason, deleteCase, getCasesForUser } = require('../caseStore');

const TYPE_COLORS = {
  Kick: 0xffa500,
  Ban: 0xff0000,
  Warn: 0xffcc00,
  Promote: 0x00cc66,
  Demote: 0x3399ff,
};

function caseEmbed(guild, record) {
  return new EmbedBuilder()
    .setTitle(`Case #${record.caseNumber} — ${record.type}`)
    .setColor(TYPE_COLORS[record.type] ?? 0x999999)
    .addFields(
      { name: 'User', value: `${record.targetTag} (${record.targetId})`, inline: true },
      { name: 'Moderator', value: record.moderatorTag, inline: true },
      { name: 'Reason', value: record.reason }
    )
    .setFooter({ text: guild.name, iconURL: guild.iconURL() ?? undefined })
    .setTimestamp(Number(record.timestamp));
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('case')
    .setDescription('Look up or manage a moderation case by number')
    .addSubcommand(sub =>
      sub
        .setName('view')
        .setDescription('View a specific case')
        .addIntegerOption(option => option.setName('number').setDescription('Case number').setRequired(true))
    )
    .addSubcommand(sub =>
      sub
        .setName('edit-reason')
        .setDescription('Edit the reason on a case')
        .addIntegerOption(option => option.setName('number').setDescription('Case number').setRequired(true))
        .addStringOption(option => option.setName('reason').setDescription('New reason').setRequired(true))
    )
    .addSubcommand(sub =>
      sub
        .setName('delete')
        .setDescription('Delete a case (does not undo the actual kick/ban/etc.)')
        .addIntegerOption(option => option.setName('number').setDescription('Case number').setRequired(true))
    )
    .addSubcommand(sub =>
      sub
        .setName('history')
        .setDescription('List all cases for a user')
        .addUserOption(option => option.setName('user').setDescription('The user to check').setRequired(true))
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'view') {
      const number = interaction.options.getInteger('number');
      const record = await getCase(interaction.guild.id, number);
      if (!record) {
        return interaction.reply({ content: `No case #${number} found.`, ephemeral: true });
      }
      return interaction.reply({ embeds: [caseEmbed(interaction.guild, record)] });
    }

    if (sub === 'edit-reason') {
      const number = interaction.options.getInteger('number');
      const newReason = interaction.options.getString('reason');
      const record = await editCaseReason(interaction.guild.id, number, newReason);
      if (!record) {
        return interaction.reply({ content: `No case #${number} found.`, ephemeral: true });
      }
      return interaction.reply(`✏️ Updated the reason on case #${number}.`);
    }

    if (sub === 'delete') {
      const number = interaction.options.getInteger('number');
      const success = await deleteCase(interaction.guild.id, number);
      if (!success) {
        return interaction.reply({ content: `No case #${number} found.`, ephemeral: true });
      }
      return interaction.reply(`🗑️ Deleted case #${number} from the log. (This does not undo the original action.)`);
    }

    if (sub === 'history') {
      const target = interaction.options.getUser('user');
      const records = await getCasesForUser(interaction.guild.id, target.id);
      if (records.length === 0) {
        return interaction.reply(`**${target.tag}** has no cases on record.`);
      }
      const lines = records
        .map(r => `**#${r.caseNumber}** — ${r.type} — ${r.reason} — <t:${Math.floor(Number(r.timestamp) / 1000)}:R>`)
        .join('\n');
      const embed = new EmbedBuilder()
        .setTitle(`Case history for ${target.tag}`)
        .setColor(0x999999)
        .setDescription(lines);
      return interaction.reply({ embeds: [embed] });
    }
  },
};
