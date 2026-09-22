const { DatabaseSync } = require('node:sqlite');
const db = new DatabaseSync('farewatch.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    userId TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    passwordHash TEXT NOT NULL,
    name TEXT NOT NULL,
    preferredLanguage TEXT DEFAULT 'en',
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS routes (
    routeId TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    originAirport TEXT NOT NULL,
    destAirport TEXT NOT NULL,
    targetPrice REAL,
    dateRangeStart TEXT,
    dateRangeEnd TEXT,
    syncStatus TEXT DEFAULT 'synced',
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(userId)
  );

  CREATE TABLE IF NOT EXISTS price_snapshots (
    snapshotId TEXT PRIMARY KEY,
    routeId TEXT NOT NULL,
    price REAL NOT NULL,
    currency TEXT DEFAULT 'ZAR',
    capturedAt TEXT DEFAULT CURRENT_TIMESTAMP,
    source TEXT DEFAULT 'manual',
    FOREIGN KEY (routeId) REFERENCES routes(routeId)
  );

  CREATE TABLE IF NOT EXISTS price_alerts (
    alertId TEXT PRIMARY KEY,
    routeId TEXT NOT NULL,
    triggeredPrice REAL NOT NULL,
    status TEXT DEFAULT 'pending',
    triggeredAt TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (routeId) REFERENCES routes(routeId)
  );

  CREATE TABLE IF NOT EXISTS settings (
    userId TEXT PRIMARY KEY,
    theme TEXT DEFAULT 'light',
    notificationsEnabled INTEGER DEFAULT 1,
    FOREIGN KEY (userId) REFERENCES users(userId)
  );
`);

module.exports = db;