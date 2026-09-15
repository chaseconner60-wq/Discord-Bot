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

async function setTicketConfig(guildId, { categoryId, supportRoleId, transcriptChannelId }) {
  await pool.query(
    `INSERT INTO guild_config (guild_id, ticket_category_id, support_role_id, transcript_channel_id)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (guild_id) DO UPDATE SET
       ticket_category_id = $2,
       support_role_id = $3,
       transcript_channel_id = $4`,
    [guildId, categoryId, supportRoleId, transcriptChannelId]
  );
}

async function getTicketConfig(guildId) {
  const { rows } = await pool.query(
    `SELECT ticket_category_id AS "categoryId", support_role_id AS "supportRoleId",
            transcript_channel_id AS "transcriptChannelId"
     FROM guild_config WHERE guild_id = $1`,
    [guildId]
  );
  return rows[0] ?? { categoryId: null, supportRoleId: null, transcriptChannelId: null };
}

async function setPartnerPanel(guildId, channelId, messageId) {
  await pool.query(
    `INSERT INTO guild_config (guild_id, partner_channel_id, partner_message_id) VALUES ($1, $2, $3)
     ON CONFLICT (guild_id) DO UPDATE SET partner_channel_id = $2, partner_message_id = $3`,
    [guildId, channelId, messageId]
  );
}

async function getPartnerPanel(guildId) {
  const { rows } = await pool.query(
    'SELECT partner_channel_id AS "channelId", partner_message_id AS "messageId" FROM guild_config WHERE guild_id = $1',
    [guildId]
  );
  return rows[0] ?? { channelId: null, messageId: null };
}

module.exports = {
  setLogChannel,
  getLogChannel,
  setPromotionLogChannel,
  getPromotionLogChannel,
  setTicketConfig,
  getTicketConfig,
  setPartnerPanel,
  getPartnerPanel,
};
