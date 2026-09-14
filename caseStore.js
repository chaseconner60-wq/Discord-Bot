// Case log storage, backed by Postgres. Persists across restarts/redeploys.
const { pool } = require('./db');

async function addCase(guildId, { type, targetId, targetTag, moderatorTag, reason, extra }) {
  const { rows } = await pool.query(
    `INSERT INTO cases (guild_id, case_number, type, target_id, target_tag, moderator_tag, reason, extra, created_at)
     VALUES ($1, (SELECT COALESCE(MAX(case_number), 0) + 1 FROM cases WHERE guild_id = $1), $2, $3, $4, $5, $6, $7, $8)
     RETURNING case_number AS "caseNumber", type, target_id AS "targetId", target_tag AS "targetTag",
               moderator_tag AS "moderatorTag", reason, extra, created_at AS timestamp`,
    [guildId, type, targetId, targetTag, moderatorTag, reason || 'No reason provided', extra || null, Date.now()]
  );
  return rows[0];
}

async function getCase(guildId, caseNumber) {
  const { rows } = await pool.query(
    `SELECT case_number AS "caseNumber", type, target_id AS "targetId", target_tag AS "targetTag",
            moderator_tag AS "moderatorTag", reason, extra, created_at AS timestamp
     FROM cases WHERE guild_id = $1 AND case_number = $2`,
    [guildId, caseNumber]
  );
  return rows[0] ?? null;
}

async function getCasesForUser(guildId, userId) {
  const { rows } = await pool.query(
    `SELECT case_number AS "caseNumber", type, target_id AS "targetId", target_tag AS "targetTag",
            moderator_tag AS "moderatorTag", reason, extra, created_at AS timestamp
     FROM cases WHERE guild_id = $1 AND target_id = $2 ORDER BY case_number ASC`,
    [guildId, userId]
  );
  return rows;
}

async function editCaseReason(guildId, caseNumber, newReason) {
  const { rows } = await pool.query(
    `UPDATE cases SET reason = $3 WHERE guild_id = $1 AND case_number = $2
     RETURNING case_number AS "caseNumber"`,
    [guildId, caseNumber, newReason]
  );
  return rows[0] ?? null;
}

async function deleteCase(guildId, caseNumber) {
  const result = await pool.query(
    'DELETE FROM cases WHERE guild_id = $1 AND case_number = $2',
    [guildId, caseNumber]
  );
  return result.rowCount > 0;
}

module.exports = { addCase, getCase, getCasesForUser, editCaseReason, deleteCase };
