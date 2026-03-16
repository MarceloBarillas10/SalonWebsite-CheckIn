import { fetchStats, fetchMembers, fetchBreakdown } from './api/dashboard_api.js';

window.addEventListener('pagehide', () => {
  fetch('/api/auth/logout', { method: 'POST', keepalive: true });
});

window.addEventListener('pageshow', async (e) => {
  if (e.persisted) {
    document.documentElement.style.display = 'none';
    const res = await fetch('/api/auth/check', { cache: 'no-store' });
    if (!res.ok) {
      window.location.replace('/');
    } else {
      document.documentElement.style.display = '';
    }
  }
});
// ── Clean URL ─────────────────────────────────────────────────────────────────
if (window.location.pathname.endsWith('dashboard.html')) {
  history.replaceState({}, '', '/dashboard');
}

// ── Topbar date ───────────────────────────────────────────────────────────────
document.getElementById('topbar-date').textContent = new Date().toLocaleDateString('es-PR', {
  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
});

// ── Salir button ──────────────────────────────────────────────────────────────
document.getElementById('btn-back-main').addEventListener('click', () => {
  window.location.replace('/');
});
// ── Helpers ───────────────────────────────────────────────────────────────────
function escHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatCurrency(n) {
  return new Intl.NumberFormat('es-PR', { style: 'currency', currency: 'USD' }).format(n ?? 0);
}

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('es-PR', { year: 'numeric', month: 'short', day: 'numeric' });
}

// ── Stats ─────────────────────────────────────────────────────────────────────
async function loadStats() {
  const statRevenue = document.getElementById('stat-revenue');
  const statMembers = document.getElementById('stat-members');
  const statVisits  = document.getElementById('stat-visits');
  const subtitle    = document.getElementById('subtitle');

  try {
    const { total_revenue, total_members, total_visits } = await fetchStats();

    statRevenue.textContent = formatCurrency(total_revenue);
    statMembers.textContent = total_members;
    statVisits.textContent  = total_visits;
    [statRevenue, statMembers, statVisits].forEach(el => el.classList.remove('loading'));

    if (subtitle) {
      subtitle.textContent = `${total_members} miembro${total_members != 1 ? 's' : ''} activo${total_members != 1 ? 's' : ''}`;
    }
  } catch (err) {
    console.error('loadStats:', err);
    [statRevenue, statMembers, statVisits].forEach(el => { el.textContent = 'Error'; });
  }
}

// ── Members table ─────────────────────────────────────────────────────────────
async function loadMembers() {
  const tbody      = document.getElementById('members-tbody');
  const countBadge = document.getElementById('members-count');

  try {
    const members = await fetchMembers();
    countBadge.textContent = `${members.length} registro${members.length !== 1 ? 's' : ''}`;

    if (!members.length) {
      tbody.innerHTML = `<tr><td colspan="6" class="table-empty">Sin miembros registrados</td></tr>`;
      return;
    }

    tbody.innerHTML = members.map(m => {
      const pct = m.total_credits > 0
        ? Math.round((m.remaining_credits / m.total_credits) * 100)
        : 0;

      return `
        <tr>
          <td>${escHtml(m.name)}</td>
          <td>${escHtml(m.email || m.phone || '—')}</td>
          <td><span class="badge-plan">${escHtml(m.plan_name)}</span></td>
          <td>${formatDate(m.next_renewal_date)}</td>
          <td>
            <div class="credits-bar-wrap">
              <div class="credits-bar">
                <div class="credits-fill" style="width:${pct}%"></div>
              </div>
              <span class="credits-text">${m.remaining_credits}/${m.total_credits}</span>
            </div>
          </td>
          <td>${m.total_visits}</td>
        </tr>`;
    }).join('');

  } catch (err) {
    console.error('loadMembers:', err);
    tbody.innerHTML = `<tr><td colspan="6" class="table-empty">Error al cargar miembros</td></tr>`;
    if (countBadge) countBadge.textContent = 'error';
  }
}

// ── Breakdown table ───────────────────────────────────────────────────────────
async function loadBreakdown() {
  const tbody = document.getElementById('breakdown-tbody');

  try {
    const plans = await fetchBreakdown();

    if (!plans.length) {
      tbody.innerHTML = `<tr><td colspan="3" class="table-empty">Sin datos</td></tr>`;
      return;
    }

    tbody.innerHTML = plans.map(p => `
      <tr>
        <td>${escHtml(p.plan_name)}</td>
        <td>${p.member_count}</td>
        <td>${formatCurrency(p.revenue)}</td>
      </tr>
    `).join('');

  } catch (err) {
    console.error('loadBreakdown:', err);
    tbody.innerHTML = `<tr><td colspan="3" class="table-empty">Error al cargar planes</td></tr>`;
  }
}

// ── Boot ──────────────────────────────────────────────────────────────────────
loadStats();
loadMembers();
loadBreakdown();