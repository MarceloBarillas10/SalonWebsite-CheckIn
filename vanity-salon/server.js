import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import session from 'express-session';
import peopleRouter from './server/routes/people_routes.js';
import dashboardRouter from './server/routes/dashboard_routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'vanity-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'strict' }
}));

// Auth endpoint — called when PIN is entered correctly
app.post('/api/auth/login', (req, res) => {
  const { pinBuffer } = req.body;
  if (pinBuffer === process.env.MANAGER_PIN) {
    req.session.authed = true;
    res.json({ ok: true });
  } else {
    res.status(401).json({ ok: false });
  }
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy();
  res.json({ ok: true });
});

app.get('/api/auth/check', (req, res) => {
  if (req.session.authed) return res.json({ ok: true });
  res.status(401).json({ ok: false });
});

// Middleware to protect dashboard
function requireAuth(req, res, next) {
  if (req.session.authed) return next();
  res.redirect('/');
}
app.get('/dashboard', requireAuth, (req, res) => {
  res.set({ 
    'Cache-Control': 'no-store, no-cache, must-revalidate, private',
    'Pragma': 'no-cache',
    'Surrogate-Control': 'no-store',
    'Vary': '*'
  });
  res.sendFile(path.join(__dirname, 'client', 'dashboard.html'));
});
// API routes — also gated
app.use('/api/dashboard', requireAuth, dashboardRouter);

app.use('/api', peopleRouter);
app.use(express.static(path.join(__dirname, 'client')));

app.listen(3000, () => console.log(process.env.MANAGER_PIN ? '✅ Server running on http://localhost:3000' : '⚠️ MANAGER_PIN not set in .env, using default PIN 1234'));
