const { EmbedBuilder } = require('discord.js');
const { getPromotionLogChannel } = require('./configStore');

// direction: 'promote' | 'demote'
async function announceStaffChange(guild, { direction, targetUser, role, moderator, caseNumber }) {
  const channelId = getPromotionLogChannel(guild.id);
  if (!channelId) return;

  const channel = await guild.channels.fetch(channelId).catch(() => null);
  if (!channel || !channel.isTextBased()) return;

  const isPromotion = direction === 'promote';

  const embed = new EmbedBuilder()
    .setColor(isPromotion ? 0x00cc66 : 0x3399ff)
    .setAuthor({ name: guild.name, iconURL: guild.iconURL() ?? undefined })
    .setTitle(isPromotion ? '🎉 Staff Promotion' : '📋 Staff Update')
    .setThumbnail(targetUser.displayAvatarURL({ size: 256 }))
    .setDescription(
      isPromotion
        ? `**${targetUser}** has been promoted to **${role.name}**!\nCongratulations on the new role. 🎊`
        : `**${targetUser}** has been moved out of **${role.name}**.`
    )
    .addFields(
      { name: 'Role', value: `${role}`, inline: true },
      { name: 'Assigned by', value: `${moderator}`, inline: true },
      { name: 'Case', value: `#${caseNumber}`, inline: true }
    )
    .setFooter({ text: guild.name, iconURL: guild.iconURL() ?? undefined })
    .setTimestamp();

  await channel.send({ embeds: [embed] }).catch(() => {});
}

module.exports = { announceStaffChange };
