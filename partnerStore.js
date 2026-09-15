// Partner storage, backed by Postgres. Persists across restarts/redeploys.
const { pool } = require('./db');

async function addPartner(guildId, { name, inviteUrl, description, iconUrl, addedByTag }) {
  const { rows } = await pool.query(
    `INSERT INTO partners (guild_id, name, invite_url, description, icon_url, added_by_tag, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, name, invite_url AS "inviteUrl", description, icon_url AS "iconUrl"`,
    [guildId, name, inviteUrl, description || null, iconUrl || null, addedByTag, Date.now()]
  );
  return rows[0];
}

async function removePartner(guildId, name) {
  const result = await pool.query(
    'DELETE FROM partners WHERE guild_id = $1 AND LOWER(name) = LOWER($2)',
    [guildId, name]
  );
  return result.rowCount > 0;
}

async function listPartners(guildId) {
  const { rows } = await pool.query(
    `SELECT id, name, invite_url AS "inviteUrl", description, icon_url AS "iconUrl"
     FROM partners WHERE guild_id = $1 ORDER BY created_at ASC`,
    [guildId]
  );
  return rows;
}

module.exports = { addPartner, removePartner, listPartners };
