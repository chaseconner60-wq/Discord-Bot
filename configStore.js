// Per-server settings storage, backed by Postgres. Persists across restarts/redeploys.
const { pool } = require('./db');

async function setLogChannel(guildId, channelId) {
  await pool.query(
    `INSERT INTO guild_config (guild_id, log_channel_id) VALUES ($1, $2)
     ON CONFLICT (guild_id) DO UPDATE SET log_channel_id = $2`,
    [guildId, channelId]
  );
}

async function getLogChannel(guildId) {
  const { rows } = await pool.query('SELECT log_channel_id FROM guild_config WHERE guild_id = $1', [guildId]);
  return rows[0]?.log_channel_id ?? null;
}

async function setPromotionLogChannel(guildId, channelId) {
  await pool.query(
    `INSERT INTO guild_config (guild_id, promotion_log_channel_id) VALUES ($1, $2)
     ON CONFLICT (guild_id) DO UPDATE SET promotion_log_channel_id = $2`,
    [guildId, channelId]
  );
}

async function getPromotionLogChannel(guildId) {
  const { rows } = await pool.query('SELECT promotion_log_channel_id FROM guild_config WHERE guild_id = $1', [guildId]);
  return rows[0]?.promotion_log_channel_id ?? null;
}

module.exports = { setLogChannel, getLogChannel, setPromotionLogChannel, getPromotionLogChannel };
