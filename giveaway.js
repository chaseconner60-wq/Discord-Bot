const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder } = require('discord.js');
const { parseDuration } = require('../durationParser');
const { postGiveaway, endGiveaway, cancelGiveaway } = require('../giveawayEngine');
const { getGiveawayByNumber, getActiveGiveaways, getEntrants, countEntrants } = require('../giveawayStore');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('giveaway')
    .setDescription('Manage giveaways')
    .addSubcommand(sub =>
      sub
        .setName('start')
        .setDescription('Start a new giveaway')
        .addStringOption(o => o.setName('prize').setDescription('What are you giving away?').setRequired(true))
        .addStringOption(o => o.setName('duration').setDescription('How long it runs, e.g. 10m, 2h, 1d12h').setRequired(true))
        .addIntegerOption(o => o.setName('winners').setDescription('Number of winners').setMinValue(1).setMaxValue(20).setRequired(true))
        .addChannelOption(o => o.setName('channel').setDescription('Channel to post in (default: this channel)').addChannelTypes(ChannelType.GuildText).setRequired(false))
        .addRoleOption(o => o.setName('required_role').setDescription('Only members with this role can enter').setRequired(false))
        .addStringOption(o => o.setName('description').setDescription('Extra details shown in the giveaway embed').setRequired(false))
    )
    .addSubcommand(sub =>
      sub.setName('end').setDescription('End a giveaway immediately').addIntegerOption(o => o.setName('number').setDescription('Giveaway number').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('reroll').setDescription('Pick new winner(s) for an ended giveaway').addIntegerOption(o => o.setName('number').setDescription('Giveaway number').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('cancel').setDescription('Cancel an active giveaway without picking a winner').addIntegerOption(o => o.setName('number').setDescription('Giveaway number').setRequired(true))
    )
    .addSubcommand(sub => sub.setName('list').setDescription('List active giveaways in this server'))
    .addSubcommand(sub =>
      sub.setName('entrants').setDescription('View everyone entered in a giveaway').addIntegerOption(o => o.setName('number').setDescription('Giveaway number').setRequired(true))
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'start') {
      const prize = interaction.options.getString('prize');
      const durationInput = interaction.options.getString('duration');
      const winners = interaction.options.getInteger('winners');
      const channel = interaction.options.getChannel('channel') ?? interaction.channel;
      const requiredRole = interaction.options.getRole('required_role');
      const description = interaction.options.getString('description');

      const durationMs = parseDuration(durationInput);
      if (!durationMs || durationMs < 10000) {
        return interaction.reply({
          content: 'That duration doesn\'t look right. Use something like `10m`, `2h`, `1d`, or `1d12h` (minimum 10 seconds).',
          ephemeral: true,
        });
      }
      if (durationMs > 30 * 24 * 60 * 60 * 1000) {
        return interaction.reply({ content: 'Giveaways can\'t run longer than 30 days.', ephemeral: true });
      }

      await interaction.deferReply({ ephemeral: true });
      await postGiveaway(interaction, {
        prize,
        description,
        winnerCount: winners,
        durationMs,
        requiredRoleId: requiredRole?.id ?? null,
        channel,
      });
      return;
    }

    if (sub === 'end') {
      const number = interaction.options.getInteger('number');
      const record = await getGiveawayByNumber(interaction.guild.id, number);
      if (!record) return interaction.reply({ content: `No giveaway #${number} found.`, ephemeral: true });
      if (record.status !== 'active') return interaction.reply({ content: `Giveaway #${number} isn't active.`, ephemeral: true });

      await interaction.deferReply({ ephemeral: true });
      const result = await endGiveaway(interaction.client, record.id);
      await interaction.editReply(
        result.winnerIds.length > 0
          ? `✅ Ended giveaway #${number}. Winner(s): ${result.winnerIds.map(id => `<@${id}>`).join(', ')}`
          : `✅ Ended giveaway #${number}. No valid entries, no winner.`
      );
      return;
    }

    if (sub === 'reroll') {
      const number = interaction.options.getInteger('number');
      const record = await getGiveawayByNumber(interaction.guild.id, number);
      if (!record) return interaction.reply({ content: `No giveaway #${number} found.`, ephemeral: true });
      if (record.status !== 'ended') return interaction.reply({ content: `Giveaway #${number} hasn't ended yet.`, ephemeral: true });

      await interaction.deferReply({ ephemeral: true });
      const result = await endGiveaway(interaction.client, record.id, { isReroll: true });
      await interaction.editReply(
        result.winnerIds.length > 0
          ? `🔄 Rerolled giveaway #${number}. New winner(s): ${result.winnerIds.map(id => `<@${id}>`).join(', ')}`
          : `🔄 Rerolled giveaway #${number}, but there weren't any remaining eligible entrants.`
      );
      return;
    }

    if (sub === 'cancel') {
      const number = interaction.options.getInteger('number');
      const record = await getGiveawayByNumber(interaction.guild.id, number);
      if (!record) return interaction.reply({ content: `No giveaway #${number} found.`, ephemeral: true });
      if (record.status !== 'active') return interaction.reply({ content: `Giveaway #${number} isn't active.`, ephemeral: true });

      await cancelGiveaway(interaction.client, record.id);
      return interaction.reply(`🚫 Cancelled giveaway #${number}.`);
    }

    if (sub === 'list') {
      const active = await getActiveGiveaways(interaction.guild.id);
      if (active.length === 0) {
        return interaction.reply({ content: 'No active giveaways right now.', ephemeral: true });
      }

      const embed = new EmbedBuilder()
        .setTitle('Active Giveaways')
        .setColor(0x2dd4bf)
        .setDescription(
          active.map(g => `**#${g.giveawayNumber}** — ${g.prize} — ends <t:${Math.floor(g.endAt / 1000)}:R>`).join('\n')
        );
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (sub === 'entrants') {
      const number = interaction.options.getInteger('number');
      const record = await getGiveawayByNumber(interaction.guild.id, number);
      if (!record) return interaction.reply({ content: `No giveaway #${number} found.`, ephemeral: true });

      const entrants = await getEntrants(record.id);
      const count = await countEntrants(record.id);

      if (count === 0) {
        return interaction.reply({ content: `No one has entered giveaway #${number} yet.`, ephemeral: true });
      }

      const displayed = entrants.slice(0, 50);
      const list = displayed.map((e, i) => `${i + 1}. ${e.userTag}`).join('\n');
      const overflow = count > displayed.length ? `\n...and ${count - displayed.length} more.` : '';

      const embed = new EmbedBuilder()
        .setTitle(`Entrants — Giveaway #${number}: ${record.prize}`)
        .setColor(0x2dd4bf)
        .setDescription(list + overflow)
        .setFooter({ text: `${count} total entrant(s)` });

      return interaction.reply({ embeds: [embed], ephemeral: true });
    }
  },
};
