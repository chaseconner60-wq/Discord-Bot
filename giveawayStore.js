const { pool } = require('./db');

async function createGiveaway(guildId, { channelId, hostId, hostTag, prize, description, winnerCount, requiredRoleId, endAt }) {
  const { rows } = await pool.query(
    `INSERT INTO giveaways (guild_id, giveaway_number, channel_id, host_id, host_tag, prize, description, winner_count, required_role_id, end_at, status, created_at)
     VALUES ($1, (SELECT COALESCE(MAX(giveaway_number), 0) + 1 FROM giveaways WHERE guild_id = $1), $2, $3, $4, $5, $6, $7, $8, $9, 'active', $10)
     RETURNING id, giveaway_number AS "giveawayNumber"`,
    [guildId, channelId, hostId, hostTag, prize, description || null, winnerCount, requiredRoleId || null, endAt, Date.now()]
  );
  return rows[0];
}

async function setMessageId(giveawayPk, messageId) {
  await pool.query('UPDATE giveaways SET message_id = $2 WHERE id = $1', [giveawayPk, messageId]);
}

const SELECT_FIELDS = `
  id, guild_id AS "guildId", giveaway_number AS "giveawayNumber", channel_id AS "channelId",
  message_id AS "messageId", host_id AS "hostId", host_tag AS "hostTag", prize, description,
  winner_count AS "winnerCount", required_role_id AS "requiredRoleId", end_at AS "endAt",
  status, winner_ids AS "winnerIdsRaw", created_at AS "createdAt"
`;

function parseRecord(row) {
  if (!row) return null;
  return { ...row, winnerIds: row.winnerIdsRaw ? JSON.parse(row.winnerIdsRaw) : [] };
}

async function getGiveawayByNumber(guildId, giveawayNumber) {
  const { rows } = await pool.query(
    `SELECT ${SELECT_FIELDS} FROM giveaways WHERE guild_id = $1 AND giveaway_number = $2`,
    [guildId, giveawayNumber]
  );
  return parseRecord(rows[0]);
}

async function getGiveawayByMessageId(messageId) {
  const { rows } = await pool.query(`SELECT ${SELECT_FIELDS} FROM giveaways WHERE message_id = $1`, [messageId]);
  return parseRecord(rows[0]);
}

async function getGiveawayByPk(pk) {
  const { rows } = await pool.query(`SELECT ${SELECT_FIELDS} FROM giveaways WHERE id = $1`, [pk]);
  return parseRecord(rows[0]);
}

async function getActiveGiveaways(guildId) {
  const { rows } = await pool.query(
    `SELECT ${SELECT_FIELDS} FROM giveaways WHERE guild_id = $1 AND status = 'active' ORDER BY end_at ASC`,
    [guildId]
  );
  return rows.map(parseRecord);
}

async function getDueGiveaways() {
  const { rows } = await pool.query(
    `SELECT ${SELECT_FIELDS} FROM giveaways WHERE status = 'active' AND end_at <= $1`,
    [Date.now()]
  );
  return rows.map(parseRecord);
}

async function setStatus(giveawayPk, status, winnerIds) {
  await pool.query('UPDATE giveaways SET status = $2, winner_ids = $3 WHERE id = $1', [
    giveawayPk,
    status,
    winnerIds ? JSON.stringify(winnerIds) : null,
  ]);
}

// Returns true if this was a new entry, false if they were already entered.
async function addEntrant(giveawayPk, userId, userTag) {
  const result = await pool.query(
    `INSERT INTO giveaway_entrants (giveaway_pk, user_id, user_tag, entered_at) VALUES ($1, $2, $3, $4)
     ON CONFLICT (giveaway_pk, user_id) DO NOTHING`,
    [giveawayPk, userId, userTag, Date.now()]
  );
  return result.rowCount > 0;
}

// Returns true if they were entered and got removed, false if they weren't entered.
async function removeEntrant(giveawayPk, userId) {
  const result = await pool.query('DELETE FROM giveaway_entrants WHERE giveaway_pk = $1 AND user_id = $2', [giveawayPk, userId]);
  return result.rowCount > 0;
}

async function getEntrants(giveawayPk) {
  const { rows } = await pool.query(
    'SELECT user_id AS "userId", user_tag AS "userTag" FROM giveaway_entrants WHERE giveaway_pk = $1 ORDER BY entered_at ASC',
    [giveawayPk]
  );
  return rows;
}

async function countEntrants(giveawayPk) {
  const { rows } = await pool.query('SELECT COUNT(*)::int AS count FROM giveaway_entrants WHERE giveaway_pk = $1', [giveawayPk]);
  return rows[0].count;
}

module.exports = {
  createGiveaway,
  setMessageId,
  getGiveawayByNumber,
  getGiveawayByMessageId,
  getGiveawayByPk,
  getActiveGiveaways,
  getDueGiveaways,
  setStatus,
  addEntrant,
  removeEntrant,
  getEntrants,
  countEntrants,
};
