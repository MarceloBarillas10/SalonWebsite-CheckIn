import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';

const { Pool } = pg;

dotenv.config({ 
  path: path.resolve(import.meta.dirname, '../../.env') 
});

console.log('🔍 Database connection parameters:');
console.log(process.env.DB_HOST, process.env.DB_PORT, process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD);

const pool = new Pool({
  host:     process.env.DB_HOST,
  port:     process.env.DB_PORT,
  database: process.env.DB_NAME,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function createSchema() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    await client.query(`
      INSERT INTO membership_types (name, cost, duration_days, total_credits) VALUES
        ('One Month', 70, 30, 4),
        ('Two Months', 100, 60, 6),
        ('Three Months', 140, 90, 10)
    `);
    
    await client.query('COMMIT');
    console.log('✅ Schema created and seeded successfully.');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error creating schema:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

createSchema();