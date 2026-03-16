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

// ── Sample data ───────────────────────────────────────────────────────────────

const PEOPLE = [
  { name: 'Sofía Martínez',    email: 'sofia.martinez@gmail.com',    phone: '787-555-0101' },
  { name: 'Alejandro Reyes',   email: 'alejandro.reyes@hotmail.com', phone: '787-555-0102' },
  { name: 'Valentina Cruz',    email: 'vcruz@outlook.com',           phone: '787-555-0103' },
  { name: 'Carlos Morales',    email: 'carlosm@gmail.com',           phone: '787-555-0104' },
  { name: 'Isabella Torres',   email: 'isabella.t@yahoo.com',        phone: '787-555-0105' },
  { name: 'Diego Hernández',   email: 'diego.hdz@gmail.com',         phone: '787-555-0106' },
  { name: 'Camila Jiménez',    email: 'camila.j@gmail.com',          phone: '787-555-0107' },
  { name: 'Mateo Rodríguez',   email: 'mateo.rod@icloud.com',        phone: '787-555-0108' },
  { name: 'Lucía Vargas',      email: 'lucia.vargas@gmail.com',      phone: '787-555-0109' },
  { name: 'Sebastián López',   email: 'seblopez@gmail.com',          phone: '787-555-0110' },
  { name: 'Mariana Sánchez',   email: 'mariana.s@hotmail.com',       phone: '787-555-0111' },
  { name: 'Andrés Ramírez',    email: 'andres.ram@gmail.com',        phone: '787-555-0112' },
  { name: 'Daniela Flores',    email: 'dflores@yahoo.com',           phone: '787-555-0113' },
  { name: 'Felipe Castillo',   email: 'fcastillo@gmail.com',         phone: '787-555-0114' },
  { name: 'Paula Mendoza',     email: 'paula.mndz@outlook.com',      phone: '787-555-0115' },
  { name: 'Ricardo Gutiérrez', email: 'rgutz@gmail.com',             phone: '787-555-0116' },
  { name: 'Elena Romero',      email: 'elena.romero@gmail.com',      phone: '787-555-0117' },
  { name: 'Javier Díaz',       email: 'javier.diaz@icloud.com',      phone: '787-555-0118' },
  { name: 'Natalia Peña',      email: 'natalia.pena@gmail.com',      phone: '787-555-0119' },
  { name: 'Gabriel Ruiz',      email: 'gabriel.ruiz@hotmail.com',    phone: '787-555-0120' },
];

// Cycle through the 3 plan types (ids 1, 2, 3)
const planFor = (i) => (i % 3) + 1;

// Spread renewal dates: some renewed recently, some upcoming
function renewalDates(i) {
  const today = new Date();
  const lastDaysAgo = [2, 5, 10, 15, 20, 25, 1, 7, 12, 18, 3, 8, 14, 22, 6, 11, 16, 4, 9, 19][i];
  const last = new Date(today);
  last.setDate(today.getDate() - lastDaysAgo);

  // duration_days matches the plan: 1→30, 2→60, 3→90
  const durations = [30, 60, 90];
  const duration  = durations[(i % 3)];
  const next = new Date(last);
  next.setDate(last.getDate() + duration);

  return {
    last: last.toISOString().split('T')[0],
    next: next.toISOString().split('T')[0],
  };
}

// remaining_credits: vary between 5 and total_credits
function remainingCredits(i, totalCredits) {
  const used = [3, 8, 12, 1, 20, 5, 15, 7, 10, 2, 18, 6, 14, 4, 11, 9, 16, 3, 13, 7][i];
  return Math.max(0, totalCredits - used);
}

// Generate 1–5 usage rows per member
function usageRows(membershipId, totalCredits, remaining, lastRenewal) {
  const usedTotal = totalCredits - remaining;
  if (usedTotal <= 0) return [];

  const rows = [];
  let left = usedTotal;
  const base = new Date(lastRenewal);

  let day = 1;
  while (left > 0) {
    const amount = Math.min(left, 1);          // 1 credit per visit
    const visitDate = new Date(base);
    visitDate.setDate(base.getDate() + day);
    rows.push({ membershipId, visitDate: visitDate.toISOString(), amount });
    left -= amount;
    day  += Math.ceil(Math.random() * 3) + 1;  // space visits a few days apart
  }

  return rows;
}

// ── Seed function ─────────────────────────────────────────────────────────────

async function seed() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Guard: skip if people already seeded
    const { rows: existing } = await client.query('SELECT COUNT(*) FROM people');
    if (parseInt(existing[0].count) > 0) {
      console.log('⚠️  People table already has data — skipping seed.');
      await client.query('ROLLBACK');
      return;
    }

    // Fetch plan info so we know total_credits per type
    const { rows: plans } = await client.query(
      'SELECT id, total_credits FROM membership_types ORDER BY id'
    );
    const planMap = Object.fromEntries(plans.map(p => [p.id, p.total_credits]));

    for (let i = 0; i < PEOPLE.length; i++) {
      const person = PEOPLE[i];

      // 1. Insert person
      const { rows: [p] } = await client.query(
        `INSERT INTO people (name, email, phone) VALUES ($1, $2, $3) RETURNING id`,
        [person.name, person.email, person.phone]
      );

      // 2. Determine plan
      const typeId       = planFor(i);
      const totalCredits = planMap[typeId];
      const { last, next } = renewalDates(i);
      const remaining    = remainingCredits(i, totalCredits);

      // 3. Insert membership_info
      const { rows: [mi] } = await client.query(
        `INSERT INTO membership_info
           (person_id, type_id, next_renewal_date, last_renewal_date, remaining_credits)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [p.id, typeId, next, last, remaining]
      );

      // 4. Insert usage rows
      const visits = usageRows(mi.id, totalCredits, remaining, last);
      for (const v of visits) {
        await client.query(
          `INSERT INTO usage (id_membership, visit_date, amount_used)
           VALUES ($1, $2, $3)`,
          [v.membershipId, v.visitDate, v.amount]
        );
      }

      console.log(`✅ Inserted: ${person.name} — Plan ${typeId} — ${visits.length} visit(s)`);
    }

    await client.query('COMMIT');
    console.log('\n🎉 Seed complete — 20 people inserted.');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Seed failed:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed();