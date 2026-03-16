import { Router } from 'express';
import pool from '../db.js';
import { addDays } from '../utils/dateUtils.js';

const router = Router();

router.post('/verify-person', async (req, res) => {
  const { name, email, phone } = req.body
  try {
    const { rows } = await pool.query('SELECT id FROM people WHERE name = $1 AND email = $2 AND phone = $3', [decodeURIComponent(name), decodeURIComponent(email), decodeURIComponent(phone)]);
    if (rows.length == 2) {
      res.json({ exists: true, id: rows[0].id , res: rows});
    } else {
      res.json({ exists: false });
    }
  } catch (err) {
    console.er3ror(err);
    res.status(500).json({ error: 'Database error' });
  }
});


router.post('/add-new-person', async (req, res) => {
  const { name, email, phone, membershipTypeId } = req.body;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const personRes = await client.query(
      'INSERT INTO people (name, email, phone) VALUES ($1, $2, $3) RETURNING id',
      [name, email, phone]
    );
    const personId = personRes.rows[0].id;

    const { rows } = await client.query(
      'SELECT total_credits, duration_days FROM membership_types WHERE id = $1',
      [membershipTypeId]
    );

    // Handle membership type not found
    if (!rows.length) throw new Error(`Membership type ${membershipTypeId} not found`);

    const { total_credits, duration_days } = rows[0];
    const last_renewal_date = new Date();
    const next_renewal_date = addDays(last_renewal_date, duration_days);

    const membershipRes = await client.query(
      'INSERT INTO membership_info (person_id, type_id, next_renewal_date, last_renewal_date, remaining_credits) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [personId, membershipTypeId, next_renewal_date, last_renewal_date, total_credits]
    );

    await client.query(
      'INSERT INTO usage (id_membership, visit_date, amount_used, staff_id) VALUES ($1, $2, $3, $4)',
      [membershipRes.rows[0].id, last_renewal_date, 0, 2]
    );

    await client.query('COMMIT');
    res.status(201).json({ message: 'Person added successfully', id: personId });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Failed to add person' });
  } finally {
    client.release();
  }
});

export default router;