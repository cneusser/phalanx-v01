const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const { ADMIN, PROJECTS, CODENAME_RENAMES, KNOWN_CODENAMES } = require('./seedData');

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

  // ── Migrations: add columns that may not exist in older DBs ────────────────
  const migrations = [
    `ALTER TABLE nda_requests ADD COLUMN consent_name TEXT`,
    `ALTER TABLE nda_requests ADD COLUMN consent_ip TEXT`,
    `ALTER TABLE nda_requests ADD COLUMN online_consent_at DATETIME`,
    `ALTER TABLE nda_requests ADD COLUMN signed_pdf_path TEXT`,
    `ALTER TABLE nda_requests ADD COLUMN rejected_at DATETIME`,
    // V0.3 Marketplace: Startup / Fundraising fields
    `ALTER TABLE projects ADD COLUMN stage TEXT`,
    `ALTER TABLE projects ADD COLUMN investment_needed TEXT`,
    `ALTER TABLE projects ADD COLUMN equity_stake TEXT`,
    `ALTER TABLE projects ADD COLUMN post_money_valuation TEXT`,
    `ALTER TABLE projects ADD COLUMN tam_band TEXT`,
    `ALTER TABLE projects ADD COLUMN sector_emoji TEXT`,
    `ALTER TABLE projects ADD COLUMN location_city TEXT`,
    `ALTER TABLE projects ADD COLUMN mandate_type TEXT DEFAULT 'ma'`,
    // V0.3 documents: file path on disk
    `ALTER TABLE documents ADD COLUMN file_path TEXT`,
    // V0.3 project_details extra fields
    `ALTER TABLE project_details ADD COLUMN team_description TEXT`,
    `ALTER TABLE project_details ADD COLUMN problem_solution TEXT`,
    `ALTER TABLE project_details ADD COLUMN use_of_funds TEXT`,
    `ALTER TABLE project_details ADD COLUMN traction_highlights TEXT DEFAULT '[]'`,
    `ALTER TABLE project_details ADD COLUMN milestones TEXT`,
    // V0.2 user approval workflow
    `ALTER TABLE users ADD COLUMN is_approved INTEGER DEFAULT 0`,
    // V0.2 password reset
    `ALTER TABLE users ADD COLUMN reset_token TEXT`,
    `ALTER TABLE users ADD COLUMN reset_token_expires DATETIME`,
  ];
  for (const m of migrations) {
    try { db.run(m); } catch(e) { /* column already exists – ignore */ }
  }

  saveDb();

  // ── V0.2 Data Cleanup ─────────────────────────────────────────────────────
  // Remove all legacy projects (keep only the mandates configured in seedData.js)
  // and all legacy users (keep only the admin neusser@phalanx.de).
  // This runs on every server start so Railway's persistent DB is always clean.

  // ── Rename-/Anonymisierungs-Migrationen (idempotent, aus seedData.js) ─────
  // Läuft nur, solange der alte Deckname noch in der DB steht. Beim Rename
  // werden auch die öffentlichen Teaser-Felder (Beschreibung, Highlights)
  // aus der zentralen Konfiguration anonymisiert nachgezogen.
  for (const { from, to } of CODENAME_RENAMES) {
    try {
      const legacy = prepare(`SELECT id FROM projects WHERE codename = ?`).get(from);
      if (legacy) {
        const cfg = PROJECTS.find(p => p.public.codename === to);
        if (cfg) {
          db.run(
            `UPDATE projects SET codename = ?, short_description = ?, highlights = ?, location_city = ? WHERE id = ?`,
            [to, cfg.public.short_description, JSON.stringify(cfg.public.highlights), cfg.public.location_city, legacy.id]
          );
        } else {
          db.run(`UPDATE projects SET codename = ? WHERE id = ?`, [to, legacy.id]);
        }
        console.log(`🕶️  Projekt anonymisiert: "${from}" → "${to}"`);
        saveDb();
      }
    } catch(e) { console.warn(`Rename ${from} → ${to}:`, e.message); }
  }

  const codenameList = KNOWN_CODENAMES.map(c => `'${c.replace(/'/g, "''")}'`).join(', ');

  try {
    const oldProjects = db.exec(`
      SELECT COUNT(*) as c FROM projects
      WHERE codename NOT IN (${codenameList})
    `);
    const oldCount = oldProjects[0]?.values[0][0] || 0;
    if (oldCount > 0) {
      // Delete dependent records first
      db.run(`DELETE FROM nda_requests WHERE project_id IN (
        SELECT id FROM projects WHERE codename NOT IN (${codenameList})
      )`);
      db.run(`DELETE FROM documents WHERE project_id IN (
        SELECT id FROM projects WHERE codename NOT IN (${codenameList})
      )`);
      db.run(`DELETE FROM project_details WHERE project_id IN (
        SELECT id FROM projects WHERE codename NOT IN (${codenameList})
      )`);
      db.run(`DELETE FROM projects WHERE codename NOT IN (${codenameList})`);
      console.log(`🧹 ${oldCount} Altprojekte gelöscht (nur konfigurierte Mandate behalten)`);
      saveDb();
    }
  } catch(e) { console.warn('Cleanup projects:', e.message); }

  try {
    const oldUsers = db.exec(`SELECT COUNT(*) as c FROM users WHERE email != '${ADMIN.email.replace(/'/g, "''")}'`);
    const oldUsersCount = oldUsers[0]?.values[0][0] || 0;
    if (oldUsersCount > 0) {
      db.run(`DELETE FROM buyer_profiles WHERE user_id IN (
        SELECT id FROM users WHERE email != ?
      )`, [ADMIN.email]);
      db.run(`DELETE FROM nda_requests WHERE user_id IN (
        SELECT id FROM users WHERE email != ?
      )`, [ADMIN.email]);
      db.run(`DELETE FROM users WHERE email != ?`, [ADMIN.email]);
      console.log(`🧹 ${oldUsersCount} Alt-User gelöscht (nur Admin behalten)`);
      saveDb();
    }
  } catch(e) { console.warn('Cleanup users:', e.message); }

  // ── Admin-User idempotent upserten ─────────────────────────────────────────
  // Läuft bei jedem Start: legt den Admin an ODER repariert ihn (Rolle,
  // Freigabe, defekter Passwort-Hash). E-Mail/Passwort via ENV überschreibbar
  // (ADMIN_EMAIL / ADMIN_PASSWORD, siehe seedData.js).
  try {
    const bcrypt = require('bcryptjs');
    // Gültiger bcrypt-Hash: $2a$/$2b$/$2y$ + Cost + 53 Zeichen Salt/Digest
    const isValidBcrypt = (h) => typeof h === 'string' && /^\$2[aby]\$\d{2}\$.{53}$/.test(h);

    const admin = prepare(`SELECT id, password_hash FROM users WHERE email = ?`).get(ADMIN.email);

    if (!admin) {
      const hash = bcrypt.hashSync(ADMIN.password, 10);
      db.run(
        `INSERT INTO users (email, password_hash, role, first_name, last_name, company, position, phone, is_approved, is_active, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 1, datetime('now'))`,
        [ADMIN.email, hash, ADMIN.role, ADMIN.first_name, ADMIN.last_name, ADMIN.company, ADMIN.position, ADMIN.phone]
      );
      console.log(`👤 Admin-User angelegt: ${ADMIN.email}`);
    } else {
      // Rolle + Freigabe bei jedem Start sicherstellen (Upsert-Teil)
      db.run(`UPDATE users SET role = ?, is_approved = 1, is_active = 1 WHERE email = ?`, [ADMIN.role, ADMIN.email]);
      // Passwort-Hash prüfen: nur bei fehlendem/defektem Hash zurücksetzen,
      // damit ein bewusst geändertes Admin-Passwort erhalten bleibt.
      if (!isValidBcrypt(admin.password_hash)) {
        db.run(`UPDATE users SET password_hash = ? WHERE email = ?`, [bcrypt.hashSync(ADMIN.password, 10), ADMIN.email]);
        console.log('🔑 Defekter Admin-Passwort-Hash zurückgesetzt');
      }
    }

    // Konfigurierte Mandate sichtbar halten
    db.run(`UPDATE projects SET status = 'active' WHERE codename IN (${codenameList})`);
    saveDb();
  } catch(e) { console.warn('Admin-Upsert:', e.message); }

  console.log('✅ Database initialized');
}

module.exports = { initialize, prepare, auditLog, saveDb };
