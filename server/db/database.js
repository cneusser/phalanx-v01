const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'phalanx.db');

let db;

function saveDb() {
  if (!db) return;
  const data = db.export();
  fs.writeFileSync(dbPath, Buffer.from(data));
}

// Bind parameters properly for sql.js
function bindParams(params) {
  if (!params || params.length === 0) return [];
  return params.map(p => p === undefined ? null : p);
}

function prepare(sql) {
  return {
    run(...params) {
      db.run(sql, bindParams(params));
      // Get last insert rowid
      const res = db.exec('SELECT last_insert_rowid()');
      const lastInsertRowid = res[0] ? res[0].values[0][0] : null;
      saveDb();
      return { lastInsertRowid };
    },
    get(...params) {
      const result = db.exec(sql, bindParams(params));
      if (!result[0] || !result[0].values[0]) return undefined;
      const cols = result[0].columns;
      const vals = result[0].values[0];
      return Object.fromEntries(cols.map((c, i) => [c, vals[i]]));
    },
    all(...params) {
      const result = db.exec(sql, bindParams(params));
      if (!result[0]) return [];
      const cols = result[0].columns;
      return result[0].values.map(row => Object.fromEntries(cols.map((c, i) => [c, row[i]])));
    }
  };
}

function auditLog(userId, action, resourceType, resourceId, details, ip) {
  try {
    db.run(
      `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details, ip_address, created_at) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
      [userId||null, action, resourceType||null, resourceId||null, details||null, ip||null]
    );
    saveDb();
  } catch(e) { /* silent */ }
}

async function initialize() {
  const SQL = await initSqlJs();

  if (fs.existsSync(dbPath)) {
    db = new SQL.Database(fs.readFileSync(dbPath));
  } else {
    db = new SQL.Database();
  }

  db.run(`PRAGMA foreign_keys = ON`);

  const schema = `
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'buyer', first_name TEXT NOT NULL, last_name TEXT NOT NULL,
      company TEXT, position TEXT, buyer_type TEXT, phone TEXT, is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS buyer_profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER UNIQUE NOT NULL,
      industries TEXT DEFAULT '[]', regions TEXT DEFAULT '[]',
      revenue_min REAL DEFAULT 0, revenue_max REAL DEFAULT 100,
      ebitda_min REAL DEFAULT 0, ebitda_max REAL DEFAULT 20,
      deal_types TEXT DEFAULT '[]', investment_style TEXT DEFAULT 'both',
      notes TEXT, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT, codename TEXT UNIQUE NOT NULL,
      industry TEXT NOT NULL, region TEXT NOT NULL, revenue_band TEXT NOT NULL,
      ebitda_band TEXT NOT NULL, deal_type TEXT NOT NULL, short_description TEXT NOT NULL,
      highlights TEXT DEFAULT '[]', status TEXT DEFAULT 'active', created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS project_details (
      id INTEGER PRIMARY KEY AUTOINCREMENT, project_id INTEGER UNIQUE NOT NULL,
      full_description TEXT, revenue_actual REAL, ebitda_actual REAL, revenue_trend TEXT,
      employees INTEGER, founding_year INTEGER, growth_strategy TEXT, key_risks TEXT,
      asking_price_band TEXT, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS nda_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, project_id INTEGER NOT NULL,
      status TEXT DEFAULT 'requested', requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      sent_at DATETIME, signed_at DATETIME, approved_at DATETIME, approved_by INTEGER,
      UNIQUE(user_id, project_id)
    );
    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT, project_id INTEGER NOT NULL, filename TEXT NOT NULL,
      file_type TEXT, file_size INTEGER, access_level TEXT DEFAULT 'nda', description TEXT,
      uploaded_by INTEGER, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, action TEXT NOT NULL,
      resource_type TEXT, resource_id INTEGER, details TEXT, ip_address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `;

  db.run(schema);
  saveDb();
  console.log('✅ Database initialized');
}

module.exports = { initialize, prepare, auditLog, saveDb };
