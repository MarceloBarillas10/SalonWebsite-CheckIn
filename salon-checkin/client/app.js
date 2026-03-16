import { addPerson, verifyPerson} from './api/people_api.js';

// ─── State ───────────────────────────────────────────────────────────────────
let currentPage = 1;
let selectedPlan = null;

// ─── Routes ──────────────────────────────────────────────────────────────────
const routes = {
  "/": 1,
  "/check-in": 2,
  "/sign-up": 3,
  "/check-in-done": 4,
  "/membership-done": 5
};

const pagePaths = {
  1: "/",
  2: "/check-in",
  3: "/sign-up",
  4: "/check-in-done",
  5: "/membership-done"
};

// ─── Navigation ──────────────────────────────────────────────────────────────
function goTo(pageNum, updateHistory = true) {
  const cur  = document.getElementById('page' + currentPage);
  const next = document.getElementById('page' + pageNum);
  if (!next) return;

  cur.classList.remove('active');
  cur.classList.add('exit-left');
  setTimeout(() => cur.classList.remove('exit-left'), 600);

  next.classList.add('active');
  currentPage = pageNum;
  if (updateHistory) {
    history.pushState({}, "", pagePaths[pageNum]);
  }
  updateDots(pageNum);

  // Reset membership page state when navigating to it
  if (pageNum === 3) {
    selectedPlan = null;
    document.querySelectorAll('.membership-card').forEach(c => c.classList.remove('selected'));
    document.getElementById('confirmBtn').disabled = true;
  }
}

function updateDots(n) {
  const total = 4;
  for (let i = 1; i <= total; i++) {
    const dot = document.getElementById('dot' + i);
    if (!dot) continue;
    const dotIndex = Math.min(n, total);
    dot.classList.toggle('active', i === dotIndex);
  }
}

// ─── Form Helpers ─────────────────────────────────────────────────────────────
function pulse(el) {
  el.style.transform = 'translateX(-6px)';
  setTimeout(() => el.style.transform = 'translateX(6px)', 80);
  setTimeout(() => el.style.transform = 'translateX(0)', 160);
}

function setupPhoneFormat(id) {
  document.getElementById(id)?.addEventListener('input', e => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length > 6)      val = val.replace(/(\d{3})(\d{3})(\d+)/, '$1-$2-$3');
    else if (val.length > 3) val = val.replace(/(\d{3})(\d+)/, '$1-$2');
    e.target.value = val;
    const isValid = /^\d{3}-\d{3}-\d{4}$/.test(val);
    e.target.style.borderColor = isValid || !val ? '' : 'red';
  });
}

function setupEmailValidation(id) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  document.getElementById(id)?.addEventListener('input', e => {
    const isValid = emailRegex.test(e.target.value);
    e.target.style.borderColor = isValid || !e.target.value ? '' : 'red';
  });
}

// ─── Actions ──────────────────────────────────────────────────────────────────
function submitCheckin() {
  const name  = document.getElementById('ci-name').value.trim();
  const email = document.getElementById('ci-contact-email').value.trim();
  const phone = document.getElementById('ci-contact-telephone').value.trim();

  if (!name || !email || !phone) {
    pulse(document.getElementById('checkinBtn'));
    return;
  }

  verifyPerson(name, email, phone).then(exists => {
    if (!exists) {
          document.getElementById('ty-checkin-msg').innerHTML = `Persona <span>${name}</span> no tiene membresía.<br/>Si quieres, puedes registrarte en el inicio.`;

    }
    else {
          document.getElementById('ty-checkin-msg').innerHTML = `Check in registrado para <span>${name}</span>.<br/>Un miembro del equipo estará contigo en breve.`;
    }});
  goTo(4);
}

function selectPlan(card) {
  document.querySelectorAll('.membership-card').forEach(c => c.classList.remove('selected'));
  card.classList.add('selected');

  selectedPlan = {
    months: parseInt(card.dataset.months),
    price:  parseInt(card.dataset.price),
  };

  const btn = document.getElementById('confirmBtn');
  btn.disabled = false;
  btn.style.opacity = '1';
}

function confirmMembership() {
  const name  = document.getElementById('su-name').value.trim();
  const email = document.getElementById('su-contact-email').value.trim();
  const phone = document.getElementById('su-contact-telephone').value.trim();

  if (!name || !email || !phone) {
    pulse(document.getElementById('su-name'));
    return;
  }

  if (!selectedPlan) return;

  addPerson(name, email, phone, selectedPlan.months).then(() => {
    document.getElementById('ty-membership-msg').innerHTML =
    `Membresía de <span>${selectedPlan.months} mes${plural}</span> registrada para <span>${name}</span>.<br/>
    Precio: <span>$${selectedPlan.price}</span>. Por favor habla con recepción para completar el pago.`;
  });
  const plural = selectedPlan.months > 1 ? 'es' : '';
  goTo(5);
}

// ─── PIN Modal ────────────────────────────────────────────────────────────────
let pinBuffer = '';

function openPin() {
  pinBuffer = '';
  updatePinDots();
  document.getElementById('pin-error').textContent = '';
  document.getElementById('pin-overlay').classList.add('visible');
}

function closePin() {
  pinBuffer = '';
  updatePinDots();
  document.getElementById('pin-error').textContent = '';
  document.getElementById('pin-overlay').classList.remove('visible');
}

function updatePinDots() {
  for (let i = 0; i < 4; i++) {
    const dot = document.getElementById('pd' + i);
    dot.classList.toggle('filled', i < pinBuffer.length);
    dot.classList.remove('error');
  }
}

function pinShakeError(msg) {
  for (let i = 0; i < 4; i++) {
    const dot = document.getElementById('pd' + i);
    dot.classList.remove('filled');
    dot.classList.add('error');
  }
  document.getElementById('pin-error').textContent = msg;
  // brief shake then reset
  setTimeout(() => {
    pinBuffer = '';
    updatePinDots();
  }, 700);
}

function handlePinKey(val) {
  if (pinBuffer.length >= 4) return;
  pinBuffer += val;
  updatePinDots();


  if (pinBuffer.length === 4) {
    setTimeout(async () => {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pinBuffer })
      });
      if (res.ok) {
            sessionStorage.setItem('manager_auth', 'true');
            closePin();
        window.location.href = '/dashboard.html';
      } else {
              pinShakeError('PIN incorrecto');
      }
    
    }, 150);
  }
  // if (pinBuffer.length === 4) {
  //   setTimeout(() => {
  //     if (pinBuffer === MANAGER_PIN) {
  //       sessionStorage.setItem('manager_auth', 'true');
  //       closePin();
  //       window.location.href = '/dashboard.html';
  //     } else {
  //       pinShakeError('PIN incorrecto');
  //     }
  //   }, 150);
  // }
}

function handlePinDel() {
  pinBuffer = pinBuffer.slice(0, -1);
  updatePinDots();
  document.getElementById('pin-error').textContent = '';
}

// ─── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Load correct page from URL
  const path = window.location.pathname;
  const startPage = routes[path] || 1;

  if (startPage !== 1) {
    document.getElementById('page1').classList.remove('active');
    document.getElementById('page' + startPage).classList.add('active');
    currentPage = startPage;
    updateDots(startPage);
  }

  // Phone & email validation
  setupPhoneFormat('ci-contact-telephone');
  setupPhoneFormat('su-contact-telephone');
  setupEmailValidation('ci-contact-email');
  setupEmailValidation('su-contact-email');

  // Page navigation buttons
  document.getElementById('btn-checkin')?.addEventListener('click', () => goTo(2));
  document.getElementById('btn-signup')?.addEventListener('click', () => goTo(3));
  document.getElementById('btn-back-checkin')?.addEventListener('click', () => goTo(1));
  document.getElementById('btn-back-signup')?.addEventListener('click', () => goTo(1));
  document.getElementById('btn-home-checkin')?.addEventListener('click', () => goTo(1));
  document.getElementById('btn-home-membership')?.addEventListener('click', () => goTo(1));

  // Form submit buttons
  document.getElementById('checkinBtn')?.addEventListener('click', submitCheckin);
  document.getElementById('confirmBtn')?.addEventListener('click', confirmMembership);

  // Membership cards — data lives in data-months / data-price attributes
  document.querySelectorAll('.membership-card').forEach(card => {
    card.addEventListener('click', () => selectPlan(card));
  });

  // ── Manager PIN ──
  document.getElementById('btn-manager-login')?.addEventListener('click', openPin);
  document.getElementById('pin-cancel')?.addEventListener('click', closePin);
  document.getElementById('pin-del')?.addEventListener('click', handlePinDel);

  document.querySelectorAll('.pin-key[data-val]').forEach(key => {
    key.addEventListener('click', () => handlePinKey(key.dataset.val));
  });

  // Close on backdrop click
  document.getElementById('pin-overlay')?.addEventListener('click', e => {
    if (e.target === document.getElementById('pin-overlay')) closePin();
  });

  // Keyboard support
  document.addEventListener('keydown', e => {
    const overlay = document.getElementById('pin-overlay');
    if (!overlay.classList.contains('visible')) return;
    if (e.key >= '0' && e.key <= '9') handlePinKey(e.key);
    else if (e.key === 'Backspace') handlePinDel();
    else if (e.key === 'Escape') closePin();
  });

window.addEventListener("popstate", () => {
  const path = window.location.pathname;
  const page = routes[path] || 1;
  goTo(page, false);
});
});