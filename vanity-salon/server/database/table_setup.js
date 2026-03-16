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
      CREATE TABLE IF NOT EXISTS people (
        id    SERIAL PRIMARY KEY,
        name  VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        phone VARCHAR(50)
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS membership_types (
        id            SERIAL PRIMARY KEY,
        name          VARCHAR(255)   NOT NULL,
        cost          DECIMAL(10, 2) NOT NULL,
        duration_days INT            NOT NULL,
        total_credits INT            NOT NULL
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS membership_info (
        id                SERIAL PRIMARY KEY,
        person_id         INT  NOT NULL REFERENCES people(id),
        type_id           INT  NOT NULL REFERENCES membership_types(id),
        next_renewal_date DATE,
        last_renewal_date DATE,
        remaining_credits INT  NOT NULL DEFAULT 0
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS usage (
        id_transactions SERIAL    PRIMARY KEY,
        id_membership   INT       NOT NULL REFERENCES membership_info(id),
        visit_date      TIMESTAMP NOT NULL DEFAULT NOW(),
        amount_used     INT       NOT NULL DEFAULT 1,
        staff_id        INT
      )
    `);

    // Seed membership types (skip if already present)
    await client.query(`
      INSERT INTO membership_types (name, cost, duration_days, total_credits)
      SELECT * FROM (VALUES
        ('1 Mes',   70.00::DECIMAL,  30, 30),
        ('2 Meses', 100.00::DECIMAL, 60, 60),
        ('3 Meses', 140.00::DECIMAL, 90, 90)
      ) AS v(name, cost, duration_days, total_credits)
      WHERE NOT EXISTS (SELECT 1 FROM membership_types)
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