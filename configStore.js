// Simple in-memory config store (currently just holds each server's log channel).
// NOTE: Like warningStore.js, this resets on every Railway redeploy/restart.
// If you want this to survive restarts, ask Claude to wire up a real database.

const config = new Map(); // key: guildId -> { logChannelId }

function setLogChannel(guildId, channelId) {
  const existing = config.get(guildId) ?? {};
  config.set(guildId, { ...existing, logChannelId: channelId });
}

function getLogChannel(guildId) {
  return config.get(guildId)?.logChannelId ?? null;
}

function setPromotionLogChannel(guildId, channelId) {
  const existing = config.get(guildId) ?? {};
  config.set(guildId, { ...existing, promotionLogChannelId: channelId });
}

function getPromotionLogChannel(guildId) {
  return config.get(guildId)?.promotionLogChannelId ?? null;
}

module.exports = { setLogChannel, getLogChannel, setPromotionLogChannel, getPromotionLogChannel };
