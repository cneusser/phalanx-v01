// ─────────────────────────────────────────────────────────────────────────────
// CapitalMatch DB-Layer: PostgreSQL via Knex (Sprint 1)
//
// Ersetzt die frühere SQLite-(sql.js)-Implementierung. Öffentliche API:
//   initialize()          – Migrationen ausführen + idempotenter Startup-Seed
//   get(sql, params)      – erste Zeile oder undefined      (async)
//   all(sql, params)      – alle Zeilen als Array            (async)
//   run(sql, params)      – INSERT/UPDATE/DELETE, rowCount   (async)
//   insert(sql, params)   – INSERT … RETURNING id → id       (async)
//   auditLog(...)         – Append-only-Log (fire and forget)
//   knex                  – rohe Knex-Instanz (Transaktionen, QueryBuilder)
//
// SQL-Platzhalter bleiben `?` (Knex übersetzt nach $1, $2, … für Postgres).
// ─────────────────────────────────────────────────────────────────────────────

const knexConfig = require('../knexfile');

if (!process.env.DATABASE_URL) {
  console.error(`
❌  DATABASE_URL ist nicht gesetzt.

    CapitalMatch benötigt seit Sprint 1 eine PostgreSQL-Datenbank.

    Railway:  Postgres-Plugin zum Projekt hinzufügen und im App-Service die
              Variable DATABASE_URL als Reference auf Postgres.DATABASE_URL
              anlegen (Details: README → "Datenbank").
    Lokal:    server/.env →
              DATABASE_URL=postgres://capitalmatch:capitalmatch@localhost:5432/capitalmatch
`);
  process.exit(1);
}

// pg liefert COUNT()/SUM() als String (BIGINT/NUMERIC), für die App nach
// Number parsen, damit z. B. `a + b` nicht zu Stringkonkatenation wird.
const pgTypes = require('pg').types;
pgTypes.setTypeParser(20, (v) => parseInt(v, 10));   // BIGINT
pgTypes.setTypeParser(1700, (v) => parseFloat(v));   // NUMERIC

// ── Zwei Verbindungen (Sprint 5 / RLS) ───────────────────────────────────────
// ownerKnex: DB-Owner (Railway-Standard-User, meist Superuser), NUR für
//            Migrationen und Wartung. Superuser umgehen RLS!
// appKnex:   nicht-privilegierte App-Rolle (NOSUPERUSER, NOBYPASSRLS), wird
//            bei initialize() automatisch angelegt. ALLE Anwendungs-Queries
//            laufen hierüber, damit Row-Level-Security greift.
const ownerKnex = require('knex')(knexConfig);
let appKnex = ownerKnex; // bis initialize() die RLS-Rolle eingerichtet hat

async function get(sql, params = []) {
  const result = await appKnex.raw(sql, params);
  return result.rows[0];
}

async function all(sql, params = []) {
  const result = await appKnex.raw(sql, params);
  return result.rows;
}

async function run(sql, params = []) {
  const result = await appKnex.raw(sql, params);
  return { rowCount: result.rowCount };
}

// INSERT mit automatischem RETURNING id
async function insert(sql, params = []) {
  const withReturning = /returning\s/i.test(sql) ? sql : `${sql} RETURNING id`;
  const result = await appKnex.raw(withReturning, params);
  return result.rows[0] ? result.rows[0].id : null;
}

// App-Rolle ohne Superuser-/BYPASSRLS-Rechte einrichten (idempotent) und
// die Anwendungsverbindung darauf umstellen
async function setupRlsRole() {
  const url = new URL(process.env.DATABASE_URL);
  const appUser = `${decodeURIComponent(url.username || 'postgres')}_app`;
  const pwd = decodeURIComponent(url.password || '');
  const q = (s) => s.replace(/'/g, "''");

  await ownerKnex.raw(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${q(appUser)}') THEN
        CREATE ROLE "${appUser}" LOGIN;
      END IF;
    END $$;
  `);
  await ownerKnex.raw(`ALTER ROLE "${appUser}" LOGIN PASSWORD '${q(pwd)}' NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE`);
  await ownerKnex.raw(`GRANT USAGE ON SCHEMA public TO "${appUser}"`);
  await ownerKnex.raw(`GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE ON ALL TABLES IN SCHEMA public TO "${appUser}"`);
  await ownerKnex.raw(`GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO "${appUser}"`);
  await ownerKnex.raw(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE ON TABLES TO "${appUser}"`);
  await ownerKnex.raw(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO "${appUser}"`);

  url.username = encodeURIComponent(appUser);
  appKnex = require('knex')({
    ...knexConfig,
    connection: { ...knexConfig.connection, connectionString: url.toString() },
  });
  module.exports.knex = appKnex;
  // Verbindung verifizieren (schlägt fehl → Server startet nicht, fail closed)
  const who = await appKnex.raw(`SELECT current_user, current_setting('app.tenant_id', true) AS tenant`);
  console.log(`🔐 RLS aktiv: App-Verbindung als "${who.rows[0].current_user}" (Tenant ${who.rows[0].tenant})`);
}

// ── Sprint 5: Cross-Tenant-Kontext (Row-Level-Security) ─────────────────────
// Alle normalen Queries laufen im Default-Tenant (app.tenant_id = '1', gesetzt
// beim Verbindungsaufbau). Für Operationen in einem ANDEREN Mandanten:
//   await db.withTenant(tenantId, async (t) => { await t.get(...); })
// SET LOCAL gilt nur innerhalb der Transaktion, danach greift wieder der
// Default. RLS ist fail-closed: ohne gültige Session-Var sind 0 Zeilen sichtbar.
async function withTenant(tenantId, fn) {
  return appKnex.transaction(async (trx) => {
    await trx.raw(`SELECT set_config('app.tenant_id', ?, true)`, [String(tenantId)]);
    const t = {
      get: async (sql, params = []) => (await trx.raw(sql, params)).rows[0],
      all: async (sql, params = []) => (await trx.raw(sql, params)).rows,
      run: async (sql, params = []) => ({ rowCount: (await trx.raw(sql, params)).rowCount }),
      insert: async (sql, params = []) => {
        const withReturning = /returning\s/i.test(sql) ? sql : `${sql} RETURNING id`;
        const result = await trx.raw(withReturning, params);
        return result.rows[0] ? result.rows[0].id : null;
      },
      trx,
    };
    return fn(t);
  });
}

// Sprint 2: activity_log (append-only, DB-Trigger verhindert UPDATE/DELETE).
// Fire-and-forget wie auditLog.
function activityLog(actorId, action, resource, resourceId, ip) {
  appKnex('activity_log')
    .insert({
      actor_id: actorId || null,
      action,
      resource: resource || null,
      resource_id: resourceId ? parseInt(resourceId, 10) : null,
      ip: ip || null,
    })
    .catch((e) => console.warn('activityLog:', e.message));
}

// Append-only Audit-Log. Bewusst fire-and-forget: Logging darf nie
// einen fachlichen Request scheitern lassen.
function auditLog(userId, action, resourceType, resourceId, details, ip) {
  appKnex('audit_logs')
    .insert({
      user_id: userId || null,
      action,
      resource_type: resourceType || null,
      resource_id: resourceId ? parseInt(resourceId, 10) : null,
      details: details || null,
      ip_address: ip || null,
    })
    .catch((e) => console.warn('auditLog:', e.message));
}

// ── Startup-Seed (idempotent) ────────────────────────────────────────────────
// Läuft bei jedem Serverstart NACH den Migrationen:
//   1. Admin-User upserten (Rolle, Freigabe, Hash-Prüfung, wie Sprint 0)
//   2. Beispiel-Mandate aus seedData.js einspielen, falls noch keine
//      Projekte existieren (einmaliges Seed für den Betreiber-Mandanten)
// WICHTIG: Die alte SQLite-Ära löschte bei jedem Start alle Fremd-User und
// -Projekte („Cleanup"). Das entfällt ab jetzt, Postgres persistiert echte
// Registrierungen und Admin-Änderungen dauerhaft.
async function startupSeed() {
  const bcrypt = require('bcryptjs');
  const { ADMIN, PROJECTS, CODENAME_RENAMES } = require('./seedData');

  // 0. Rename-/Anonymisierungs-Migrationen (idempotent): läuft nur, solange
  //    ein alter Deckname noch in der DB steht. Öffentliche Teaser-Felder
  //    werden dabei aus der Konfiguration nachgezogen. Dokument-Anzeigenamen,
  //    die den alten Decknamen enthalten, werden mit umbenannt.
  for (const { from, to } of CODENAME_RENAMES) {
    const legacy = await get(`SELECT id FROM projects WHERE codename = ?`, [from]);
    if (!legacy) continue;
    const cfg = PROJECTS.find(p => p.public.codename === to);
    if (cfg) {
      await run(
        `UPDATE projects SET codename = ?, short_description = ?, highlights = ?, location_city = ?, updated_at = now() WHERE id = ?`,
        [to, cfg.public.short_description, JSON.stringify(cfg.public.highlights), cfg.public.location_city, legacy.id]
      );
      await run(`UPDATE documents SET filename = replace(filename, ?, ?), description = replace(description, ?, ?) WHERE project_id = ?`,
        [from, to, from, to, legacy.id]);
      // Dateinamen nutzen Unterstriche statt Leerzeichen
      await run(`UPDATE documents SET filename = replace(filename, ?, ?) WHERE project_id = ?`,
        [from.replace(/\s/g, '_'), to.replace(/\s/g, '_'), legacy.id]);
    } else {
      await run(`UPDATE projects SET codename = ?, updated_at = now() WHERE id = ?`, [to, legacy.id]);
    }
    console.log(`🕶️  Projekt umbenannt: "${from}" → "${to}"`);
  }

  // 1. Admin upserten
  const isValidBcrypt = (h) => typeof h === 'string' && /^\$2[aby]\$\d{2}\$.{53}$/.test(h);
  const admin = await get(`SELECT id, password_hash FROM users WHERE email = ?`, [ADMIN.email]);

  let adminId;
  if (!admin) {
    adminId = await insert(
      `INSERT INTO users (email, password_hash, role, first_name, last_name, company, position, phone, is_approved, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 1)`,
      [ADMIN.email, bcrypt.hashSync(ADMIN.password, 10), ADMIN.role, ADMIN.first_name, ADMIN.last_name, ADMIN.company, ADMIN.position, ADMIN.phone]
    );
    console.log(`👤 Admin-User angelegt: ${ADMIN.email}`);
  } else {
    adminId = admin.id;
    await run(`UPDATE users SET role = ?, is_approved = 1, is_active = 1 WHERE email = ?`, [ADMIN.role, ADMIN.email]);
    // Notfall-Hebel: ADMIN_FORCE_PASSWORD_RESET=1 in Railway setzen →
    // Admin-Passwort wird beim nächsten Start auf ADMIN_PASSWORD (bzw.
    // Default) zurückgesetzt. Danach die Variable wieder entfernen!
    if (process.env.ADMIN_FORCE_PASSWORD_RESET === '1') {
      await run(`UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL WHERE email = ?`, [bcrypt.hashSync(ADMIN.password, 10), ADMIN.email]);
      console.log('🔑 Admin-Passwort per ADMIN_FORCE_PASSWORD_RESET zurückgesetzt, Variable jetzt wieder entfernen!');
    } else if (!isValidBcrypt(admin.password_hash)) {
      await run(`UPDATE users SET password_hash = ? WHERE email = ?`, [bcrypt.hashSync(ADMIN.password, 10), ADMIN.email]);
      console.log('🔑 Defekter Admin-Passwort-Hash zurückgesetzt');
    }
  }

  // 1b. Standard-NDA-Vorlage seeden, falls noch keine existiert (Sprint 3).
  //     Danach ist die Vorlage in der Tabelle nda_templates konfigurierbar.
  //     Datenfix: Platzhalter-Adresse (Musterstraße) in bereits geseedeten
  //     Vorlagen durch die echte Phalanx-Adresse ersetzen.
  try {
    const tplFix = require('./defaultNdaTemplate');
    await run(
      `UPDATE nda_templates SET advisor_json = ? WHERE advisor_json LIKE '%Musterstraße 1%'`,
      [JSON.stringify(tplFix.advisor)]
    );
  } catch (e) { console.warn('NDA-Adressfix:', e.message); }

  const { c: templateCount } = await get(`SELECT COUNT(*)::int AS c FROM nda_templates`);
  if (templateCount === 0) {
    const tpl = require('./defaultNdaTemplate');
    await run(
      `INSERT INTO nda_templates (name, version, court_venue, advisor_json, preamble, sections_json, is_active)
       VALUES (?, ?, ?, ?, ?, ?, 1)`,
      [tpl.name, tpl.version, tpl.court_venue, JSON.stringify(tpl.advisor), tpl.preamble, JSON.stringify(tpl.sections)]
    );
    console.log('📄 Standard-NDA-Vorlage geseedet (nda_templates)');
  }

  // 2. Mandate seeden, wenn Projekte-Tabelle leer ist
  const { c: projectCount } = await get(`SELECT COUNT(*)::int AS c FROM projects`);
  if (projectCount === 0) {
    for (const proj of PROJECTS) {
      const p = proj.public;
      const projectId = await insert(
        `INSERT INTO projects (codename, industry, region, revenue_band, ebitda_band, deal_type, short_description, highlights,
           stage, investment_needed, equity_stake, post_money_valuation, tam_band, sector_emoji, location_city, mandate_type,
           status, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)`,
        [p.codename, p.industry, p.region, p.revenue_band || 'k. A.', p.ebitda_band || 'k. A.',
         p.deal_type, p.short_description, JSON.stringify(p.highlights || []),
         p.stage, p.investment_needed, p.equity_stake, p.post_money_valuation,
         p.tam_band, p.sector_emoji, p.location_city, p.mandate_type || 'ma', adminId]
      );

      const d = proj.details || {};
      await run(
        `INSERT INTO project_details (project_id, full_description, revenue_actual, ebitda_actual, revenue_trend, employees,
           founding_year, growth_strategy, key_risks, asking_price_band, team_description, problem_solution, use_of_funds,
           traction_highlights, milestones)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [projectId, d.full_description, d.revenue_actual, d.ebitda_actual, d.revenue_trend, d.employees,
         d.founding_year, d.growth_strategy, d.key_risks, d.asking_price_band, d.team_description,
         d.problem_solution, d.use_of_funds, JSON.stringify(d.traction_highlights || []), d.milestones]
      );

      for (const doc of proj.documents || []) {
        await run(
          `INSERT INTO documents (project_id, filename, file_type, file_size, access_level, description, uploaded_by)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [projectId, doc.filename, doc.file_type, doc.file_size, doc.access_level, doc.description, adminId]
        );
      }
      console.log(`📁 Mandat geseedet: ${p.codename}`);
    }
  }
}

async function initialize() {
  // Migrationen ausführen (legt Schema + Default-Tenant "phalanx" an), 
  // bewusst über die Owner-Verbindung (DDL-Rechte)
  const [, applied] = await ownerKnex.migrate.latest();
  if (applied.length > 0) console.log(`🗄️  Migrationen ausgeführt: ${applied.join(', ')}`);

  // Sprint 5: RLS-App-Rolle einrichten und Anwendungsverbindung umstellen
  await setupRlsRole();

  await startupSeed();
  console.log('✅ Database initialized (PostgreSQL)');
}

module.exports = { initialize, get, all, run, insert, auditLog, activityLog, knex: appKnex, ownerKnex, startupSeed, withTenant };
