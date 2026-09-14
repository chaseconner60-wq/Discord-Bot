const { EmbedBuilder } = require('discord.js');
const { getLogChannel } = require('./configStore');

// action: e.g. "Kick", "Ban", "Warn"
// color: hex number, e.g. 0xff0000
async function logModerationAction(guild, { action, color, target, moderator, reason, extra }) {
  const channelId = getLogChannel(guild.id);
  if (!channelId) return; // No log channel set — silently skip.

  const channel = await guild.channels.fetch(channelId).catch(() => null);
  if (!channel || !channel.isTextBased()) return;

  const embed = new EmbedBuilder()
    .setTitle(`${action}`)
    .setColor(color)
    .addFields(
      { name: 'User', value: `${target.tag} (${target.id})`, inline: true },
      { name: 'Moderator', value: `${moderator.tag}`, inline: true },
      { name: 'Reason', value: reason || 'No reason provided' }
    )
    .setTimestamp();

  if (extra) {
    embed.addFields({ name: 'Details', value: extra });
  }

  await channel.send({ embeds: [embed] }).catch(() => {});
}

module.exports = { logModerationAction };
