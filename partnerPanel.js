const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getPartnerPanel } = require('./configStore');
const { listPartners } = require('./partnerStore');

const BRAND_COLOR = 0x2dd4bf;
const MAX_PARTNERS = 9; // Discord allows max 10 embeds per message; 1 is reserved for the header.

function buildPanelPayload(guild, partners) {
  const header = new EmbedBuilder()
    .setColor(BRAND_COLOR)
    .setAuthor({ name: guild.name, iconURL: guild.iconURL() ?? undefined })
    .setTitle('🤝 Official Partners')
    .setDescription(
      partners.length === 0
        ? 'No partners yet — check back soon!'
        : `We're proud to partner with these ${partners.length} amazing communities.`
    )
    .setTimestamp();

  const embeds = [header];
  const rows = [];
  let currentRow = new ActionRowBuilder();

  for (const partner of partners.slice(0, MAX_PARTNERS)) {
    const embed = new EmbedBuilder()
      .setColor(BRAND_COLOR)
      .setTitle(partner.name)
      .setDescription(partner.description || 'No description provided.');

    if (partner.iconUrl) embed.setThumbnail(partner.iconUrl);
    embeds.push(embed);

    if (currentRow.components.length === 5) {
      rows.push(currentRow);
      currentRow = new ActionRowBuilder();
    }

    currentRow.addComponents(
      new ButtonBuilder()
        .setLabel(`Join ${partner.name}`.slice(0, 80))
        .setStyle(ButtonStyle.Link)
        .setURL(partner.inviteUrl)
    );
  }

  if (currentRow.components.length > 0) rows.push(currentRow);

  return { embeds, components: rows };
}

// Call this after any add/remove so the live panel message updates itself.
async function refreshPartnerPanel(guild) {
  const { channelId, messageId } = await getPartnerPanel(guild.id);
  if (!channelId || !messageId) return { updated: false, reason: 'no-panel' };

  const channel = await guild.channels.fetch(channelId).catch(() => null);
  if (!channel || !channel.isTextBased()) return { updated: false, reason: 'channel-missing' };

  const message = await channel.messages.fetch(messageId).catch(() => null);
  if (!message) return { updated: false, reason: 'message-missing' };

  const partners = await listPartners(guild.id);
  const payload = buildPanelPayload(guild, partners);

  await message.edit(payload);
  return { updated: true };
}

module.exports = { buildPanelPayload, refreshPartnerPanel, MAX_PARTNERS };
