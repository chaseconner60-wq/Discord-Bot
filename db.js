// Postgres connection. Railway automatically provides DATABASE_URL as an
// environment variable once you attach a Postgres database to your project —
// see the README for the exact steps.
const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  console.error('Missing DATABASE_URL. Attach a Postgres database in Railway (see README) or set it in your local .env for testing.');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function initDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS warnings (
      id SERIAL PRIMARY KEY,
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      reason TEXT NOT NULL,
      moderator_tag TEXT NOT NULL,
      created_at BIGINT NOT NULL
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS cases (
      guild_id TEXT NOT NULL,
      case_number INTEGER NOT NULL,
      type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      target_tag TEXT NOT NULL,
      moderator_tag TEXT NOT NULL,
      reason TEXT,
      extra TEXT,
      created_at BIGINT NOT NULL,
      PRIMARY KEY (guild_id, case_number)
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS guild_config (
      guild_id TEXT PRIMARY KEY,
      log_channel_id TEXT,
      promotion_log_channel_id TEXT,
      ticket_category_id TEXT,
      support_role_id TEXT,
      transcript_channel_id TEXT
    );
  `);

  // In case this table already existed from before tickets were added,
  // make sure the new columns exist too.
  await pool.query(`
    ALTER TABLE guild_config
      ADD COLUMN IF NOT EXISTS ticket_category_id TEXT,
      ADD COLUMN IF NOT EXISTS support_role_id TEXT,
      ADD COLUMN IF NOT EXISTS transcript_channel_id TEXT;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS tickets (
      guild_id TEXT NOT NULL,
      ticket_number INTEGER NOT NULL,
      channel_id TEXT NOT NULL,
      opener_id TEXT NOT NULL,
      opener_tag TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      claimed_by_tag TEXT,
      ticket_type TEXT,
      created_at BIGINT NOT NULL,
      closed_at BIGINT,
      PRIMARY KEY (guild_id, ticket_number)
    );
  `);

  // In case tickets already existed from before categories were added.
  await pool.query(`
    ALTER TABLE tickets ADD COLUMN IF NOT EXISTS ticket_type TEXT;
  `);

  await pool.query(`
    ALTER TABLE guild_config
      ADD COLUMN IF NOT EXISTS partner_channel_id TEXT,
      ADD COLUMN IF NOT EXISTS partner_message_id TEXT;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS partners (
      id SERIAL PRIMARY KEY,
      guild_id TEXT NOT NULL,
      name TEXT NOT NULL,
      invite_url TEXT NOT NULL,
      description TEXT,
      icon_url TEXT,
      added_by_tag TEXT NOT NULL,
      created_at BIGINT NOT NULL
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS ticket_categories (
      id SERIAL PRIMARY KEY,
      guild_id TEXT NOT NULL,
      label TEXT NOT NULL,
      category_id TEXT NOT NULL,
      created_at BIGINT NOT NULL
    );
  `);

  console.log('Database tables ready.');
}

module.exports = { pool, initDatabase };
