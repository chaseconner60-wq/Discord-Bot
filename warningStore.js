// Simple in-memory warning store.
// NOTE: This resets whenever the bot restarts/redeploys (e.g. on every Railway deploy).
// For warnings that need to survive restarts, swap this for a real database
// (e.g. SQLite, or a Railway-hosted Postgres) — ask Claude to help wire that up.

const warnings = new Map(); // key: `${guildId}:${userId}` -> array of { reason, moderatorTag, timestamp }

function key(guildId, userId) {
  return `${guildId}:${userId}`;
}

function addWarning(guildId, userId, reason, moderatorTag) {
  const k = key(guildId, userId);
  const list = warnings.get(k) ?? [];
  list.push({ reason, moderatorTag, timestamp: Date.now() });
  warnings.set(k, list);
  return list.length;
}

function getWarnings(guildId, userId) {
  return warnings.get(key(guildId, userId)) ?? [];
}

function clearWarnings(guildId, userId) {
  warnings.delete(key(guildId, userId));
}

module.exports = { addWarning, getWarnings, clearWarnings };
