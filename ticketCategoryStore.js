// Maps each dropdown label (e.g. "Billing") to its own Discord category
// channel, so different ticket types can land in different places.
const { pool } = require('./db');

async function setTicketCategory(guildId, label, categoryId) {
  const existing = await pool.query(
    'SELECT id FROM ticket_categories WHERE guild_id = $1 AND LOWER(label) = LOWER($2)',
    [guildId, label]
  );

  if (existing.rows.length > 0) {
    await pool.query('UPDATE ticket_categories SET category_id = $1 WHERE id = $2', [categoryId, existing.rows[0].id]);
  } else {
    await pool.query(
      'INSERT INTO ticket_categories (guild_id, label, category_id, created_at) VALUES ($1, $2, $3, $4)',
      [guildId, label, categoryId, Date.now()]
    );
  }
}

async function removeTicketCategory(guildId, label) {
  const result = await pool.query(
    'DELETE FROM ticket_categories WHERE guild_id = $1 AND LOWER(label) = LOWER($2)',
    [guildId, label]
  );
  return result.rowCount > 0;
}

async function listTicketCategories(guildId) {
  const { rows } = await pool.query(
    'SELECT label, category_id AS "categoryId" FROM ticket_categories WHERE guild_id = $1 ORDER BY created_at ASC',
    [guildId]
  );
  return rows;
}

async function getTicketCategoryByLabel(guildId, label) {
  const { rows } = await pool.query(
    'SELECT category_id AS "categoryId" FROM ticket_categories WHERE guild_id = $1 AND LOWER(label) = LOWER($2)',
    [guildId, label]
  );
  return rows[0]?.categoryId ?? null;
}

module.exports = { setTicketCategory, removeTicketCategory, listTicketCategories, getTicketCategoryByLabel };
