// Warning storage, backed by Postgres. Persists across restarts/redeploys.
const { pool } = require('./db');

async function addWarning(guildId, userId, reason, moderatorTag) {
  await pool.query(
    'INSERT INTO warnings (guild_id, user_id, reason, moderator_tag, created_at) VALUES ($1, $2, $3, $4, $5)',
    [guildId, userId, reason, moderatorTag, Date.now()]
  );
  const { rows } = await pool.query(
    'SELECT COUNT(*)::int AS count FROM warnings WHERE guild_id = $1 AND user_id = $2',
    [guildId, userId]
  );
  return rows[0].count;
}

async function getWarnings(guildId, userId) {
  const { rows } = await pool.query(
    'SELECT reason, moderator_tag AS "moderatorTag", created_at AS timestamp FROM warnings WHERE guild_id = $1 AND user_id = $2 ORDER BY created_at ASC',
    [guildId, userId]
  );
  return rows;
}

async function clearWarnings(guildId, userId) {
  await pool.query('DELETE FROM warnings WHERE guild_id = $1 AND user_id = $2', [guildId, userId]);
}

module.exports = { addWarning, getWarnings, clearWarnings };
