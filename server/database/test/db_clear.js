import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';

const { Pool } = pg;

dotenv.config({
  path: path.resolve(import.meta.dirname, '../../.env'),
});

const pool = new Pool({
  host:     process.env.DB_HOST,
  port:     process.env.DB_PORT,
  database: process.env.DB_NAME,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function clear() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Truncate in dependency order (children first), reset sequences
    await client.query(`TRUNCATE usage          RESTART IDENTITY CASCADE`);
    await client.query(`TRUNCATE membership_info RESTART IDENTITY CASCADE`);
    await client.query(`TRUNCATE people          RESTART IDENTITY CASCADE`);

    await client.query('COMMIT');
    console.log('✅ Cleared: usage, membership_info, people — IDs reset.');
    console.log('ℹ️  membership_types left untouched.');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Clear failed:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

clear();