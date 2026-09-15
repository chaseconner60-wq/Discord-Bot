// Ticket storage, backed by Postgres. Persists across restarts/redeploys.
const { pool } = require('./db');

async function createTicket(guildId, { channelId, openerId, openerTag, ticketType }) {
  const { rows } = await pool.query(
    `INSERT INTO tickets (guild_id, ticket_number, channel_id, opener_id, opener_tag, status, ticket_type, created_at)
     VALUES ($1, (SELECT COALESCE(MAX(ticket_number), 0) + 1 FROM tickets WHERE guild_id = $1), $2, $3, $4, 'open', $5, $6)
     RETURNING ticket_number AS "ticketNumber", channel_id AS "channelId", opener_id AS "openerId",
               opener_tag AS "openerTag", status, ticket_type AS "ticketType", created_at AS "createdAt"`,
    [guildId, channelId, openerId, openerTag, ticketType || null, Date.now()]
  );
  return rows[0];
}

async function getTicketByChannel(guildId, channelId) {
  const { rows } = await pool.query(
    `SELECT ticket_number AS "ticketNumber", channel_id AS "channelId", opener_id AS "openerId",
            opener_tag AS "openerTag", status, claimed_by_tag AS "claimedByTag", ticket_type AS "ticketType",
            created_at AS "createdAt", closed_at AS "closedAt"
     FROM tickets WHERE guild_id = $1 AND channel_id = $2`,
    [guildId, channelId]
  );
  return rows[0] ?? null;
}

async function getOpenTicketForUser(guildId, userId) {
  const { rows } = await pool.query(
    `SELECT channel_id AS "channelId", ticket_number AS "ticketNumber"
     FROM tickets WHERE guild_id = $1 AND opener_id = $2 AND status = 'open'`,
    [guildId, userId]
  );
  return rows[0] ?? null;
}

async function claimTicket(guildId, channelId, claimedByTag) {
  await pool.query(
    `UPDATE tickets SET claimed_by_tag = $3 WHERE guild_id = $1 AND channel_id = $2`,
    [guildId, channelId, claimedByTag]
  );
}

async function closeTicket(guildId, channelId) {
  const { rows } = await pool.query(
    `UPDATE tickets SET status = 'closed', closed_at = $3 WHERE guild_id = $1 AND channel_id = $2
     RETURNING ticket_number AS "ticketNumber", opener_id AS "openerId", opener_tag AS "openerTag"`,
    [guildId, channelId, Date.now()]
  );
  return rows[0] ?? null;
}

module.exports = { createTicket, getTicketByChannel, getOpenTicketForUser, claimTicket, closeTicket };
