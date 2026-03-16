const BASE = '/api/dashboard';

/**
 * Fetch summary stats: total_members, total_revenue, total_visits
 * @returns {Promise<{total_members: number, total_revenue: number, total_visits: number}>}
 */
async function fetchStats() {
  const res = await fetch(`${BASE}/stats`);
  if (!res.ok) throw new Error(`fetchStats failed: ${res.status}`);
  return res.json();
}

/**
 * Fetch all members with their plan info and visit count.
 * @returns {Promise<Array>}
 */
async function fetchMembers() {
  const res = await fetch(`${BASE}/members`);
  if (!res.ok) throw new Error(`fetchMembers failed: ${res.status}`);
  return res.json();
}

/**
 * Fetch membership breakdown per plan: plan_name, member_count, revenue.
 * @returns {Promise<Array>}
 */
async function fetchBreakdown() {
  const res = await fetch(`${BASE}/breakdown`);
  if (!res.ok) throw new Error(`fetchBreakdown failed: ${res.status}`);
  return res.json();
}


export { fetchStats, fetchMembers, fetchBreakdown };