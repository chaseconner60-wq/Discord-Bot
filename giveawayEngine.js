const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const {
  createGiveaway,
  setMessageId,
  getGiveawayByMessageId,
  getGiveawayByPk,
  setStatus,
  addEntrant,
  removeEntrant,
  getEntrants,
  countEntrants,
} = require('./giveawayStore');

const BRAND_COLOR = 0x2dd4bf;
const ENDED_COLOR = 0x64748b;

function entryButtonRow(entrantCount, ended) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('giveaway_enter')
      .setLabel(ended ? 'Giveaway Ended' : `🎉 Enter to Win (${entrantCount} entered)`)
      .setStyle(ended ? ButtonStyle.Secondary : ButtonStyle.Success)
      .setDisabled(ended)
  );
}

function buildGiveawayEmbed(guild, record, entrantCount, { ended = false, winnerMentions = null } = {}) {
  const embed = new EmbedBuilder()
    .setColor(ended ? ENDED_COLOR : BRAND_COLOR)
    .setAuthor({ name: guild.name, iconURL: guild.iconURL() ?? undefined })
    .setTitle(ended ? '🎉 GIVEAWAY ENDED 🎉' : '🎉 GIVEAWAY 🎉')
    .setDescription(
      `**${record.prize}**\n${record.description ? `\n${record.description}\n` : ''}`
    )
    .addFields(
      { name: 'Hosted by', value: `<@${record.hostId}>`, inline: true },
      { name: 'Winners', value: `${record.winnerCount}`, inline: true },
      { name: 'Entries', value: `${entrantCount}`, inline: true }
    )
    .setFooter({ text: `Giveaway #${record.giveawayNumber}` })
    .setTimestamp(ended ? Date.now() : record.endAt);

  if (record.requiredRoleId) {
    embed.addFields({ name: 'Requirement', value: `Must have <@&${record.requiredRoleId}>` });
  }

  if (ended) {
    embed.addFields({
      name: winnerMentions && winnerMentions.length > 0 ? 'Winner(s)' : 'Result',
      value: winnerMentions && winnerMentions.length > 0 ? winnerMentions.map(id => `<@${id}>`).join(', ') : 'No valid entries — no winner.',
    });
  } else {
    embed.addFields({ name: 'Ends', value: `<t:${Math.floor(record.endAt / 1000)}:R> (<t:${Math.floor(record.endAt / 1000)}:f>)` });
  }

  return embed;
}

async function postGiveaway(interaction, { prize, description, winnerCount, durationMs, requiredRoleId, channel }) {
  const guild = interaction.guild;
  const endAt = Date.now() + durationMs;

  const created = await createGiveaway(guild.id, {
    channelId: channel.id,
    hostId: interaction.user.id,
    hostTag: interaction.user.tag,
    prize,
    description,
    winnerCount,
    requiredRoleId,
    endAt,
  });

  const record = await getGiveawayByPk(created.id);
  const embed = buildGiveawayEmbed(guild, record, 0);
  const row = entryButtonRow(0, false);

  const message = await channel.send({ embeds: [embed], components: [row] });
  await setMessageId(created.id, message.id);

  await interaction.editReply(`🎉 Giveaway #${record.giveawayNumber} started in ${channel}!`);
}

async function toggleEntry(interaction) {
  await interaction.deferUpdate();

  const record = await getGiveawayByMessageId(interaction.message.id);
  if (!record || record.status !== 'active') {
    return interaction.followUp({ content: 'This giveaway has already ended.', ephemeral: true });
  }

  if (record.requiredRoleId) {
    const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
    if (!member || !member.roles.cache.has(record.requiredRoleId)) {
      return interaction.followUp({
        content: `You need the <@&${record.requiredRoleId}> role to enter this giveaway.`,
        ephemeral: true,
      });
    }
  }

  const existingEntrants = await getEntrants(record.id);
  const alreadyEntered = existingEntrants.some(e => e.userId === interaction.user.id);

  if (alreadyEntered) {
    await removeEntrant(record.id, interaction.user.id);
    await interaction.followUp({ content: 'You left the giveaway. Click the button again if you change your mind!', ephemeral: true });
  } else {
    await addEntrant(record.id, interaction.user.id, interaction.user.tag);
    await interaction.followUp({ content: '🎉 You\'re entered! Good luck!', ephemeral: true });
  }

  const newCount = await countEntrants(record.id);
  const embed = buildGiveawayEmbed(interaction.guild, record, newCount);
  await interaction.editReply({ embeds: [embed], components: [entryButtonRow(newCount, false)] });
}

function pickRandomWinners(entrants, count) {
  const pool = [...entrants];
  const winners = [];
  while (pool.length > 0 && winners.length < count) {
    const index = Math.floor(Math.random() * pool.length);
    winners.push(pool.splice(index, 1)[0]);
  }
  return winners;
}

// client is needed here (rather than an interaction) because this also runs
// from the background scheduler with no interaction to hang off of.
async function endGiveaway(client, giveawayPk, { isReroll = false } = {}) {
  const record = await getGiveawayByPk(giveawayPk);
  if (!record) return { ok: false, reason: 'not-found' };

  const guild = await client.guilds.fetch(record.guildId).catch(() => null);
  if (!guild) return { ok: false, reason: 'guild-missing' };

  const channel = await guild.channels.fetch(record.channelId).catch(() => null);
  const entrants = await getEntrants(record.id);

  const excludeIds = isReroll ? record.winnerIds : [];
  const eligible = entrants.filter(e => !excludeIds.includes(e.userId));
  const winners = pickRandomWinners(eligible, record.winnerCount);
  const winnerIds = winners.map(w => w.userId);

  await setStatus(record.id, 'ended', isReroll ? [...new Set([...record.winnerIds, ...winnerIds])] : winnerIds);

  const finalCount = await countEntrants(record.id);
  const embed = buildGiveawayEmbed(guild, { ...record, status: 'ended' }, finalCount, { ended: true, winnerMentions: winnerIds });

  if (channel && channel.isTextBased() && record.messageId) {
    const message = await channel.messages.fetch(record.messageId).catch(() => null);
    if (message) {
      await message.edit({ embeds: [embed], components: [entryButtonRow(finalCount, true)] }).catch(() => {});
    }

    if (winnerIds.length > 0) {
      await channel
        .send(`🎉 Congratulations ${winnerIds.map(id => `<@${id}>`).join(', ')}! You won **${record.prize}**!${isReroll ? ' (rerolled)' : ''}`)
        .catch(() => {});
    } else {
      await channel.send(`😔 No valid entries for **${record.prize}** — no winner could be picked.`).catch(() => {});
    }
  }

  return { ok: true, winnerIds };
}

async function cancelGiveaway(client, giveawayPk) {
  const record = await getGiveawayByPk(giveawayPk);
  if (!record) return { ok: false, reason: 'not-found' };

  await setStatus(record.id, 'cancelled', []);

  const guild = await client.guilds.fetch(record.guildId).catch(() => null);
  if (!guild) return { ok: true };

  const channel = await guild.channels.fetch(record.channelId).catch(() => null);
  if (channel && channel.isTextBased() && record.messageId) {
    const message = await channel.messages.fetch(record.messageId).catch(() => null);
    if (message) {
      const embed = new EmbedBuilder()
        .setColor(ENDED_COLOR)
        .setTitle('🚫 GIVEAWAY CANCELLED')
        .setDescription(`**${record.prize}**\nThis giveaway was cancelled by a staff member.`)
        .setFooter({ text: `Giveaway #${record.giveawayNumber}` });
      await message.edit({ embeds: [embed], components: [entryButtonRow(0, true)] }).catch(() => {});
    }
  }

  return { ok: true };
}

module.exports = {
  buildGiveawayEmbed,
  entryButtonRow,
  postGiveaway,
  toggleEntry,
  endGiveaway,
  cancelGiveaway,
};
