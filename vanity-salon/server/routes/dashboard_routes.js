import { Router } from 'express';
import pool from '../db.js';

const router = Router();

// ---------------------------
// Get all members with plan info + total visits
// ---------------------------
router.get('/members', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        p.id,
        p.name,
        p.email,
        p.phone,
        mt.name            AS plan_name,
        mt.total_credits,
        mi.remaining_credits,
        mi.next_renewal_date,
        mi.last_renewal_date,
        COALESCE(SUM(u.amount_used), 0) AS total_visits
      FROM people p
      JOIN membership_info mi ON mi.person_id = p.id
      JOIN membership_types mt ON mt.id = mi.type_id
      LEFT JOIN usage u ON u.id_membership = mi.id
      GROUP BY 
        p.id, p.name, p.email, p.phone,
        mt.name, mt.total_credits,
        mi.remaining_credits, mi.next_renewal_date, mi.last_renewal_date
      ORDER BY p.name ASC
    `);

    res.json(rows);
  } catch (err) {
    console.error('❌ /members error:', err);
    res.status(500).json({ error: 'Failed to fetch members' });
  }
});

// ---------------------------
// Summary stats: total revenue, total members, total visits
// ---------------------------
router.get('/stats', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        COUNT(DISTINCT mi.person_id) AS total_members,
        COALESCE(SUM(mt.cost), 0)    AS total_revenue,
        COALESCE(SUM(u.amount_used), 0) AS total_visits
      FROM membership_info mi
      JOIN membership_types mt ON mt.id = mi.type_id
      LEFT JOIN usage u ON u.id_membership = mi.id
    `);

    res.json(rows[0]);
  } catch (err) {
    console.error('❌ /stats error:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// ---------------------------
// Breakdown per membership type: member count + revenue
// ---------------------------
router.get('/breakdown', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        mt.name                       AS plan_name,
        COUNT(mi.id)                  AS member_count,
        COALESCE(SUM(mt.cost), 0)     AS revenue
      FROM membership_types mt
      LEFT JOIN membership_info mi ON mi.type_id = mt.id
      GROUP BY mt.id, mt.name
      ORDER BY mt.id ASC
    `);

    res.json(rows);
  } catch (err) {
    console.error('❌ /breakdown error:', err);
    res.status(500).json({ error: 'Failed to fetch breakdown' });
  }
});

export default router;