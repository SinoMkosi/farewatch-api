require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('./db');
const { requireAuth } = require('./auth');

const app = express();
app.use(cors());
app.use(express.json());

// ---------- AUTH ----------

app.post('/auth/register', async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'email, password and name are required' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  const existing = db.prepare('SELECT userId FROM users WHERE email = ?').get(email);
  if (existing) {
    return res.status(409).json({ error: 'An account with that email already exists' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const userId = uuidv4();

  db.prepare(
    `INSERT INTO users (userId, email, passwordHash, name) VALUES (?, ?, ?, ?)`
  ).run(userId, email, passwordHash, name);

  db.prepare(
    `INSERT INTO settings (userId, theme, notificationsEnabled) VALUES (?, 'light', 1)`
  ).run(userId);

  const token = jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.status(201).json({ token, userId, name, email });
});

app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const token = jwt.sign({ userId: user.userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, userId: user.userId, name: user.name, email: user.email });
});

// ---------- ROUTES (watchlist) ----------

app.get('/routes', requireAuth, (req, res) => {
  const routes = db.prepare('SELECT * FROM routes WHERE userId = ?').all(req.userId);
  res.json(routes);
});

app.post('/routes', requireAuth, (req, res) => {
  const { originAirport, destAirport, targetPrice, dateRangeStart, dateRangeEnd } = req.body;
  if (!originAirport || !destAirport) {
    return res.status(400).json({ error: 'originAirport and destAirport are required' });
  }

  const routeId = uuidv4();
  db.prepare(`
    INSERT INTO routes (routeId, userId, originAirport, destAirport, targetPrice, dateRangeStart, dateRangeEnd)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(routeId, req.userId, originAirport.toUpperCase(), destAirport.toUpperCase(), targetPrice || null, dateRangeStart || null, dateRangeEnd || null);

  res.status(201).json({ routeId, originAirport, destAirport, targetPrice, dateRangeStart, dateRangeEnd });
});

app.delete('/routes/:id', requireAuth, (req, res) => {
  const route = db.prepare('SELECT * FROM routes WHERE routeId = ? AND userId = ?').get(req.params.id, req.userId);
  if (!route) return res.status(404).json({ error: 'Route not found' });

  db.prepare('DELETE FROM price_snapshots WHERE routeId = ?').run(req.params.id);
  db.prepare('DELETE FROM routes WHERE routeId = ?').run(req.params.id);
  res.status(204).send();
});

// price history + buy/wait guidance
app.get('/routes/:id/prices', requireAuth, (req, res) => {
  const route = db.prepare('SELECT * FROM routes WHERE routeId = ? AND userId = ?').get(req.params.id, req.userId);
  if (!route) return res.status(404).json({ error: 'Route not found' });

  const snapshots = db.prepare(
    'SELECT * FROM price_snapshots WHERE routeId = ? ORDER BY capturedAt DESC LIMIT 14'
  ).all(req.params.id);

  let guidance = 'NO_DATA';
  if (snapshots.length > 0) {
    const avg = snapshots.reduce((sum, s) => sum + s.price, 0) / snapshots.length;
    const current = snapshots[0].price;
    guidance = current <= avg ? 'BUY_NOW' : 'WAIT';
  }

  res.json({ snapshots, guidance });
});

// add a manual price snapshot (stands in for the Amadeus fetch in the prototype)
app.post('/routes/:id/prices', requireAuth, (req, res) => {
  const { price, currency } = req.body;
  if (typeof price !== 'number' || price <= 0) {
    return res.status(400).json({ error: 'price must be a positive number' });
  }
  const route = db.prepare('SELECT * FROM routes WHERE routeId = ? AND userId = ?').get(req.params.id, req.userId);
  if (!route) return res.status(404).json({ error: 'Route not found' });

  const snapshotId = uuidv4();
  db.prepare(`
    INSERT INTO price_snapshots (snapshotId, routeId, price, currency, source)
    VALUES (?, ?, ?, ?, 'manual')
  `).run(snapshotId, req.params.id, price, currency || 'ZAR');

  if (route.targetPrice && price <= route.targetPrice) {
    const alertId = uuidv4();
    db.prepare(`
      INSERT INTO price_alerts (alertId, routeId, triggeredPrice, status)
      VALUES (?, ?, ?, 'pending')
    `).run(alertId, req.params.id, price);
  }

  res.status(201).json({ snapshotId, price, currency: currency || 'ZAR' });
});

// ---------- ALERTS ----------

app.get('/alerts', requireAuth, (req, res) => {
  const alerts = db.prepare(`
    SELECT price_alerts.*, routes.originAirport, routes.destAirport
    FROM price_alerts
    JOIN routes ON routes.routeId = price_alerts.routeId
    WHERE routes.userId = ?
    ORDER BY triggeredAt DESC
  `).all(req.userId);
  res.json(alerts);
});

// ---------- SETTINGS ----------

app.get('/settings', requireAuth, (req, res) => {
  const settings = db.prepare('SELECT * FROM settings WHERE userId = ?').get(req.userId);
  res.json(settings);
});

app.put('/settings', requireAuth, (req, res) => {
  const { theme, notificationsEnabled, preferredLanguage } = req.body;

  if (theme) {
    db.prepare('UPDATE settings SET theme = ? WHERE userId = ?').run(theme, req.userId);
  }
  if (typeof notificationsEnabled === 'boolean') {
    db.prepare('UPDATE settings SET notificationsEnabled = ? WHERE userId = ?')
      .run(notificationsEnabled ? 1 : 0, req.userId);
  }
  if (preferredLanguage) {
    db.prepare('UPDATE users SET preferredLanguage = ? WHERE userId = ?').run(preferredLanguage, req.userId);
  }

  const settings = db.prepare('SELECT * FROM settings WHERE userId = ?').get(req.userId);
  res.json(settings);
});

app.listen(process.env.PORT, () => {
  console.log(`FareWatch API running on port ${process.env.PORT}`);
});