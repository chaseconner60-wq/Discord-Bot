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
      promotion_log_channel_id TEXT
    );
  `);

  console.log('Database tables ready.');
}

module.exports = { pool, initDatabase };
