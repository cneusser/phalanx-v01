// ─────────────────────────────────────────────────────────────────────────────
// Sprint 19: CRM I: Unternehmen & Kontakte.
//
//   Unternehmen:  GET/POST /companies · GET/PUT/DELETE /companies/:id
//                 GET /companies/:id/detail  (Kontakte, Konzern, Verknüpfungen)
//   Kontakte:     GET/POST /contacts  · GET/PUT/DELETE /contacts/:id
//   Zuordnung:    POST /companies/:id/contacts · PUT/DELETE /links/:linkId
//   Dubletten:    GET /companies/duplicates?name=…  · GET /contacts/duplicates?email=…
//   Import/Export CSV: POST /import/:kind · GET /export/:kind
//
// Interner Bereich → nur Admin/Berater/Tenant-Owner. Mandantenfähig (RLS).
// ─────────────────────────────────────────────────────────────────────────────
const express = require('express');
const db = require('../db/database');
const wrap = require('../utils/asyncHandler');
const { authenticate, requireRole } = require('../middleware/auth');
const perms = require('../middleware/permissions');
const { requirePermission, can, projectScope, seesAllProjects } = perms;
const router = express.Router();

const scoped = (req, fn) => (req.tenantId && req.tenantId !== 1) ? db.withTenant(req.tenantId, fn) : fn(db);
// Staff = alle internen Rollen. Was jemand darf, entscheidet danach die
// Rechte-Matrix (requirePermission): nicht mehr die Rolle allein.
const isStaff = [authenticate, (req, res, next) => {
  if (!req.user) return res.status(401).json({ success: false, error: 'Nicht authentifiziert' });
  if (!perms.isStaff(req.user)) return res.status(403).json({ success: false, error: 'Keine Berechtigung' });
  next();
}];
const canWrite = requirePermission('crm.write');
const canDelete = requirePermission('crm.delete');
const canSend = requirePermission('mail.send');
const canExport = requirePermission('crm.export');
const canTemplates = requirePermission('mail.templates');

const safeJson = (s, d) => { try { return JSON.parse(s || ''); } catch { return d; } };

// Normalisierter Name für die Dubletten-Erkennung.
// Reihenfolge ist wichtig: Umlaute falten (Müller = Mueller) → & = und →
// Punkte entfernen (G.m.b.H. = GmbH) → Sonderzeichen weg → ERST DANN die
// Rechtsform strippen (sonst matcht „gmbh" in „g.m.b.h." nicht).
const LEGAL_FORMS = /\b(gmbh|ag|kg|ohg|gbr|ug|se|mbh|co|kgaa|ek|ltd|inc|llc|bv|nv|sa|sarl|spa|srl|plc|holding)\b/g;
function normalizeName(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[&+]/g, ' und ')
    .replace(/\./g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(LEGAL_FORMS, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ── Unternehmen: Liste (Suche + Filter) ─────────────────────────────────────
router.get('/companies', ...isStaff, wrap(async (req, res) => {
  const { q, industry, region, company_type, tag } = req.query;
  const where = ['1=1']; const params = [];
  if (q) { where.push('(c.name ILIKE ? OR c.city ILIKE ? OR c.website ILIKE ?)'); const s = `%${q}%`; params.push(s, s, s); }
  if (industry) { where.push('c.industry = ?'); params.push(industry); }
  if (region) { where.push('c.region = ?'); params.push(region); }
  if (company_type) { where.push('c.company_type = ?'); params.push(company_type); }
  if (tag) { where.push('c.tags_json ILIKE ?'); params.push(`%"${tag}"%`); }

  const rows = await scoped(req, (t) => t.all(`
    SELECT c.*,
           (SELECT COUNT(*)::int FROM crm_company_contacts cc WHERE cc.company_id = c.id AND cc.ended_on IS NULL) AS contact_count,
           p.name AS parent_name
    FROM crm_companies c
    LEFT JOIN crm_companies p ON p.id = c.parent_company_id
    WHERE ${where.join(' AND ')}
    ORDER BY c.name ASC LIMIT 500`, params));
  res.json({ success: true, data: rows.map(r => ({ ...r, tags: safeJson(r.tags_json, []) })) });
}));

// ── Dubletten-Check (vor dem Anlegen) ───────────────────────────────────────
router.get('/companies/duplicates', ...isStaff, wrap(async (req, res) => {
  const norm = normalizeName(req.query.name);
  if (!norm) return res.json({ success: true, data: [] });
  const rows = await scoped(req, (t) => t.all(
    `SELECT id, name, city, website, industry FROM crm_companies
     WHERE name_normalized = ? OR name_normalized ILIKE ? LIMIT 10`,
    [norm, `%${norm}%`]));
  res.json({ success: true, data: rows });
}));

router.get('/contacts/duplicates', ...isStaff, wrap(async (req, res) => {
  const email = String(req.query.email || '').toLowerCase().trim();
  if (!email) return res.json({ success: true, data: [] });
  const rows = await scoped(req, (t) => t.all(
    `SELECT id, first_name, last_name, email FROM crm_contacts WHERE lower(email) = ? LIMIT 10`, [email]));
  res.json({ success: true, data: rows });
}));

// ── Unternehmen: anlegen ────────────────────────────────────────────────────
const COMPANY_FIELDS = ['name', 'street', 'postal_code', 'city', 'country', 'website', 'industry', 'region',
  'revenue_band', 'employees', 'company_type', 'buyer_category', 'investment_criteria', 'description', 'notes',
  'parent_company_id', 'relation_to_parent'];

router.post('/companies', ...isStaff, canWrite, wrap(async (req, res) => {
  const name = String(req.body.name || '').trim();
  if (!name) return res.status(400).json({ success: false, error: 'Firmenname ist erforderlich' });

  // Dubletten-Warnung (kann mit force=true übergangen werden)
  if (!req.body.force) {
    const norm = normalizeName(name);
    const dupes = await scoped(req, (t) => t.all(
      `SELECT id, name, city FROM crm_companies WHERE name_normalized = ? LIMIT 5`, [norm]));
    if (dupes.length) {
      return res.status(409).json({ success: false, error: 'Mögliche Dublette gefunden', data: { duplicates: dupes } });
    }
  }

  const id = await scoped(req, (t) => t.insert(`
    INSERT INTO crm_companies (tenant_id, name, name_normalized, street, postal_code, city, country, website,
      industry, region, revenue_band, employees, company_type, buyer_category, investment_criteria,
      description, notes, tags_json, parent_company_id, relation_to_parent, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [req.tenantId || 1, name, normalizeName(name),
     req.body.street || null, req.body.postal_code || null, req.body.city || null, req.body.country || null,
     req.body.website || null, req.body.industry || null, req.body.region || null, req.body.revenue_band || null,
     req.body.employees ? Number(req.body.employees) : null, req.body.company_type || null,
     req.body.buyer_category || null, req.body.investment_criteria || null, req.body.description || null,
     req.body.notes || null, JSON.stringify(req.body.tags || []),
     req.body.parent_company_id || null, req.body.relation_to_parent || null, req.user.id]));

  db.auditLog(req.user.id, 'CRM_COMPANY_CREATED', 'crm_company', id, name, req.ip);
  res.status(201).json({ success: true, data: { id } });
}));

// ── Unternehmen: Detail (Kontakte, Konzern, Historie) ───────────────────────
router.get('/companies/:id/detail', ...isStaff, wrap(async (req, res) => {
  const company = await scoped(req, (t) => t.get(`
    SELECT c.*, p.name AS parent_name FROM crm_companies c
    LEFT JOIN crm_companies p ON p.id = c.parent_company_id WHERE c.id = ?`, [req.params.id]));
  if (!company) return res.status(404).json({ success: false, error: 'Unternehmen nicht gefunden' });

  const contacts = await scoped(req, (t) => t.all(`
    SELECT cc.id AS link_id, cc.position, cc.is_primary, cc.started_on, cc.ended_on,
           k.id, k.salutation, k.title, k.first_name, k.last_name, k.email, k.phone, k.mobile,
           k.linkedin_url, k.is_decision_maker, k.consent_status, k.contact_status
    FROM crm_company_contacts cc JOIN crm_contacts k ON k.id = cc.contact_id
    WHERE cc.company_id = ?
    ORDER BY cc.ended_on NULLS FIRST, cc.is_primary DESC, k.last_name`, [req.params.id]));

  const subsidiaries = await scoped(req, (t) => t.all(
    `SELECT id, name, relation_to_parent, city FROM crm_companies WHERE parent_company_id = ? ORDER BY name`, [req.params.id]));

  res.json({
    success: true,
    data: {
      company: { ...company, tags: safeJson(company.tags_json, []) },
      contacts: contacts.filter(c => !c.ended_on),
      history: contacts.filter(c => c.ended_on),
      subsidiaries,
    },
  });
}));

router.put('/companies/:id', ...isStaff, canWrite, wrap(async (req, res) => {
  const existing = await scoped(req, (t) => t.get('SELECT id FROM crm_companies WHERE id = ?', [req.params.id]));
  if (!existing) return res.status(404).json({ success: false, error: 'Unternehmen nicht gefunden' });

  const sets = []; const params = [];
  for (const f of COMPANY_FIELDS) {
    if (req.body[f] !== undefined) {
      sets.push(`${f} = ?`);
      params.push(f === 'employees' ? (req.body[f] ? Number(req.body[f]) : null) : (req.body[f] || null));
    }
  }
  if (req.body.name !== undefined) { sets.push('name_normalized = ?'); params.push(normalizeName(req.body.name)); }
  if (req.body.tags !== undefined) { sets.push('tags_json = ?'); params.push(JSON.stringify(req.body.tags || [])); }
  if (!sets.length) return res.json({ success: true, data: { message: 'Nichts zu ändern' } });

  sets.push('updated_at = now()');
  params.push(req.params.id);
  await scoped(req, (t) => t.run(`UPDATE crm_companies SET ${sets.join(', ')} WHERE id = ?`, params));
  db.auditLog(req.user.id, 'CRM_COMPANY_UPDATED', 'crm_company', req.params.id, null, req.ip);
  res.json({ success: true, data: { message: 'Gespeichert' } });
}));

// ── Unternehmen zusammenführen (Dubletten aufräumen) ───────────────────────
// Alles von `source` wandert zu `target`: Kontakte, Funnel-Einträge, Töchter.
// Leere Felder in `target` werden aus `source` aufgefüllt (nichts geht verloren).
router.post('/companies/:id/merge', ...isStaff, canWrite, wrap(async (req, res) => {
  const targetId = Number(req.params.id);
  const sourceId = Number(req.body.source_id);
  if (!sourceId || sourceId === targetId) {
    return res.status(400).json({ success: false, error: 'Bitte ein anderes Unternehmen zum Zusammenführen wählen.' });
  }
  const target = await scoped(req, (t) => t.get('SELECT * FROM crm_companies WHERE id = ?', [targetId]));
  const source = await scoped(req, (t) => t.get('SELECT * FROM crm_companies WHERE id = ?', [sourceId]));
  if (!target || !source) return res.status(404).json({ success: false, error: 'Unternehmen nicht gefunden' });

  // 1) Leere Felder im Ziel aus der Quelle auffüllen
  const FILLABLE = ['street', 'postal_code', 'city', 'country', 'website', 'industry', 'region',
    'revenue_band', 'employees', 'company_type', 'buyer_category', 'investment_criteria', 'description'];
  const sets = []; const params = [];
  for (const f of FILLABLE) {
    if ((target[f] === null || target[f] === '' || target[f] === undefined) && source[f]) {
      sets.push(`${f} = ?`); params.push(source[f]);
    }
  }
  // Notizen zusammenführen statt überschreiben
  if (source.notes) {
    const merged = [target.notes, `, aus „${source.name}": ${source.notes}`].filter(Boolean).join('\n');
    sets.push('notes = ?'); params.push(merged);
  }
  // Tags vereinigen
  const tTags = safeJson(target.tags_json, []); const sTags = safeJson(source.tags_json, []);
  const allTags = [...new Set([...tTags, ...sTags])];
  if (allTags.length !== tTags.length) { sets.push('tags_json = ?'); params.push(JSON.stringify(allTags)); }
  if (sets.length) {
    sets.push('updated_at = now()');
    params.push(targetId);
    await scoped(req, (t) => t.run(`UPDATE crm_companies SET ${sets.join(', ')} WHERE id = ?`, params));
  }

  // 2) Kontaktzuordnungen umhängen (Dubletten vermeiden)
  const srcLinks = await scoped(req, (t) => t.all('SELECT * FROM crm_company_contacts WHERE company_id = ?', [sourceId]));
  let movedContacts = 0;
  for (const l of srcLinks) {
    const dup = await scoped(req, (t) => t.get(
      'SELECT id FROM crm_company_contacts WHERE company_id = ? AND contact_id = ?', [targetId, l.contact_id]));
    if (dup) {
      await scoped(req, (t) => t.run('DELETE FROM crm_company_contacts WHERE id = ?', [l.id]));
    } else {
      await scoped(req, (t) => t.run('UPDATE crm_company_contacts SET company_id = ? WHERE id = ?', [targetId, l.id]));
      movedContacts++;
    }
  }

  // 3) Funnel-Einträge und Konzern-Verweise umhängen
  await scoped(req, (t) => t.run('UPDATE crm_deal_parties SET company_id = ? WHERE company_id = ?', [targetId, sourceId])).catch(() => {});
  await scoped(req, (t) => t.run('UPDATE crm_companies SET parent_company_id = ? WHERE parent_company_id = ?', [targetId, sourceId])).catch(() => {});

  // 4) Quelle löschen
  await scoped(req, (t) => t.run('DELETE FROM crm_companies WHERE id = ?', [sourceId]));

  db.auditLog(req.user.id, 'CRM_COMPANY_MERGED', 'crm_company', targetId,
    `„${source.name}" → „${target.name}" (${movedContacts} Kontakte übernommen)`, req.ip);
  res.json({ success: true, data: { merged_into: targetId, moved_contacts: movedContacts } });
}));

router.delete('/companies/:id', ...isStaff, canDelete, wrap(async (req, res) => {
  await scoped(req, (t) => t.run('DELETE FROM crm_companies WHERE id = ?', [req.params.id]));
  db.auditLog(req.user.id, 'CRM_COMPANY_DELETED', 'crm_company', req.params.id, null, req.ip);
  res.json({ success: true, data: { message: 'Unternehmen gelöscht' } });
}));

// ── Kontakte ────────────────────────────────────────────────────────────────
const CONTACT_FIELDS = ['salutation', 'title', 'first_name', 'last_name', 'email', 'phone', 'mobile',
  'linkedin_url', 'location', 'responsibility', 'relationship', 'notes', 'consent_status', 'contact_status'];
// Käufertyp am Kontakt (v0.291, DUB-Benchmark). Leer = unbekannt.
const BUYER_TYPES = ['strategic', 'financial', 'private', 'advisor_mandate'];
const cleanBuyerType = (v) => (BUYER_TYPES.includes(v) ? v : null);

router.get('/contacts', ...isStaff, wrap(async (req, res) => {
  const { q, decision_makers, company_id, buyer_type } = req.query;
  const where = ['1=1']; const params = [];
  if (q) { where.push('(k.last_name ILIKE ? OR k.first_name ILIKE ? OR k.email ILIKE ?)'); const s = `%${q}%`; params.push(s, s, s); }
  if (decision_makers === '1') where.push('k.is_decision_maker = 1');
  if (BUYER_TYPES.includes(buyer_type)) { where.push('k.buyer_type = ?'); params.push(buyer_type); }
  if (company_id) { where.push('EXISTS (SELECT 1 FROM crm_company_contacts cc WHERE cc.contact_id = k.id AND cc.company_id = ? AND cc.ended_on IS NULL)'); params.push(company_id); }

  const rows = await scoped(req, (t) => t.all(`
    SELECT k.*,
      (SELECT string_agg(c.name, ', ') FROM crm_company_contacts cc
        JOIN crm_companies c ON c.id = cc.company_id
        WHERE cc.contact_id = k.id AND cc.ended_on IS NULL) AS companies
    FROM crm_contacts k
    WHERE ${where.join(' AND ')}
    ORDER BY k.last_name, k.first_name LIMIT 500`, params));
  res.json({ success: true, data: rows.map(r => ({ ...r, tags: safeJson(r.tags_json, []) })) });
}));

router.post('/contacts', ...isStaff, canWrite, wrap(async (req, res) => {
  const last = String(req.body.last_name || '').trim();
  if (!last) return res.status(400).json({ success: false, error: 'Nachname ist erforderlich' });

  const email = req.body.email ? String(req.body.email).toLowerCase().trim() : null;
  if (email && !req.body.force) {
    const dupes = await scoped(req, (t) => t.all(
      `SELECT id, first_name, last_name, email FROM crm_contacts WHERE lower(email) = ? LIMIT 5`, [email]));
    if (dupes.length) return res.status(409).json({ success: false, error: 'Kontakt mit dieser E-Mail existiert bereits', data: { duplicates: dupes } });
  }

  const consent = ['unknown', 'opt_in', 'opt_out'].includes(req.body.consent_status) ? req.body.consent_status : 'unknown';
  const id = await scoped(req, (t) => t.insert(`
    INSERT INTO crm_contacts (tenant_id, salutation, title, first_name, last_name, email, phone, mobile,
      linkedin_url, location, responsibility, relationship, notes, tags_json, is_decision_maker,
      buyer_type, consent_status, consent_at, contact_status, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [req.tenantId || 1, req.body.salutation || null, req.body.title || null, req.body.first_name || null, last,
     email, req.body.phone || null, req.body.mobile || null, req.body.linkedin_url || null,
     req.body.location || null, req.body.responsibility || null, req.body.relationship || null,
     req.body.notes || null, JSON.stringify(req.body.tags || []),
     req.body.is_decision_maker ? 1 : 0, cleanBuyerType(req.body.buyer_type),
     consent, consent === 'opt_in' ? new Date() : null,
     ['active', 'do_not_contact', 'bounced'].includes(req.body.contact_status) ? req.body.contact_status : 'active',
     req.user.id]));

  // Optional direkt einem Unternehmen zuordnen
  if (req.body.company_id) {
    await scoped(req, (t) => t.run(
      `INSERT INTO crm_company_contacts (tenant_id, company_id, contact_id, position, is_primary)
       VALUES (?, ?, ?, ?, ?)`,
      [req.tenantId || 1, req.body.company_id, id, req.body.position || null, req.body.is_primary ? 1 : 0]));
  }

  db.auditLog(req.user.id, 'CRM_CONTACT_CREATED', 'crm_contact', id, `${req.body.first_name || ''} ${last}`.trim(), req.ip);
  res.status(201).json({ success: true, data: { id } });
}));

router.put('/contacts/:id', ...isStaff, canWrite, wrap(async (req, res) => {
  const existing = await scoped(req, (t) => t.get('SELECT id, consent_status FROM crm_contacts WHERE id = ?', [req.params.id]));
  if (!existing) return res.status(404).json({ success: false, error: 'Kontakt nicht gefunden' });

  const sets = []; const params = [];
  for (const f of CONTACT_FIELDS) {
    if (req.body[f] !== undefined) { sets.push(`${f} = ?`); params.push(req.body[f] || null); }
  }
  if (req.body.is_decision_maker !== undefined) { sets.push('is_decision_maker = ?'); params.push(req.body.is_decision_maker ? 1 : 0); }
  if (req.body.buyer_type !== undefined) { sets.push('buyer_type = ?'); params.push(cleanBuyerType(req.body.buyer_type)); }
  if (req.body.tags !== undefined) { sets.push('tags_json = ?'); params.push(JSON.stringify(req.body.tags || [])); }
  // Einwilligung frisch erteilt → Zeitstempel setzen (DSGVO-Nachweis)
  if (req.body.consent_status === 'opt_in' && existing.consent_status !== 'opt_in') {
    sets.push('consent_at = now()');
  }
  if (!sets.length) return res.json({ success: true, data: { message: 'Nichts zu ändern' } });

  sets.push('updated_at = now()');
  params.push(req.params.id);
  await scoped(req, (t) => t.run(`UPDATE crm_contacts SET ${sets.join(', ')} WHERE id = ?`, params));
  db.auditLog(req.user.id, 'CRM_CONTACT_UPDATED', 'crm_contact', req.params.id, null, req.ip);
  res.json({ success: true, data: { message: 'Gespeichert' } });
}));

router.delete('/contacts/:id', ...isStaff, canDelete, wrap(async (req, res) => {
  await scoped(req, (t) => t.run('DELETE FROM crm_contacts WHERE id = ?', [req.params.id]));
  db.auditLog(req.user.id, 'CRM_CONTACT_DELETED', 'crm_contact', req.params.id, null, req.ip);
  res.json({ success: true, data: { message: 'Kontakt gelöscht' } });
}));

// Kontakt-Detail inkl. aller (auch früherer) Unternehmenszuordnungen
router.get('/contacts/:id/detail', ...isStaff, wrap(async (req, res) => {
  const contact = await scoped(req, (t) => t.get('SELECT * FROM crm_contacts WHERE id = ?', [req.params.id]));
  if (!contact) return res.status(404).json({ success: false, error: 'Kontakt nicht gefunden' });
  const links = await scoped(req, (t) => t.all(`
    SELECT cc.id AS link_id, cc.position, cc.is_primary, cc.started_on, cc.ended_on,
           c.id AS company_id, c.name AS company_name, c.city
    FROM crm_company_contacts cc JOIN crm_companies c ON c.id = cc.company_id
    WHERE cc.contact_id = ? ORDER BY cc.ended_on NULLS FIRST, cc.started_on DESC`, [req.params.id]));

  // Sprint 20: Mandats-Zuordnungen dieses Kontakts (Rolle + Funnel-Stufe)
  const deals = await scoped(req, (t) => t.all(`
    SELECT dp.id AS party_id, dp.project_id, dp.party_role, dp.funnel_stage, dp.party_status, dp.next_step,
           dp.nda_status, dp.access_granted, dp.identity_revealed,
           p.codename, p.status AS project_status,
           (SELECT CASE
                     WHEN nr.signed_at IS NOT NULL OR nr.status IN ('signed', 'approved') THEN 'signed'
                     WHEN nr.status IN ('requested', 'sent', 'nda_pending') THEN 'open'
                     ELSE nr.status END
              FROM nda_requests nr
             WHERE nr.project_id = dp.project_id AND nr.user_id = ?
             ORDER BY nr.id DESC LIMIT 1) AS nda_online
    FROM crm_deal_parties dp JOIN projects p ON p.id = dp.project_id
    WHERE dp.contact_id = ? ORDER BY dp.funnel_stage DESC`, [contact.user_id || 0, req.params.id])).catch(() => []);

  // Aktivitäten-Timeline: Einladungen, Mailings, Reminder, Pflege-Links, Selbstpflege
  const activity = await contactActivity(req, req.params.id, contact);

  // Plattform-Konto (falls der Kontakt registriert ist)
  const account = contact.user_id
    ? await db.get(`SELECT id, email, role, is_approved, is_active, email_verified, created_at, last_login
                      FROM users WHERE id = ?`, [contact.user_id]).catch(() => null)
    : null;

  res.json({
    success: true,
    data: {
      contact: { ...contact, tags: safeJson(contact.tags_json, []) },
      current: links.filter(l => !l.ended_on),
      history: links.filter(l => l.ended_on),   // frühere Positionen / Unternehmenswechsel
      deals,
      activity,
      account,
      tasks: await scoped(req, (t) => t.all(
        `SELECT * FROM crm_tasks WHERE contact_id = ? AND status = 'open' ORDER BY due_on NULLS LAST`,
        [req.params.id])).catch(() => []),
    },
  });
}));

// Aktivitäten eines Kontakts, chronologisch: was ist wann rausgegangen, was kam zurück?
const EMAIL_TYPE_LABEL = {
  campaign: 'Ansprache', process: 'Prozess-Mail', invite: 'Einladung',
  profile_link: 'Pflege-Link', system: 'System-Mail',
};

async function contactActivity(req, contactId, contact = null) {
  const ev = [];
  const push = (ts, type, label, detail) => { if (ts) ev.push({ ts, type, label, detail: detail || null }); };

  const email = contact && contact.email ? String(contact.email) : null;
  const userId = contact && contact.user_id ? contact.user_id : null;

  // Vollständiges Mail-Ausgangsbuch für diesen Kontakt: JEDE Mail, die an ihn ging
  // (Ansprache, Prozess, Einladung, NDA, System). Ein Klick zeigt später das Original.
  const sentMails = await scoped(req, (t) => t.all(
    `SELECT id, subject, mail_type, template_key, status, created_at
       FROM email_log
      WHERE contact_id = ?
         OR (? IS NOT NULL AND user_id = ?)
         OR (? IS NOT NULL AND lower(to_email) = lower(?))
      ORDER BY created_at DESC LIMIT 60`,
    [contactId, userId, userId, email, email])).catch(() => []);
  for (const m of sentMails) {
    const label = m.status === 'failed' ? 'E-Mail fehlgeschlagen' : 'E-Mail versendet';
    const kind = EMAIL_TYPE_LABEL[m.mail_type] || m.mail_type || 'E-Mail';
    push(m.created_at, 'mail', label, [kind, m.subject].filter(Boolean).join(': '));
  }

  const invites = await scoped(req, (t) => t.all(
    `SELECT i.*, p.codename FROM crm_invitations i LEFT JOIN projects p ON p.id = i.project_id
      WHERE i.contact_id = ? ORDER BY i.invited_at DESC LIMIT 30`, [contactId])).catch(() => []);
  for (const i of invites) {
    push(i.invited_at, 'invite', 'Einladung versendet', i.codename ? `Mandat ${i.codename}` : 'Plattform-Einladung');
    push(i.opened_at, 'open', 'Einladung geöffnet', null);
    push(i.consent_at, 'consent', 'Einwilligung erteilt', `Nachweis: ${i.consent_text_version || 'k. A.'} · IP ${i.consent_ip || 'k. A.'}`);
    push(i.registered_at, 'register', 'Konto angelegt', i.email);
    if (i.status === 'declined') push(i.invited_at, 'decline', 'Widerspruch erklärt', 'Kontakt wird nicht mehr angeschrieben');
  }

  const mails = await scoped(req, (t) => t.all(`
    SELECT r.*, c.name AS campaign_name, c.purpose, p.codename
    FROM crm_campaign_recipients r
    JOIN crm_campaigns c ON c.id = r.campaign_id
    LEFT JOIN projects p ON p.id = c.project_id
    WHERE r.contact_id = ? ORDER BY r.sent_at DESC LIMIT 30`, [contactId])).catch(() => []);
  for (const m of mails) {
    // Der Erstversand steht bereits im Mail-Ausgangsbuch (email_log); hier nur die
    // kampagnenspezifischen Ereignisse, damit nichts doppelt erscheint.
    push(m.last_reminder_at, 'reminder', `Erinnerung ${m.reminder_count}/2 versendet`, m.codename ? `Mandat ${m.codename}` : null);
    push(m.responded_at, 'response', 'Reaktion erfasst', m.skip_reason || null);
  }

  // Chat-Nachrichten (Plattform-Chat) des zum Kontakt gehörenden Nutzers
  if (userId) {
    const chat = await scoped(req, (t) => t.all(
      `SELECT m.body, m.sender_id, m.created_at, p.codename
         FROM messages m LEFT JOIN projects p ON p.id = m.project_id
        WHERE m.sender_id = ? OR m.recipient_id = ?
        ORDER BY m.created_at DESC LIMIT 30`, [userId, userId])).catch(() => []);
    for (const c of chat) {
      const fromContact = c.sender_id === userId;
      push(c.created_at, fromContact ? 'chat_in' : 'chat_out',
        fromContact ? 'Chat-Nachricht vom Kontakt' : 'Chat-Nachricht an den Kontakt',
        [c.codename ? `Mandat ${c.codename}` : null, String(c.body || '').replace(/<[^>]+>/g, '').slice(0, 120)].filter(Boolean).join(' · ') || null);
    }
  }

  const plinks = await scoped(req, (t) => t.all(
    `SELECT * FROM crm_profile_links WHERE contact_id = ? ORDER BY id DESC LIMIT 10`, [contactId])).catch(() => []);
  for (const l of plinks) {
    push(l.created_at, 'link', 'Pflege-Link versendet', l.requires_approval ? 'Änderungen nur nach Freigabe' : 'Änderungen werden direkt übernommen');
    push(l.last_opened_at, 'open', 'Pflege-Link geöffnet', null);
    push(l.last_saved_at, 'selfcare', 'Kontakt hat Daten gespeichert', null);
  }

  const changes = await scoped(req, (t) => t.all(
    `SELECT * FROM crm_profile_changes WHERE contact_id = ? ORDER BY id DESC LIMIT 20`, [contactId])).catch(() => []);
  for (const c of changes) {
    const fields = Object.keys(safeJson(c.after_json, {})).join(', ');
    push(c.created_at, 'selfcare', c.status === 'pending' ? 'Selbstpflege, wartet auf Freigabe' : 'Selbstpflege übernommen', fields || null);
  }

  // Eingegangene Antworten (BCC-Ingest oder manuell erfasst)
  const msgs = await scoped(req, (t) => t.all(
    `SELECT m.*, p.codename FROM crm_messages m LEFT JOIN projects p ON p.id = m.project_id
      WHERE m.contact_id = ? ORDER BY COALESCE(m.sent_at, m.created_at) DESC LIMIT 30`, [contactId])).catch(() => []);
  for (const m of msgs) {
    push(m.sent_at || m.created_at, m.direction === 'in' ? 'reply_in' : 'mail',
      m.direction === 'in' ? 'Antwort eingegangen' : 'Nachricht versendet',
      [m.codename ? `Mandat ${m.codename}` : null, m.subject].filter(Boolean).join(' · ') || null);
  }

  // Wiedervorlagen
  const tasks = await scoped(req, (t) => t.all(
    `SELECT * FROM crm_tasks WHERE contact_id = ? ORDER BY id DESC LIMIT 20`, [contactId])).catch(() => []);
  for (const t of tasks) {
    push(t.created_at, 'task', `Wiedervorlage: ${t.title}`, t.due_on ? `fällig ${new Date(t.due_on).toLocaleDateString('de-DE')}` : null);
    push(t.done_at, 'task_done', `Erledigt: ${t.title}`, null);
  }

  return ev.sort((a, b) => new Date(b.ts) - new Date(a.ts)).slice(0, 80);
}

// Kompakte Kontaktliste fürs Admin-Dashboard (Suche über Name, E-Mail, Unternehmen)
router.get('/contacts/search', ...isStaff, wrap(async (req, res) => {
  const q = `%${String(req.query.q || '').toLowerCase()}%`;
  const rows = await scoped(req, (t) => t.all(`
    SELECT k.id, k.salutation, k.title, k.first_name, k.last_name, k.email, k.phone, k.mobile,
           k.consent_status, k.contact_status, k.is_decision_maker, k.user_id, k.profile_updated_at,
           (SELECT string_agg(c.name, ', ') FROM crm_company_contacts cc JOIN crm_companies c ON c.id = cc.company_id
             WHERE cc.contact_id = k.id AND cc.ended_on IS NULL) AS companies,
           (SELECT COUNT(*)::int FROM crm_deal_parties dp WHERE dp.contact_id = k.id) AS deals,
           (SELECT MAX(r.sent_at) FROM crm_campaign_recipients r WHERE r.contact_id = k.id) AS last_mail
    FROM crm_contacts k
    WHERE (? = '%%' OR lower(coalesce(k.first_name,'') || ' ' || coalesce(k.last_name,'') || ' ' || coalesce(k.email,'')) LIKE ?
           OR EXISTS (SELECT 1 FROM crm_company_contacts cc JOIN crm_companies c ON c.id = cc.company_id
                       WHERE cc.contact_id = k.id AND lower(c.name) LIKE ?))
    ORDER BY k.last_name, k.first_name LIMIT 200`, [q, q, q]));
  res.json({ success: true, data: { contacts: rows } });
}));

// ── Zuordnung Kontakt ↔ Unternehmen ─────────────────────────────────────────
router.post('/companies/:id/contacts', ...isStaff, wrap(async (req, res) => {
  const contactId = Number(req.body.contact_id);
  if (!contactId) return res.status(400).json({ success: false, error: 'contact_id fehlt' });
  const dup = await scoped(req, (t) => t.get(
    `SELECT id FROM crm_company_contacts WHERE company_id = ? AND contact_id = ? AND ended_on IS NULL`,
    [req.params.id, contactId]));
  if (dup) return res.status(409).json({ success: false, error: 'Kontakt ist diesem Unternehmen bereits zugeordnet.' });

  const id = await scoped(req, (t) => t.insert(
    `INSERT INTO crm_company_contacts (tenant_id, company_id, contact_id, position, is_primary, started_on)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [req.tenantId || 1, req.params.id, contactId, req.body.position || null,
     req.body.is_primary ? 1 : 0, req.body.started_on || null]));
  res.status(201).json({ success: true, data: { id } });
}));

// Position beenden (→ wandert in die Historie) oder Angaben ändern
router.put('/links/:linkId', ...isStaff, wrap(async (req, res) => {
  const sets = []; const params = [];
  for (const f of ['position', 'started_on', 'ended_on']) {
    if (req.body[f] !== undefined) { sets.push(`${f} = ?`); params.push(req.body[f] || null); }
  }
  if (req.body.is_primary !== undefined) { sets.push('is_primary = ?'); params.push(req.body.is_primary ? 1 : 0); }
  if (!sets.length) return res.json({ success: true, data: { message: 'Nichts zu ändern' } });
  params.push(req.params.linkId);
  await scoped(req, (t) => t.run(`UPDATE crm_company_contacts SET ${sets.join(', ')} WHERE id = ?`, params));
  res.json({ success: true, data: { message: 'Gespeichert' } });
}));

router.delete('/links/:linkId', ...isStaff, wrap(async (req, res) => {
  await scoped(req, (t) => t.run('DELETE FROM crm_company_contacts WHERE id = ?', [req.params.linkId]));
  res.json({ success: true, data: { message: 'Zuordnung entfernt' } });
}));

// ── CSV-Export ──────────────────────────────────────────────────────────────
const csvCell = (v) => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`;
const toCsv = (headers, rows) =>
  '﻿' + [headers.map(csvCell).join(';'), ...rows.map(r => r.map(csvCell).join(';'))].join('\n');

router.get('/export/companies', ...isStaff, canExport, wrap(async (req, res) => {
  const rows = await scoped(req, (t) => t.all('SELECT * FROM crm_companies ORDER BY name'));
  const headers = ['Name', 'Strasse', 'PLZ', 'Ort', 'Land', 'Website', 'Branche', 'Region', 'Umsatz',
    'Mitarbeiter', 'Unternehmensart', 'Kaeuferkategorie', 'Investitionskriterien', 'Beschreibung', 'Notizen', 'Tags'];
  const body = rows.map(c => [c.name, c.street, c.postal_code, c.city, c.country, c.website, c.industry, c.region,
    c.revenue_band, c.employees, c.company_type, c.buyer_category, c.investment_criteria, c.description, c.notes,
    safeJson(c.tags_json, []).join(', ')]);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="CRM_Unternehmen.csv"');
  res.send(toCsv(headers, body));
}));

router.get('/export/contacts', ...isStaff, canExport, wrap(async (req, res) => {
  const rows = await scoped(req, (t) => t.all(`
    SELECT k.*, (SELECT string_agg(c.name, ', ') FROM crm_company_contacts cc JOIN crm_companies c ON c.id = cc.company_id
                 WHERE cc.contact_id = k.id AND cc.ended_on IS NULL) AS companies
    FROM crm_contacts k ORDER BY k.last_name`));
  const headers = ['Anrede', 'Titel', 'Vorname', 'Nachname', 'Position/Unternehmen', 'Email', 'Telefon', 'Mobil',
    'LinkedIn', 'Standort', 'Verantwortung', 'Beziehung', 'Entscheider', 'Einwilligung', 'Kontaktstatus', 'Notizen'];
  const body = rows.map(k => [k.salutation, k.title, k.first_name, k.last_name, k.companies, k.email, k.phone,
    k.mobile, k.linkedin_url, k.location, k.responsibility, k.relationship,
    k.is_decision_maker ? 'ja' : 'nein', k.consent_status, k.contact_status, k.notes]);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="CRM_Kontakte.csv"');
  res.send(toCsv(headers, body));
}));

// ── CSV-Import (Text im Body; ; oder , als Trenner) ─────────────────────────
function parseCsv(text) {
  const clean = String(text || '').replace(/^﻿/, '').trim();
  if (!clean) return [];
  const lines = clean.split(/\r?\n/);
  const delim = (lines[0].match(/;/g) || []).length >= (lines[0].match(/,/g) || []).length ? ';' : ',';
  const splitLine = (line) => {
    const out = []; let cur = ''; let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { if (inQ && line[i + 1] === '"') { cur += '"'; i++; } else inQ = !inQ; }
      else if (ch === delim && !inQ) { out.push(cur); cur = ''; }
      else cur += ch;
    }
    out.push(cur);
    return out.map(s => s.trim());
  };
  const headers = splitLine(lines[0]).map(h => h.toLowerCase().replace(/[^a-zäöüß]/g, ''));
  return lines.slice(1).filter(l => l.trim()).map(l => {
    const cells = splitLine(l);
    const row = {};
    headers.forEach((h, i) => { row[h] = cells[i] ?? ''; });
    return row;
  });
}
// Tolerante Spaltenzuordnung (deutsche und englische Kopfzeilen)
const pick = (row, ...keys) => { for (const k of keys) if (row[k]) return row[k]; return null; };

router.post('/import/companies', ...isStaff, canWrite, wrap(async (req, res) => {
  const rows = parseCsv(req.body.csv);
  if (!rows.length) return res.status(400).json({ success: false, error: 'Keine Datenzeilen gefunden.' });
  let created = 0, skipped = 0;
  for (const r of rows) {
    const name = pick(r, 'name', 'firmenname', 'unternehmen', 'company');
    if (!name) { skipped++; continue; }
    const norm = normalizeName(name);
    const dup = await scoped(req, (t) => t.get('SELECT id FROM crm_companies WHERE name_normalized = ?', [norm]));
    if (dup) { skipped++; continue; }  // Dubletten werden übersprungen
    await scoped(req, (t) => t.insert(`
      INSERT INTO crm_companies (tenant_id, name, name_normalized, street, postal_code, city, country, website,
        industry, region, revenue_band, employees, company_type, buyer_category, investment_criteria, notes, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.tenantId || 1, name, norm,
       pick(r, 'strasse', 'straße', 'street'), pick(r, 'plz', 'postleitzahl', 'postalcode', 'zip'),
       pick(r, 'ort', 'stadt', 'city'), pick(r, 'land', 'country'), pick(r, 'website', 'web', 'url'),
       pick(r, 'branche', 'industry'), pick(r, 'region'), pick(r, 'umsatz', 'revenue'),
       Number(pick(r, 'mitarbeiter', 'employees')) || null,
       pick(r, 'unternehmensart', 'typ', 'type'), pick(r, 'kaeuferkategorie', 'käuferkategorie'),
       pick(r, 'investitionskriterien', 'kriterien'), pick(r, 'notizen', 'notes'), req.user.id]));
    created++;
  }
  db.auditLog(req.user.id, 'CRM_IMPORT_COMPANIES', 'crm_company', null, `${created} angelegt, ${skipped} übersprungen`, req.ip);
  res.json({ success: true, data: { created, skipped, total: rows.length } });
}));

router.post('/import/contacts', ...isStaff, canWrite, wrap(async (req, res) => {
  const rows = parseCsv(req.body.csv);
  if (!rows.length) return res.status(400).json({ success: false, error: 'Keine Datenzeilen gefunden.' });
  let created = 0, skipped = 0, linked = 0;
  for (const r of rows) {
    const last = pick(r, 'nachname', 'lastname', 'name');
    if (!last) { skipped++; continue; }
    const email = (pick(r, 'email', 'mail', 'emailadresse') || '').toLowerCase() || null;
    if (email) {
      const dup = await scoped(req, (t) => t.get('SELECT id FROM crm_contacts WHERE lower(email) = ?', [email]));
      if (dup) { skipped++; continue; }
    }
    const contactId = await scoped(req, (t) => t.insert(`
      INSERT INTO crm_contacts (tenant_id, salutation, title, first_name, last_name, email, phone, mobile,
        linkedin_url, location, responsibility, notes, is_decision_maker, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.tenantId || 1, pick(r, 'anrede', 'salutation'), pick(r, 'titel', 'title'),
       pick(r, 'vorname', 'firstname'), last, email,
       pick(r, 'telefon', 'phone', 'tel'), pick(r, 'mobil', 'mobile', 'handy'),
       pick(r, 'linkedin', 'linkedinurl'), pick(r, 'standort', 'location'),
       pick(r, 'verantwortung', 'responsibility'), pick(r, 'notizen', 'notes'),
       /ja|yes|1|true/i.test(pick(r, 'entscheider', 'decisionmaker') || '') ? 1 : 0,
       req.user.id]));
    created++;

    // Unternehmen aus der Zeile anlegen/zuordnen, falls angegeben
    const companyName = pick(r, 'unternehmen', 'firma', 'company', 'firmenname');
    if (companyName) {
      const norm = normalizeName(companyName);
      let comp = await scoped(req, (t) => t.get('SELECT id FROM crm_companies WHERE name_normalized = ?', [norm]));
      if (!comp) {
        const newId = await scoped(req, (t) => t.insert(
          `INSERT INTO crm_companies (tenant_id, name, name_normalized, created_by) VALUES (?, ?, ?, ?)`,
          [req.tenantId || 1, companyName, norm, req.user.id]));
        comp = { id: newId };
      }
      await scoped(req, (t) => t.run(
        `INSERT INTO crm_company_contacts (tenant_id, company_id, contact_id, position) VALUES (?, ?, ?, ?)`,
        [req.tenantId || 1, comp.id, contactId, pick(r, 'position', 'funktion')]));
      linked++;
    }
  }
  db.auditLog(req.user.id, 'CRM_IMPORT_CONTACTS', 'crm_contact', null, `${created} angelegt, ${skipped} übersprungen`, req.ip);
  res.json({ success: true, data: { created, skipped, linked, total: rows.length } });
}));

// ═══════════════════════════════════════════════════════════════════════════
// Sprint 20: CRM II: Beteiligtenrollen & Sell-Side-Funnel je Mandat
// ═══════════════════════════════════════════════════════════════════════════
const FUNNEL_STAGES = [
  { key: 0, label: 'Longlist' },
  { key: 1, label: 'Angesprochen' },
  { key: 2, label: 'Rückmeldung' },
  { key: 3, label: 'Match' },
  { key: 4, label: 'NDA' },
  { key: 5, label: 'IM / Unterlagen' },
  { key: 6, label: 'Gespräch' },
  { key: 7, label: 'LOI eingereicht' },
  { key: 8, label: 'LOI unterschrieben' },
  { key: 9, label: 'Namensnennung' },
  { key: 10, label: 'Due Diligence' },
  { key: 11, label: 'Signing' },
  { key: 12, label: 'Closing' },
];
const PARTY_ROLES = ['buyer', 'advisor', 'seller', 'process', 'bank', 'lawyer', 'target', 'other'];
const PARTY_STATUS = ['active', 'dropped', 'open', 'unclear'];
const STAGNANT_DAYS = 30;

// Mandate mit Funnel-Zahlen (Auswahl fürs Board)
router.get('/deals', ...isStaff, wrap(async (req, res) => {
  // Sichtbarkeit: Admin/Eigentümer sehen alle Mandate, Berater und Assistenz nur die,
  // die ihnen gehören oder in denen sie Mitglied sind.
  const sc = projectScope(req.user, 'p');
  const rows = await scoped(req, (t) => t.all(`
    SELECT p.id, p.codename, p.status, p.deal_status, p.industry, p.region,
           (SELECT COUNT(*)::int FROM crm_deal_parties dp WHERE dp.project_id = p.id) AS parties,
           (SELECT COUNT(*)::int FROM crm_deal_parties dp WHERE dp.project_id = p.id AND dp.party_status = 'active') AS active,
           (SELECT COUNT(*)::int FROM crm_deal_parties dp WHERE dp.project_id = p.id AND dp.party_status = 'open') AS open
    FROM projects p
    WHERE (EXISTS (SELECT 1 FROM crm_deal_parties dp WHERE dp.project_id = p.id) OR p.status = 'active')
      AND ${sc.sql}
    ORDER BY parties DESC, p.codename`, sc.params));
  res.json({ success: true, data: { deals: rows, stages: FUNNEL_STAGES } });
}));

// Board eines Mandats: alle Beteiligten je Funnel-Stufe (inkl. Verweildauer)
router.get('/deals/:projectId/parties', ...isStaff, wrap(async (req, res) => {
  const rows = await scoped(req, (t) => t.all(`
    SELECT dp.*,
           k.first_name, k.last_name, k.email, k.consent_status, k.contact_status, k.is_decision_maker,
           k.lead_source, k.lead_ref, k.buyer_type,
           c.name AS company_name,
           (SELECT platform_nda_signed_at FROM users u WHERE u.id = k.user_id) AS platform_nda,
           (SELECT status FROM crm_invitations i WHERE i.contact_id = dp.contact_id ORDER BY i.invited_at DESC LIMIT 1) AS invite_status,
           -- NDA-Stand des zum Kontakt gehörenden Nutzers für DIESES Mandat (online)
           (SELECT CASE
                     WHEN nr.signed_at IS NOT NULL OR nr.status IN ('signed', 'approved') THEN 'signed'
                     WHEN nr.status IN ('requested', 'sent', 'nda_pending') THEN 'open'
                     ELSE nr.status END
              FROM nda_requests nr
             WHERE nr.project_id = dp.project_id AND nr.user_id = k.user_id
             ORDER BY nr.id DESC LIMIT 1) AS nda_online
    FROM crm_deal_parties dp
    LEFT JOIN crm_contacts k ON k.id = dp.contact_id
    LEFT JOIN crm_companies c ON c.id = dp.company_id
    WHERE dp.project_id = ?
    ORDER BY dp.funnel_stage DESC, dp.last_contact DESC NULLS LAST`, [req.params.projectId]));

  const now = Date.now();
  const parties = rows.map(r => {
    const since = r.stage_changed_at ? new Date(r.stage_changed_at).getTime() : now;
    const days = Math.max(0, Math.floor((now - since) / 86400000));
    return {
      ...r,
      days_in_stage: days,
      // Stagnation nur bei noch laufenden Vorgängen melden
      stagnant: days > STAGNANT_DAYS && ['open', 'active', 'unclear'].includes(r.party_status) && r.funnel_stage > 0,
    };
  });

  // Funnel-Kennzahlen (Conversion je Stufe)
  const counts = {};
  FUNNEL_STAGES.forEach(s => { counts[s.key] = parties.filter(p => p.funnel_stage === s.key).length; });
  const reached = {};
  FUNNEL_STAGES.forEach(s => { reached[s.key] = parties.filter(p => p.funnel_stage >= s.key).length; });

  res.json({ success: true, data: { parties, stages: FUNNEL_STAGES, counts, reached } });
}));

// ── Lead-Ingest: Kaufanfrage aus einem Marktplatz (DUB.de u. a.) einlesen ─────
// Zwei Schritte, damit der Admin vor dem Anlegen prüfen kann:
//   POST /leads/parse    zerlegt den eingefügten Text, ordnet ein Mandat zu (Vorschau)
//   POST /leads/ingest   legt Kontakt an/aktualisiert, hängt ihn in den Funnel
const { parseLead } = require('../utils/leadParser');
const { findProjectByHint, ingestLead } = require('../utils/leadIngest');

// DB-Handle, das an den Mandanten des Requests gebunden ist
const qFor = (req) => ({
  get: (s, p) => scoped(req, (t) => t.get(s, p)),
  all: (s, p) => scoped(req, (t) => t.all(s, p)),
  run: (s, p) => scoped(req, (t) => t.run(s, p)),
  insert: (s, p) => scoped(req, (t) => t.insert(s, p)),
});

// Übersicht: von welchen Plattformen kommen unsere Kontakte? (für die Admin-Ansicht)
router.get('/leads/sources', ...isStaff, wrap(async (req, res) => {
  const q = qFor(req);
  const sources = await q.all(
    `SELECT lead_source AS source, COUNT(*)::int AS count, MAX(created_at) AS last_at
       FROM crm_contacts WHERE lead_source IS NOT NULL AND lead_source <> ''
      GROUP BY lead_source ORDER BY count DESC`).catch(() => []);
  const recent = await q.all(
    `SELECT id, first_name, last_name, email, lead_source, lead_ref, created_at
       FROM crm_contacts WHERE lead_source IS NOT NULL AND lead_source <> ''
      ORDER BY id DESC LIMIT 15`).catch(() => []);
  res.json({ success: true, data: { sources, recent } });
}));

router.post('/leads/parse', ...isStaff, wrap(async (req, res) => {
  const text = String(req.body.text || '');
  if (text.trim().length < 20) return res.status(400).json({ success: false, error: 'Bitte fügen Sie die vollständige Anfrage-E-Mail ein.' });
  const lead = parseLead(text);
  const project = await findProjectByHint(qFor(req), lead.projectHint);
  res.json({ success: true, data: { lead, matchedProject: project || null } });
}));

router.post('/leads/ingest', ...isStaff, canWrite, wrap(async (req, res) => {
  // Der Admin darf die geparsten Felder vor dem Speichern korrigiert haben.
  const lead = req.body.lead && req.body.lead.contact ? req.body.lead : parseLead(String(req.body.text || ''));
  try {
    const q = qFor(req);
    const result = await ingestLead(q, {
      tenant: req.tenantId || 1, lead,
      projectId: Number(req.body.project_id) || null,
      actorId: req.user.id, auditLog: db.auditLog,
    });
    // Direkt ansprechen (optional): nur wenn der Nutzer das Recht zum Mailversand
    // hat und ein Mandat zugeordnet ist.
    let approach = null;
    if (req.body.auto_approach && result.project_id && can(req.user, 'mail.send')) {
      approach = await require('../utils/outreach').sendFirstApproach(q, {
        tenant: req.tenantId || 1, contactId: result.contact_id, projectId: result.project_id,
        actorId: req.user.id, inviter: req.user,
      });
    }
    res.status(201).json({ success: true, data: { ...result, approach } });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
}));

// ── Recherche-Liste (Excel/CSV) importieren ─────────────────────────────────
// Zwei Schritte: analysieren (Vorschau + Dubletten-Abgleich) und anwenden
// (Kontakte anlegen, dem Mandat zuordnen, optional einladen). Das „Match" gegen
// den bestehenden CRM-Bestand zeigt, welche Kontakte neu und welche vorhanden sind.
const multer = require('multer');
const importUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 6 * 1024 * 1024 } });
const { detectHeaderRow, guessMapping, buildContacts } = require('../utils/contactImport');

function parseSheet(file) {
  const name = (file.originalname || '').toLowerCase();
  if (name.endsWith('.csv') || (file.mimetype || '').includes('csv')) {
    const text = file.buffer.toString('utf8').replace(/^﻿/, '');
    const first = text.split(/\r?\n/)[0] || '';
    const delim = (first.match(/;/g) || []).length >= (first.match(/,/g) || []).length ? ';' : ',';
    return text.split(/\r?\n/).map(l => l.split(delim).map(c => c.replace(/^"(.*)"$/, '$1')));
  }
  const XLSX = require('xlsx');
  const wb = XLSX.read(file.buffer, { type: 'buffer' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
}

router.post('/import/analyze', ...isStaff, canWrite, importUpload.single('file'), wrap(async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, error: 'Keine Datei empfangen.' });
  let rows;
  try { rows = parseSheet(req.file); } catch (e) { return res.status(400).json({ success: false, error: 'Datei nicht lesbar: ' + e.message }); }
  if (!rows || rows.length < 2) return res.status(400).json({ success: false, error: 'Zu wenige Zeilen in der Datei.' });

  const headerIdx = detectHeaderRow(rows);
  const headers = (rows[headerIdx] || []).map(x => String(x == null ? '' : x));
  const mapping = guessMapping(headers);
  const contacts = buildContacts(rows, headerIdx, mapping).slice(0, 1000);

  const q = qFor(req);
  const emails = [...new Set(contacts.map(c => c.email).filter(Boolean))];
  const byEmail = {};
  if (emails.length) {
    const rowsE = await q.all(`SELECT id, lower(email) AS email FROM crm_contacts WHERE lower(email) IN (${emails.map(() => '?').join(',')})`, emails).catch(() => []);
    for (const r of rowsE) byEmail[r.email] = r;
  }
  const names = [...new Set(contacts.filter(c => !c.email && c.last_name).map(c => c.last_name.toLowerCase()))];
  const byName = {};
  if (names.length) {
    const rowsN = await q.all(`SELECT id, lower(last_name) AS ln FROM crm_contacts WHERE lower(last_name) IN (${names.map(() => '?').join(',')})`, names).catch(() => []);
    for (const r of rowsN) byName[r.ln] = r;
  }
  let neu = 0, vorhanden = 0, ohne_email = 0;
  const enriched = contacts.map(c => {
    const ex = (c.email && byEmail[c.email]) || (!c.email && c.last_name && byName[c.last_name.toLowerCase()]) || null;
    if (!c.email) ohne_email++;
    if (ex) vorhanden++; else neu++;
    return { ...c, status: ex ? 'exists' : 'new', existingId: ex ? ex.id : null };
  });
  res.json({ success: true, data: { headers, mapping, headerRow: headerIdx, contacts: enriched, summary: { total: enriched.length, neu, vorhanden, ohne_email } } });
}));

router.post('/import/apply', ...isStaff, canWrite, wrap(async (req, res) => {
  const q = qFor(req);
  const tenant = req.tenantId || 1;
  const list = (req.body.contacts || []).slice(0, 1000);
  const projectId = Number(req.body.project_id) || null;
  const sendInvite = req.body.send_invite === true;
  if (!list.length) return res.status(400).json({ success: false, error: 'Keine Kontakte übergeben.' });
  if (sendInvite && !can(req.user, 'mail.send')) return res.status(403).json({ success: false, error: 'Keine Berechtigung zum Mailversand.' });
  if (sendInvite && !projectId) return res.status(400).json({ success: false, error: 'Zum Einladen bitte zuerst ein Mandat wählen.' });

  const project = projectId ? await q.get('SELECT * FROM projects WHERE id = ?', [projectId]) : null;
  const outreach = require('../utils/outreach');
  let created = 0, reused = 0, attached = 0, invited = 0, blocked = 0;

  for (const c of list) {
    const email = String(c.email || '').toLowerCase();
    let contact = email
      ? await q.get('SELECT * FROM crm_contacts WHERE lower(email) = ? LIMIT 1', [email])
      : (c.last_name ? await q.get('SELECT * FROM crm_contacts WHERE lower(last_name) = ? LIMIT 1', [String(c.last_name).toLowerCase()]) : null);
    let contactId;
    if (contact) { contactId = contact.id; reused++; }
    else {
      contactId = await q.insert(
        `INSERT INTO crm_contacts (tenant_id, salutation, title, first_name, last_name, email, phone, location, notes,
                                   source, lead_source, lead_ref, consent_status, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'inbound', 'Recherche', ?, 'unknown', ?)`,
        [tenant, c.salutation || null, c.title || null, c.first_name || '', c.last_name || (email ? email.split('@')[0] : 'Kontakt'),
         email || null, c.phone || null, c.location || null, c.notes || null, c.source || null, req.user.id]);
      created++;
      if (c.company) {
        const comp = await q.get('SELECT id FROM crm_companies WHERE lower(name) = ? LIMIT 1', [String(c.company).toLowerCase()])
          || { id: await q.insert('INSERT INTO crm_companies (tenant_id, name, created_by) VALUES (?, ?, ?)', [tenant, c.company, req.user.id]) };
        const linked = await q.get('SELECT id FROM crm_company_contacts WHERE company_id = ? AND contact_id = ? LIMIT 1', [comp.id, contactId]).catch(() => null);
        if (!linked) await q.run('INSERT INTO crm_company_contacts (tenant_id, company_id, contact_id) VALUES (?, ?, ?)', [tenant, comp.id, contactId]).catch(() => {});
      }
    }
    if (projectId) {
      const ex = await q.get('SELECT id FROM crm_deal_parties WHERE project_id = ? AND contact_id = ?', [projectId, contactId]);
      if (!ex) {
        await q.insert(
          `INSERT INTO crm_deal_parties (tenant_id, project_id, contact_id, party_role, funnel_stage, party_status, source, created_by)
           VALUES (?, ?, ?, 'buyer', 0, 'open', 'import', ?)`, [tenant, projectId, contactId, req.user.id]);
        attached++;
      }
    }
    if (sendInvite && project) {
      const fresh = await q.get('SELECT consent_status, contact_status FROM crm_contacts WHERE id = ?', [contactId]);
      if (fresh && (fresh.consent_status === 'opt_out' || fresh.contact_status === 'do_not_contact')) { blocked++; }
      else {
        const r = await outreach.sendFirstApproach(q, { tenant, contactId, projectId, actorId: req.user.id, inviter: req.user });
        if (r && r.sent) invited++;
      }
    }
  }
  db.auditLog(req.user.id, 'CRM_LIST_IMPORT', 'crm_contact', null,
    `${created} neu, ${reused} vorhanden${projectId ? ` · Mandat #${projectId}` : ''}${sendInvite ? ` · ${invited} eingeladen` : ''}`, req.ip);
  res.json({ success: true, data: { created, reused, attached, invited, blocked } });
}));

// Verkäufer/Mandant zur Plattform einladen (sieht danach den Prozessstand)
router.post('/deals/:projectId/invite-seller', ...isStaff, canSend, wrap(async (req, res) => {
  const contactId = Number(req.body.contact_id);
  const projectId = Number(req.params.projectId);
  if (!contactId) return res.status(400).json({ success: false, error: 'contact_id fehlt' });
  const r = await require('../utils/outreach').sendSellerInvite(qFor(req), {
    tenant: req.tenantId || 1, contactId, projectId, actorId: req.user.id, inviter: req.user,
  });
  if (r.sent) db.auditLog(req.user.id, 'CRM_SELLER_INVITE', 'crm_contact', contactId, `Mandat #${projectId}`, req.ip);
  res.json({ success: true, data: r });
}));

router.post('/deals/:projectId/parties', ...isStaff, canWrite, wrap(async (req, res) => {
  const contactId = Number(req.body.contact_id);
  if (!contactId) return res.status(400).json({ success: false, error: 'contact_id fehlt' });
  const dup = await scoped(req, (t) => t.get(
    'SELECT id FROM crm_deal_parties WHERE project_id = ? AND contact_id = ?', [req.params.projectId, contactId]));
  if (dup) return res.status(409).json({ success: false, error: 'Kontakt ist diesem Mandat bereits zugeordnet.' });

  const role = PARTY_ROLES.includes(req.body.party_role) ? req.body.party_role : 'buyer';
  const stage = Number.isInteger(Number(req.body.funnel_stage)) ? Number(req.body.funnel_stage) : 0;
  const id = await scoped(req, (t) => t.insert(`
    INSERT INTO crm_deal_parties (tenant_id, project_id, company_id, contact_id, party_role, funnel_stage, party_status, created_by)
    VALUES (?, ?, ?, ?, ?, ?, 'open', ?)`,
    [req.tenantId || 1, req.params.projectId, req.body.company_id || null, contactId, role, stage, req.user.id]));
  db.auditLog(req.user.id, 'CRM_PARTY_ADDED', 'project', req.params.projectId, `Kontakt #${contactId} (${role})`, req.ip);
  res.status(201).json({ success: true, data: { id } });
}));

// Stufe/Status ändern (Drag & Drop): Verweildauer wird bei Stufenwechsel neu gestartet
router.put('/parties/:id', ...isStaff, canWrite, wrap(async (req, res) => {
  const party = await scoped(req, (t) => t.get('SELECT * FROM crm_deal_parties WHERE id = ?', [req.params.id]));
  if (!party) return res.status(404).json({ success: false, error: 'Eintrag nicht gefunden' });

  const sets = []; const params = [];
  if (req.body.funnel_stage !== undefined) {
    const stage = Number(req.body.funnel_stage);
    if (!FUNNEL_STAGES.some(s => s.key === stage)) return res.status(400).json({ success: false, error: 'Ungültige Funnel-Stufe' });
    sets.push('funnel_stage = ?'); params.push(stage);
    if (stage !== party.funnel_stage) { sets.push('stage_changed_at = now()'); }
  }
  if (req.body.party_status !== undefined) {
    if (!PARTY_STATUS.includes(req.body.party_status)) return res.status(400).json({ success: false, error: 'Ungültiger Status' });
    sets.push('party_status = ?'); params.push(req.body.party_status);
  }
  if (req.body.party_role !== undefined && PARTY_ROLES.includes(req.body.party_role)) { sets.push('party_role = ?'); params.push(req.body.party_role); }
  for (const f of ['next_step', 'notes']) {
    if (req.body[f] !== undefined) { sets.push(`${f} = ?`); params.push(req.body[f] || null); }
  }
  // Manuelle NDA-Angabe (kein / angefragt / liegt vor)
  if (req.body.nda_status !== undefined) {
    const v = req.body.nda_status;
    if (![null, '', 'open', 'signed'].includes(v)) return res.status(400).json({ success: false, error: 'Ungültiger NDA-Status' });
    sets.push('nda_status = ?'); params.push(v || null);
    sets.push('nda_signed_at = ?'); params.push(v === 'signed' ? new Date() : null);
  }
  // Zugang zum Mandat (Unterlagen/Datenraum) manuell setzen
  if (req.body.access_granted !== undefined) {
    sets.push('access_granted = ?'); params.push(req.body.access_granted ? 1 : 0);
  }
  // Namensnennung (Demasking): Klarname für diesen Käufer bewusst freigeben.
  let identityChange = null;
  if (req.body.identity_revealed !== undefined) {
    const on = !!req.body.identity_revealed;
    sets.push('identity_revealed = ?'); params.push(on ? 1 : 0);
    sets.push('identity_revealed_at = ?'); params.push(on ? new Date() : null);
    sets.push('identity_revealed_by = ?'); params.push(on ? req.user.id : null);
    identityChange = on ? 'freigegeben' : 'zurückgenommen';
  }
  if (!sets.length) return res.json({ success: true, data: { message: 'Nichts zu ändern' } });

  params.push(req.params.id);
  await scoped(req, (t) => t.run(`UPDATE crm_deal_parties SET ${sets.join(', ')} WHERE id = ?`, params));
  db.auditLog(req.user.id, 'CRM_PARTY_UPDATED', 'project', party.project_id, `Eintrag #${req.params.id}`, req.ip);
  if (identityChange) {
    db.auditLog(req.user.id, 'CRM_IDENTITY_REVEALED', 'project', party.project_id, `Namensnennung ${identityChange} (Eintrag #${req.params.id})`, req.ip);
  }
  res.json({ success: true, data: { message: 'Gespeichert' } });
}));

router.delete('/parties/:id', ...isStaff, canDelete, wrap(async (req, res) => {
  await scoped(req, (t) => t.run('DELETE FROM crm_deal_parties WHERE id = ?', [req.params.id]));
  res.json({ success: true, data: { message: 'Entfernt' } });
}));

// ═══════════════════════════════════════════════════════════════════════════
// DSGVO-konforme Plattform-Einladung von CRM-Kontakten (DOUBLE-OPT-IN)
//
// Bestandskontakte aus dem Mailverkehr haben KEINE Einwilligung für die
// Plattform-Ansprache. Deshalb: Einladung → Empfänger bestätigt die Einwilligung
// aktiv (Nachweis: Zeitpunkt, IP, Text-Version) → erst DANN Kontoanlage.
// Wer widerspricht oder auf „nicht kontaktieren" steht, wird nie angeschrieben.
// ═══════════════════════════════════════════════════════════════════════════
const CONSENT_TEXT_VERSION = '2026-07-v1';
const INVITE_DAYS = 21;

async function createInvite(req, contact) {
  const crypto = require('crypto');
  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + INVITE_DAYS * 24 * 3600 * 1000);
  const id = await scoped(req, (t) => t.insert(`
    INSERT INTO crm_invitations (tenant_id, contact_id, email, token, message, invited_by, expires_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [req.tenantId || 1, contact.id, contact.email, token, req.body.message || null, req.user.id, expires]));

  // Text kommt aus der Vorlage „crm_invite" (im Admin änderbar)
  const tpl = await scoped(req, (t) => t.get(`SELECT * FROM mail_templates WHERE key = 'crm_invite' AND is_active = 1`)).catch(() => null);
  const meta = { type: 'invite', templateKey: 'crm_invite', contactId: contact.id, actorId: req.user.id, tenantId: req.tenantId || 1 };

  if (tpl) {
    const mtl = require('../utils/mailTemplates');
    const { sendCampaignEmail } = require('../utils/email');
    const mail = mtl.buildFromTemplate({
      template: tpl, contact, project: {}, inviter: req.user,
      inviteToken: token, withFacts: false,
    });
    // Persönliche Ergänzung des Beraters (optional) direkt unter den Text stellen
    if (req.body.message) {
      mail.bodyHtml += `<p style="background:#F4F8FC;border-left:3px solid #5B8FC9;padding:10px 14px;font-size:13.5px;color:#333;">${String(req.body.message).replace(/</g, '&lt;')}</p>`;
    }
    mail.ctaPath = `/einwilligung?token=${token}`;
    sendCampaignEmail({ ...mail, meta }).catch(() => {});
  } else {
    const { sendProcessUpdateEmail } = require('../utils/email');
    const inviter = [req.user.title, req.user.first_name, req.user.last_name].filter(Boolean).join(' ');
    sendProcessUpdateEmail({
      to: contact.email, firstName: contact.first_name || '', person: contact,
      title: 'Einladung zu CapitalMatch: Ihre Bestätigung erforderlich',
      message:
        `<strong>${inviter}</strong> (Phalanx GmbH) lädt Sie zu <strong>CapitalMatch</strong> ein. ` +
        `<br/><br/><strong>Wichtig (DSGVO):</strong> Wir legen kein Konto für Sie an, solange Sie nicht ausdrücklich zustimmen.`,
      ctaLabel: 'Einwilligung bestätigen', ctaPath: `/einwilligung?token=${token}`,
      meta,
    }).catch(() => {});
  }

  db.auditLog(req.user.id, 'CRM_INVITE_SENT', 'crm_contact', contact.id, contact.email, req.ip);
  return id;
}

// Einzelne Einladung
router.post('/contacts/:id/invite', ...isStaff, canSend, wrap(async (req, res) => {
  const contact = await scoped(req, (t) => t.get('SELECT * FROM crm_contacts WHERE id = ?', [req.params.id]));
  if (!contact) return res.status(404).json({ success: false, error: 'Kontakt nicht gefunden' });
  if (!contact.email) return res.status(400).json({ success: false, error: 'Kontakt hat keine E-Mail-Adresse.' });
  if (contact.contact_status === 'do_not_contact' || contact.consent_status === 'opt_out') {
    return res.status(403).json({ success: false, error: 'Dieser Kontakt hat der Kontaktaufnahme widersprochen.' });
  }
  const open = await scoped(req, (t) => t.get(
    `SELECT id FROM crm_invitations WHERE contact_id = ? AND status IN ('invited','opened','consented')`, [contact.id]));
  if (open) return res.status(409).json({ success: false, error: 'Für diesen Kontakt läuft bereits eine Einladung.' });

  const id = await createInvite(req, contact);
  res.status(201).json({ success: true, data: { id } });
}));

// Sammel-Einladung (bewusst limitiert: kein Massenversand aus Versehen)
router.post('/invite/bulk', ...isStaff, canSend, wrap(async (req, res) => {
  const ids = (req.body.contact_ids || []).slice(0, 50).map(Number).filter(Boolean);
  if (!ids.length) return res.status(400).json({ success: false, error: 'Keine Kontakte ausgewählt' });

  const sent = [], blocked = [], already = [];
  for (const cid of ids) {
    const contact = await scoped(req, (t) => t.get('SELECT * FROM crm_contacts WHERE id = ?', [cid]));
    if (!contact || !contact.email) { blocked.push({ id: cid, reason: 'keine E-Mail' }); continue; }
    if (contact.contact_status === 'do_not_contact' || contact.consent_status === 'opt_out') {
      blocked.push({ id: cid, email: contact.email, reason: 'Widerspruch' }); continue;
    }
    const open = await scoped(req, (t) => t.get(
      `SELECT id FROM crm_invitations WHERE contact_id = ? AND status IN ('invited','opened','consented','registered')`, [cid]));
    if (open) { already.push({ id: cid, email: contact.email }); continue; }
    await createInvite(req, contact);
    sent.push({ id: cid, email: contact.email });
  }
  res.json({ success: true, data: { sent: sent.length, blocked: blocked.length, already: already.length, details: { sent, blocked, already } } });
}));

// Einladungs-Übersicht (Funnel)
router.get('/invitations', ...isStaff, wrap(async (req, res) => {
  const rows = await scoped(req, (t) => t.all(`
    SELECT i.*, k.first_name, k.last_name
    FROM crm_invitations i LEFT JOIN crm_contacts k ON k.id = i.contact_id
    ORDER BY i.invited_at DESC LIMIT 300`));
  const now = Date.now();
  const list = rows.map(i => ({
    ...i,
    status: (i.expires_at && new Date(i.expires_at).getTime() < now && ['invited', 'opened'].includes(i.status)) ? 'expired' : i.status,
  }));
  const funnel = {};
  for (const s of ['invited', 'opened', 'consented', 'registered', 'declined', 'expired', 'revoked']) {
    funnel[s] = list.filter(i => i.status === s).length;
  }
  res.json({ success: true, data: { invitations: list, funnel } });
}));

// ── Öffentlich: Einwilligungsseite (Double-Opt-in) ──────────────────────────
router.get('/invite/:token', wrap(async (req, res) => {
  const inv = await db.get('SELECT * FROM crm_invitations WHERE token = ?', [req.params.token]);
  if (!inv) return res.status(404).json({ success: false, error: 'Einladung nicht gefunden' });
  const expired = inv.expires_at && new Date(inv.expires_at).getTime() < Date.now();
  if (inv.status === 'invited' && !expired) {
    await db.run(`UPDATE crm_invitations SET status = 'opened', opened_at = now() WHERE id = ?`, [inv.id]).catch(() => {});
  }
  const contact = inv.contact_id ? await db.get('SELECT first_name, last_name FROM crm_contacts WHERE id = ?', [inv.contact_id]) : null;
  const inviter = await db.get('SELECT first_name, last_name, company FROM users WHERE id = ?', [inv.invited_by]);
  const account = await db.get('SELECT id FROM users WHERE lower(email) = ?', [String(inv.email).toLowerCase()]);
  res.json({
    success: true,
    data: {
      status: expired && ['invited', 'opened'].includes(inv.status) ? 'expired' : (inv.status === 'invited' ? 'opened' : inv.status),
      email: inv.email,
      name: contact ? [contact.first_name, contact.last_name].filter(Boolean).join(' ') : null,
      message: inv.message,
      inviter: inviter ? `${inviter.first_name} ${inviter.last_name}${inviter.company ? ' · ' + inviter.company : ''}` : 'Phalanx GmbH',
      consent_version: CONSENT_TEXT_VERSION,
      has_account: !!account,
      expires_at: inv.expires_at,
    },
  });
}));

// Einwilligung erteilen (Double-Opt-in): mit Nachweis
router.post('/invite/:token/consent', wrap(async (req, res) => {
  const inv = await db.get('SELECT * FROM crm_invitations WHERE token = ?', [req.params.token]);
  if (!inv) return res.status(404).json({ success: false, error: 'Einladung nicht gefunden' });
  if (['declined', 'revoked'].includes(inv.status)) return res.status(400).json({ success: false, error: 'Diese Einladung ist nicht mehr gültig.' });
  if (inv.expires_at && new Date(inv.expires_at).getTime() < Date.now()) {
    return res.status(400).json({ success: false, error: 'Diese Einladung ist abgelaufen.' });
  }
  if (req.body.accepted !== true) return res.status(400).json({ success: false, error: 'Bitte bestätigen Sie die Einwilligung.' });

  const ip = req.ip;
  await db.run(
    `UPDATE crm_invitations SET status = 'consented', consent_at = now(), consent_ip = ?, consent_text_version = ? WHERE id = ?`,
    [ip, CONSENT_TEXT_VERSION, inv.id]);
  if (inv.contact_id) {
    await db.run(
      `UPDATE crm_contacts SET consent_status = 'opt_in', consent_at = now(), updated_at = now() WHERE id = ?`,
      [inv.contact_id]).catch(() => {});
  }
  db.auditLog(null, 'CRM_CONSENT_GIVEN', 'crm_contact', inv.contact_id, `${inv.email} · ${CONSENT_TEXT_VERSION} · IP ${ip}`, ip);
  res.json({ success: true, data: { status: 'consented' } });
}));

// Widerspruch: Kontakt wird dauerhaft auf „nicht kontaktieren" gesetzt
router.post('/invite/:token/decline', wrap(async (req, res) => {
  const inv = await db.get('SELECT * FROM crm_invitations WHERE token = ?', [req.params.token]);
  if (!inv) return res.status(404).json({ success: false, error: 'Einladung nicht gefunden' });
  await db.run(`UPDATE crm_invitations SET status = 'declined' WHERE id = ?`, [inv.id]);
  if (inv.contact_id) {
    await db.run(
      `UPDATE crm_contacts SET consent_status = 'opt_out', contact_status = 'do_not_contact', updated_at = now() WHERE id = ?`,
      [inv.contact_id]).catch(() => {});
  }
  db.auditLog(null, 'CRM_CONSENT_DECLINED', 'crm_contact', inv.contact_id, inv.email, req.ip);
  res.json({ success: true, data: { message: 'Ihr Widerspruch wurde vermerkt. Wir kontaktieren Sie nicht erneut.' } });
}));

// Konto anlegen: NUR nach erteilter Einwilligung (Double-Opt-in erfüllt)
router.post('/invite/:token/register', wrap(async (req, res) => {
  const inv = await db.get('SELECT * FROM crm_invitations WHERE token = ?', [req.params.token]);
  if (!inv) return res.status(404).json({ success: false, error: 'Einladung nicht gefunden' });
  if (inv.status !== 'consented') {
    return res.status(403).json({ success: false, error: 'Bitte bestätigen Sie zuerst Ihre Einwilligung.' });
  }
  const existing = await db.get('SELECT id FROM users WHERE lower(email) = ?', [String(inv.email).toLowerCase()]);
  if (existing) return res.status(409).json({ success: false, error: 'Für diese E-Mail besteht bereits ein Konto. Bitte melden Sie sich an.' });

  const { password, first_name, last_name, salutation, title, company, position, mobile } = req.body;
  if (!password || String(password).length < 8) return res.status(400).json({ success: false, error: 'Passwort muss mindestens 8 Zeichen haben' });
  if (!first_name || !last_name) return res.status(400).json({ success: false, error: 'Bitte Vor- und Nachnamen angeben' });
  if (!['Herr', 'Frau', 'Divers'].includes(salutation)) return res.status(400).json({ success: false, error: 'Bitte wählen Sie eine Anrede' });
  if (!mobile || String(mobile).trim().length < 6) return res.status(400).json({ success: false, error: 'Bitte geben Sie eine Mobilnummer an' });

  // Rolle aus der Deal-Partei ableiten: Ist der Kontakt Verkäufer/Mandant dieses
  // Mandats, wird er als „seller" angelegt (bekommt Zugang zum Prozessstand, keine
  // Käufer-Automatik). Sonst „buyer".
  let role = 'buyer';
  if (inv.project_id && inv.contact_id) {
    const party = await db.get(`SELECT party_role FROM crm_deal_parties WHERE project_id = ? AND contact_id = ?`, [inv.project_id, inv.contact_id]).catch(() => null);
    if (party && party.party_role === 'seller') role = 'seller';
  }

  const bcrypt = require('bcryptjs');
  const jwt = require('jsonwebtoken');
  const password_hash = bcrypt.hashSync(String(password), 10);
  // Einwilligung + Token belegen die E-Mail-Adresse → direkt freigeschaltet & verifiziert
  const userId = await db.insert(`
    INSERT INTO users (tenant_id, email, password_hash, role, salutation, title, first_name, last_name, company, position, mobile,
                       is_approved, is_active, email_verified, privacy_consent_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, 1, now())`,
    [inv.tenant_id || 1, String(inv.email).toLowerCase(), password_hash, role, salutation, title || null,
     first_name, last_name, company || null, position || null, mobile]);
  if (role === 'buyer') {
    await db.run(`INSERT INTO buyer_profiles (tenant_id, user_id, industries, regions, deal_types) VALUES (?, ?, '[]', '[]', '[]')`,
      [inv.tenant_id || 1, userId]).catch(() => {});
  }

  await db.run(`UPDATE crm_invitations SET status = 'registered', registered_at = now(), user_id = ? WHERE id = ?`, [userId, inv.id]);
  if (inv.contact_id) await db.run(`UPDATE crm_contacts SET user_id = ? WHERE id = ?`, [userId, inv.contact_id]).catch(() => {});
  db.auditLog(userId, 'REGISTER_VIA_CRM_INVITE', 'user', userId, `${inv.email} · Einwilligung ${inv.consent_text_version}`, req.ip);

  // Automatik nur für Käufer: War die Einladung zu einem Mandat, geht direkt die
  // NDA-Einladung raus. Verkäufer bekommen keine NDA, sondern Zugang zum Prozessstand.
  if (inv.project_id && role === 'buyer') {
    require('../utils/outreach').sendNdaInviteAfterRegister(db, { userId, projectId: inv.project_id }).catch(() => {});
  }

  const token = jwt.sign({ userId }, process.env.JWT_SECRET || 'phalanx-secret', { expiresIn: '7d' });
  const user = await db.get('SELECT id, email, role, salutation, title, first_name, last_name, company FROM users WHERE id = ?', [userId]);
  res.status(201).json({ success: true, data: { token, user } });
}));

// ═══════════════════════════════════════════════════════════════════════════
// CRM IV: Kontakt-Selbstpflege-Portal
//
// Der Kontakt bekommt einen persönlichen, befristeten Link und pflegt seine
// Daten selbst. Jede Änderung wird protokolliert (Vorher/Nachher). Je nach Link
// wird sie direkt übernommen oder muss intern freigegeben werden. Abmeldung und
// Einschränkung der Kontaktaufnahme sind jederzeit möglich (DSGVO).
// ═══════════════════════════════════════════════════════════════════════════
const PROFILE_DAYS = 60;
// Nur diese Felder darf der Kontakt selbst ändern, nichts anderes.
const SELF_FIELDS = ['salutation', 'title', 'first_name', 'last_name', 'email', 'phone', 'mobile',
  'linkedin_url', 'location', 'responsibility', 'investment_focus', 'comm_preference'];
const SELF_JSON_FIELDS = ['focus_industries', 'focus_regions'];
const SELF_NUM_FIELDS = ['ticket_min', 'ticket_max'];

function pickSelf(contact) {
  const out = {};
  SELF_FIELDS.forEach(f => { out[f] = contact[f] ?? null; });
  SELF_JSON_FIELDS.forEach(f => { out[f] = safeJson(contact[f], []); });
  SELF_NUM_FIELDS.forEach(f => { out[f] = contact[f] ?? null; });
  return out;
}

// Link erzeugen und per Mail versenden.
// Doppelversand-Sperre: Läuft bereits ein aktiver Link, der in den letzten
// PROFILE_RESEND_DAYS Tagen versendet wurde, wird abgelehnt, außer force = true.
const PROFILE_RESEND_DAYS = 14;

async function loadTemplate(req, key) {
  return scoped(req, (t) => t.get(`SELECT * FROM mail_templates WHERE key = ? AND is_active = 1`, [key])).catch(() => null);
}

router.post('/contacts/:id/profile-link', ...isStaff, canSend, wrap(async (req, res) => {
  const contact = await scoped(req, (t) => t.get('SELECT * FROM crm_contacts WHERE id = ?', [req.params.id]));
  if (!contact) return res.status(404).json({ success: false, error: 'Kontakt nicht gefunden' });
  if (!contact.email) return res.status(400).json({ success: false, error: 'Kontakt hat keine E-Mail-Adresse.' });
  if (contact.contact_status === 'do_not_contact' || contact.consent_status === 'opt_out') {
    return res.status(403).json({ success: false, error: 'Dieser Kontakt hat der Kontaktaufnahme widersprochen.' });
  }

  // Schutz vor Mehrfachversand
  const recent = await scoped(req, (t) => t.get(`
    SELECT id, created_at FROM crm_profile_links
     WHERE contact_id = ? AND status = 'active'
       AND created_at > now() - interval '${PROFILE_RESEND_DAYS} days'
     ORDER BY id DESC LIMIT 1`, [contact.id]));
  if (recent && req.body.force !== true) {
    return res.status(409).json({
      success: false,
      code: 'PROFILE_LINK_RECENT',
      error: `Es läuft bereits ein Pflege-Link (versendet am ${new Date(recent.created_at).toLocaleDateString('de-DE')}). ` +
             `Erneut senden ist erst nach ${PROFILE_RESEND_DAYS} Tagen sinnvoll, oder bewusst erzwingen.`,
      data: { last_sent_at: recent.created_at },
    });
  }

  const crypto = require('crypto');
  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + PROFILE_DAYS * 24 * 3600 * 1000);
  // Bestehende aktive Links entwerten (nur ein gültiger Link je Kontakt)
  await scoped(req, (t) => t.run(`UPDATE crm_profile_links SET status = 'revoked' WHERE contact_id = ? AND status = 'active'`, [contact.id])).catch(() => {});
  const id = await scoped(req, (t) => t.insert(`
    INSERT INTO crm_profile_links (tenant_id, contact_id, token, requires_approval, created_by, expires_at)
    VALUES (?, ?, ?, ?, ?, ?)`,
    [req.tenantId || 1, contact.id, token, req.body.requires_approval ? 1 : 0, req.user.id, expires]));

  // Text kommt aus der Vorlage „profile_link" (im Admin änderbar)
  const tpl = await loadTemplate(req, 'profile_link');
  const { sendCampaignEmail, sendProcessUpdateEmail } = require('../utils/email');
  if (tpl) {
    const mtl = require('../utils/mailTemplates');
    sendCampaignEmail({
      ...mtl.buildFromTemplate({
        template: tpl, contact, project: {}, inviter: req.user,
        profileToken: token, withFacts: false,
      }),
      meta: { type: 'profile_link', templateKey: 'profile_link', contactId: contact.id, actorId: req.user.id, tenantId: req.tenantId || 1 },
    }).catch(() => {});
  } else {
    sendProcessUpdateEmail({
      to: contact.email, firstName: contact.first_name || '', person: contact,
      title: 'Ihre Angaben bei der Phalanx GmbH: bitte kurz prüfen',
      message: `damit wir Sie nur mit passenden Transaktionen ansprechen, bitten wir Sie um eine kurze Prüfung Ihrer gespeicherten Angaben. Der Link ist persönlich und ${PROFILE_DAYS} Tage gültig.`,
      ctaLabel: 'Angaben prüfen', ctaPath: `/profil-pflege?token=${token}`,
      meta: { type: 'profile_link', contactId: contact.id, actorId: req.user.id },
    }).catch(() => {});
  }

  db.auditLog(req.user.id, 'CRM_PROFILE_LINK_SENT', 'crm_contact', contact.id,
    `${contact.email}${recent ? ' · erneut (erzwungen)' : ''}`, req.ip);
  res.status(201).json({ success: true, data: { id, expires_at: expires } });
}));

// Sammel-Versand (max. 50)
router.post('/profile-links/bulk', ...isStaff, canSend, wrap(async (req, res) => {
  const ids = (req.body.contact_ids || []).slice(0, 50).map(Number).filter(Boolean);
  let sent = 0, blocked = 0;
  for (const cid of ids) {
    const contact = await scoped(req, (t) => t.get('SELECT * FROM crm_contacts WHERE id = ?', [cid]));
    if (!contact || !contact.email || contact.contact_status === 'do_not_contact' || contact.consent_status === 'opt_out') { blocked++; continue; }
    req.params = { id: String(cid) };   // createProfileLink wiederverwenden wäre unsauber → direkt anlegen
    const crypto = require('crypto');
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + PROFILE_DAYS * 24 * 3600 * 1000);
    await scoped(req, (t) => t.run(`UPDATE crm_profile_links SET status = 'revoked' WHERE contact_id = ? AND status = 'active'`, [cid])).catch(() => {});
    await scoped(req, (t) => t.insert(`
      INSERT INTO crm_profile_links (tenant_id, contact_id, token, requires_approval, created_by, expires_at)
      VALUES (?, ?, ?, ?, ?, ?)`,
      [req.tenantId || 1, cid, token, req.body.requires_approval ? 1 : 0, req.user.id, expires]));
    const { sendProcessUpdateEmail } = require('../utils/email');
    sendProcessUpdateEmail({
      to: contact.email, firstName: contact.first_name || '', person: contact,
      title: 'Ihre Angaben bei der Phalanx GmbH: bitte kurz prüfen',
      message: `damit wir Sie nur mit passenden Transaktionen ansprechen, bitten wir Sie um eine kurze Prüfung Ihrer gespeicherten Angaben. Der Link ist persönlich und ${PROFILE_DAYS} Tage gültig.`,
      ctaLabel: 'Angaben prüfen', ctaPath: `/profil-pflege?token=${token}`,
      meta: { type: 'profile_link', contactId: contact.id, actorId: req.user.id },
    }).catch(() => {});
    sent++;
  }
  db.auditLog(req.user.id, 'CRM_PROFILE_LINK_BULK', 'crm_contact', null, `${sent} versendet, ${blocked} übersprungen`, req.ip);
  res.json({ success: true, data: { sent, blocked } });
}));

// ── Öffentlich: Selbstpflege ────────────────────────────────────────────────
async function loadLink(token) {
  const link = await db.get('SELECT * FROM crm_profile_links WHERE token = ?', [token]);
  if (!link) return { error: 'Link nicht gefunden' };
  if (link.status !== 'active') return { error: 'Dieser Link ist nicht mehr gültig.' };
  if (link.expires_at && new Date(link.expires_at).getTime() < Date.now()) {
    await db.run(`UPDATE crm_profile_links SET status = 'expired' WHERE id = ?`, [link.id]).catch(() => {});
    return { error: 'Dieser Link ist abgelaufen. Bitte fordern Sie einen neuen an.' };
  }
  return { link };
}

router.get('/profile/:token', wrap(async (req, res) => {
  const { link, error } = await loadLink(req.params.token);
  if (error) return res.status(404).json({ success: false, error });
  const contact = await db.get('SELECT * FROM crm_contacts WHERE id = ?', [link.contact_id]);
  if (!contact) return res.status(404).json({ success: false, error: 'Kontakt nicht gefunden' });
  await db.run(`UPDATE crm_profile_links SET last_opened_at = now() WHERE id = ?`, [link.id]).catch(() => {});

  const companies = await db.all(`
    SELECT c.name, cc.position FROM crm_company_contacts cc JOIN crm_companies c ON c.id = cc.company_id
    WHERE cc.contact_id = ? AND cc.ended_on IS NULL`, [link.contact_id]).catch(() => []);

  res.json({
    success: true,
    data: {
      profile: pickSelf(contact),
      companies,
      contact_status: contact.contact_status,
      consent_status: contact.consent_status,
      requires_approval: !!link.requires_approval,
      expires_at: link.expires_at,
    },
  });
}));

router.put('/profile/:token', wrap(async (req, res) => {
  const { link, error } = await loadLink(req.params.token);
  if (error) return res.status(404).json({ success: false, error });
  const contact = await db.get('SELECT * FROM crm_contacts WHERE id = ?', [link.contact_id]);
  if (!contact) return res.status(404).json({ success: false, error: 'Kontakt nicht gefunden' });

  // Nur erlaubte Felder übernehmen: alles andere wird ignoriert
  const after = {};
  for (const f of SELF_FIELDS) if (req.body[f] !== undefined) after[f] = req.body[f] || null;
  for (const f of SELF_JSON_FIELDS) if (req.body[f] !== undefined) after[f] = Array.isArray(req.body[f]) ? req.body[f] : [];
  for (const f of SELF_NUM_FIELDS) if (req.body[f] !== undefined) after[f] = req.body[f] === '' || req.body[f] === null ? null : Number(req.body[f]);
  if (after.comm_preference && !['email', 'phone', 'none'].includes(after.comm_preference)) delete after.comm_preference;
  if (!Object.keys(after).length) return res.status(400).json({ success: false, error: 'Keine Änderungen übermittelt.' });

  const before = {};
  for (const f of Object.keys(after)) {
    before[f] = SELF_JSON_FIELDS.includes(f) ? safeJson(contact[f], []) : (contact[f] ?? null);
  }

  const pending = !!link.requires_approval;
  await db.insert(`
    INSERT INTO crm_profile_changes (tenant_id, contact_id, link_id, before_json, after_json, status, ip)
    VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [link.tenant_id || 1, contact.id, link.id, JSON.stringify(before), JSON.stringify(after),
     pending ? 'pending' : 'applied', req.ip]);

  if (!pending) {
    const sets = []; const params = [];
    for (const [f, v] of Object.entries(after)) {
      sets.push(`${f} = ?`);
      params.push(SELF_JSON_FIELDS.includes(f) ? JSON.stringify(v) : v);
    }
    sets.push('profile_updated_at = now()', 'updated_at = now()');
    params.push(contact.id);
    await db.run(`UPDATE crm_contacts SET ${sets.join(', ')} WHERE id = ?`, params);
  }
  await db.run(`UPDATE crm_profile_links SET last_saved_at = now() WHERE id = ?`, [link.id]).catch(() => {});
  db.auditLog(null, pending ? 'CRM_PROFILE_SELF_PENDING' : 'CRM_PROFILE_SELF_UPDATED', 'crm_contact', contact.id,
    `Selbstpflege: ${Object.keys(after).join(', ')}`, req.ip);

  res.json({
    success: true,
    data: {
      status: pending ? 'pending' : 'applied',
      message: pending
        ? 'Vielen Dank! Ihre Änderungen werden von uns geprüft und dann übernommen.'
        : 'Vielen Dank! Ihre Angaben wurden übernommen.',
    },
  });
}));

// Kommunikation einschränken / vollständig abmelden (DSGVO)
router.post('/profile/:token/unsubscribe', wrap(async (req, res) => {
  const { link, error } = await loadLink(req.params.token);
  if (error) return res.status(404).json({ success: false, error });
  const full = req.body.full === true;
  if (full) {
    await db.run(
      `UPDATE crm_contacts SET consent_status = 'opt_out', contact_status = 'do_not_contact', comm_preference = 'none', updated_at = now() WHERE id = ?`,
      [link.contact_id]);
    await db.run(`UPDATE crm_profile_links SET status = 'revoked' WHERE contact_id = ?`, [link.contact_id]).catch(() => {});
  } else {
    await db.run(`UPDATE crm_contacts SET comm_preference = 'none', updated_at = now() WHERE id = ?`, [link.contact_id]);
  }
  db.auditLog(null, full ? 'CRM_PROFILE_OPT_OUT' : 'CRM_PROFILE_COMM_LIMITED', 'crm_contact', link.contact_id, null, req.ip);
  res.json({
    success: true,
    data: {
      message: full
        ? 'Ihr Widerspruch wurde vermerkt. Wir werden Sie nicht mehr kontaktieren.'
        : 'Vermerkt: wir kontaktieren Sie vorerst nicht mehr per E-Mail.',
    },
  });
}));

// ── Intern: Freigabe-Workflow für Selbstpflege-Änderungen ───────────────────
router.get('/profile-changes', ...isStaff, wrap(async (req, res) => {
  const rows = await scoped(req, (t) => t.all(`
    SELECT pc.*, k.first_name, k.last_name, k.email
    FROM crm_profile_changes pc JOIN crm_contacts k ON k.id = pc.contact_id
    WHERE pc.status = 'pending' ORDER BY pc.created_at DESC LIMIT 100`)).catch(() => []);
  res.json({
    success: true,
    data: rows.map(r => ({ ...r, before: safeJson(r.before_json, {}), after: safeJson(r.after_json, {}) })),
  });
}));

router.post('/profile-changes/:id/:action', ...isStaff, wrap(async (req, res) => {
  const action = req.params.action === 'approve' ? 'applied' : req.params.action === 'reject' ? 'rejected' : null;
  if (!action) return res.status(400).json({ success: false, error: 'Ungültige Aktion' });
  const change = await scoped(req, (t) => t.get('SELECT * FROM crm_profile_changes WHERE id = ? AND status = ?', [req.params.id, 'pending']));
  if (!change) return res.status(404).json({ success: false, error: 'Änderung nicht gefunden' });

  if (action === 'applied') {
    const after = safeJson(change.after_json, {});
    const sets = []; const params = [];
    for (const [f, v] of Object.entries(after)) {
      if (![...SELF_FIELDS, ...SELF_JSON_FIELDS, ...SELF_NUM_FIELDS].includes(f)) continue;
      sets.push(`${f} = ?`);
      params.push(SELF_JSON_FIELDS.includes(f) ? JSON.stringify(v) : v);
    }
    if (sets.length) {
      sets.push('profile_updated_at = now()', 'updated_at = now()');
      params.push(change.contact_id);
      await scoped(req, (t) => t.run(`UPDATE crm_contacts SET ${sets.join(', ')} WHERE id = ?`, params));
    }
  }
  await scoped(req, (t) => t.run(
    `UPDATE crm_profile_changes SET status = ?, reviewed_by = ?, reviewed_at = now() WHERE id = ?`,
    [action, req.user.id, req.params.id]));
  db.auditLog(req.user.id, action === 'applied' ? 'CRM_PROFILE_CHANGE_APPROVED' : 'CRM_PROFILE_CHANGE_REJECTED',
    'crm_contact', change.contact_id, null, req.ip);
  res.json({ success: true, data: { status: action } });
}));

// ═══════════════════════════════════════════════════════════════════════════
// CRM III: Mandats-Kampagnen (Massenmailing) + Reminder
//
// Eine Kampagne ist eine Ansprache-Welle zu EINEM Mandat. Je Empfänger wird, 
// falls nötig: ein Einwilligungs-Token (Double-Opt-in) und ein Pflege-Link
// erzeugt; beides steckt in derselben, professionell aufgebauten Mail.
// Wer widersprochen hat, wird niemals angeschrieben.
// ═══════════════════════════════════════════════════════════════════════════
const campaigns = require('../utils/campaigns');

// Empfänger-Vorschau: wer bekommt die Mail: und wer nicht (mit Begründung)
router.post('/deals/:projectId/campaign/preview', ...isStaff, wrap(async (req, res) => {
  const ids = (req.body.contact_ids || []).slice(0, 200).map(Number).filter(Boolean);
  const rows = [];
  for (const cid of ids) {
    const k = await scoped(req, (t) => t.get('SELECT * FROM crm_contacts WHERE id = ?', [cid]));
    if (!k) continue;
    const name = [k.first_name, k.last_name].filter(Boolean).join(' ');
    let skip = null;
    if (!k.email) skip = 'keine E-Mail-Adresse';
    else if (k.contact_status === 'do_not_contact' || k.consent_status === 'opt_out') skip = 'Widerspruch, wird nie angeschrieben';
    rows.push({
      id: cid, name, email: k.email, skip,
      needs_consent: k.consent_status !== 'opt_in',
    });
  }
  res.json({ success: true, data: { recipients: rows, send: rows.filter(r => !r.skip).length, skip: rows.filter(r => r.skip).length } });
}));

// Kampagne versenden
router.post('/deals/:projectId/campaign', ...isStaff, canSend, wrap(async (req, res) => {
  const projectId = Number(req.params.projectId);
  const project = await scoped(req, (t) => t.get('SELECT * FROM projects WHERE id = ?', [projectId]));
  if (!project) return res.status(404).json({ success: false, error: 'Mandat nicht gefunden' });

  const ids = (req.body.contact_ids || []).slice(0, 200).map(Number).filter(Boolean);
  if (!ids.length) return res.status(400).json({ success: false, error: 'Keine Empfänger ausgewählt' });

  const crypto = require('crypto');
  const { sendCampaignEmail } = require('../utils/email');
  const remind = req.body.reminders_enabled === false ? 0 : 1;
  const tenant = req.tenantId || 1;

  const campaignId = await scoped(req, (t) => t.insert(`
    INSERT INTO crm_campaigns (tenant_id, project_id, name, purpose, subject, intro, reminders_enabled, status, created_by, sent_at)
    VALUES (?, ?, ?, 'invite', ?, ?, ?, 'sent', ?, now())`,
    [tenant, projectId, req.body.name || `Ansprache ${project.codename}`,
     req.body.subject || null, req.body.intro || null, remind, req.user.id]));

  const sent = [], skipped = [];
  for (const cid of ids) {
    const k = await scoped(req, (t) => t.get('SELECT * FROM crm_contacts WHERE id = ?', [cid]));
    if (!k || !k.email) { skipped.push({ id: cid, reason: 'keine E-Mail' }); continue; }
    if (k.contact_status === 'do_not_contact' || k.consent_status === 'opt_out') {
      skipped.push({ id: cid, email: k.email, reason: 'Widerspruch' });
      await scoped(req, (t) => t.run(`
        INSERT INTO crm_campaign_recipients (tenant_id, campaign_id, contact_id, email, status, skip_reason)
        VALUES (?, ?, ?, ?, 'skipped', 'Widerspruch') ON CONFLICT (campaign_id, contact_id) DO NOTHING`,
        [tenant, campaignId, cid, k.email])).catch(() => {});
      continue;
    }

    const needsConsent = k.consent_status !== 'opt_in';

    // Einwilligungs-Token: bestehenden offenen Vorgang wiederverwenden, sonst neu
    let inviteId = null, inviteToken = null;
    if (needsConsent) {
      const open = await scoped(req, (t) => t.get(
        `SELECT id, token FROM crm_invitations WHERE contact_id = ? AND status IN ('invited','opened')
          AND (expires_at IS NULL OR expires_at > now()) ORDER BY id DESC LIMIT 1`, [cid]));
      if (open) { inviteId = open.id; inviteToken = open.token; }
      else {
        inviteToken = crypto.randomBytes(32).toString('hex');
        const expires = new Date(Date.now() + INVITE_DAYS * 24 * 3600 * 1000);
        inviteId = await scoped(req, (t) => t.insert(`
          INSERT INTO crm_invitations (tenant_id, contact_id, project_id, email, token, message, invited_by, expires_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [tenant, cid, projectId, k.email, inviteToken, req.body.intro || null, req.user.id, expires]));
      }
    }

    // Pflege-Link (Selbstpflege / Abmeldung): immer beilegen
    let profileId = null, profileToken = null;
    const activeLink = await scoped(req, (t) => t.get(
      `SELECT id, token FROM crm_profile_links WHERE contact_id = ? AND status = 'active'
        AND (expires_at IS NULL OR expires_at > now()) ORDER BY id DESC LIMIT 1`, [cid]));
    if (activeLink) { profileId = activeLink.id; profileToken = activeLink.token; }
    else {
      profileToken = crypto.randomBytes(32).toString('hex');
      const pExp = new Date(Date.now() + PROFILE_DAYS * 24 * 3600 * 1000);
      profileId = await scoped(req, (t) => t.insert(`
        INSERT INTO crm_profile_links (tenant_id, contact_id, token, requires_approval, created_by, expires_at)
        VALUES (?, ?, ?, 0, ?, ?)`, [tenant, cid, profileToken, req.user.id, pExp]));
    }

    sendCampaignEmail({ ...campaigns.buildInviteMail({
      contact: k, project, inviter: req.user,
      intro: req.body.intro, subject: req.body.subject,
      inviteToken, profileToken, needsConsent,
    }), meta: { type: 'campaign', templateKey: 'invite', contactId: cid, projectId, actorId: req.user.id, tenantId: tenant } }).catch(() => {});

    await scoped(req, (t) => t.run(`
      INSERT INTO crm_campaign_recipients (tenant_id, campaign_id, contact_id, email, invitation_id, profile_link_id, status, sent_at)
      VALUES (?, ?, ?, ?, ?, ?, 'sent', now())
      ON CONFLICT (campaign_id, contact_id) DO NOTHING`,
      [tenant, campaignId, cid, k.email, inviteId, profileId])).catch(() => {});

    // Funnel mitziehen: „angesprochen" ist mindestens Stufe 1
    await scoped(req, (t) => t.run(`
      UPDATE crm_deal_parties
         SET mails_sent = COALESCE(mails_sent,0) + 1,
             last_contact = CURRENT_DATE,
             first_contact = COALESCE(first_contact, CURRENT_DATE),
             funnel_stage = GREATEST(funnel_stage, 1),
             stage_changed_at = CASE WHEN funnel_stage < 1 THEN now() ELSE stage_changed_at END
       WHERE project_id = ? AND contact_id = ?`, [projectId, cid])).catch(() => {});

    sent.push({ id: cid, email: k.email });
  }

  db.auditLog(req.user.id, 'CRM_CAMPAIGN_SENT', 'project', projectId,
    `Kampagne #${campaignId} · ${sent.length} versendet · ${skipped.length} übersprungen · Reminder ${remind ? 'an' : 'aus'}`, req.ip);
  res.status(201).json({
    success: true,
    data: { campaign_id: campaignId, sent: sent.length, skipped: skipped.length, details: { sent, skipped } },
  });
}));

// Kampagnen eines Mandats (mit Reaktionsquote)
router.get('/deals/:projectId/campaigns', ...isStaff, wrap(async (req, res) => {
  const rows = await scoped(req, (t) => t.all(`
    SELECT c.*,
           (SELECT COUNT(*)::int FROM crm_campaign_recipients r WHERE r.campaign_id = c.id) AS recipients,
           (SELECT COUNT(*)::int FROM crm_campaign_recipients r WHERE r.campaign_id = c.id AND r.status = 'responded') AS responded,
           (SELECT COUNT(*)::int FROM crm_campaign_recipients r WHERE r.campaign_id = c.id AND r.reminder_count > 0) AS reminded,
           (SELECT COUNT(*)::int FROM crm_campaign_recipients r WHERE r.campaign_id = c.id AND r.status = 'no_response') AS no_response,
           (SELECT COUNT(*)::int FROM crm_campaign_recipients r WHERE r.campaign_id = c.id AND r.status = 'skipped') AS skipped
    FROM crm_campaigns c WHERE c.project_id = ? ORDER BY c.created_at DESC LIMIT 50`, [req.params.projectId]));
  res.json({ success: true, data: { campaigns: rows, reminder_days: campaigns.REMINDER_DAYS } });
}));

// Wer hat auf ein Mailing reagiert? Empfängerliste mit Namen und Status.
router.get('/campaigns/:id/recipients', ...isStaff, wrap(async (req, res) => {
  const rows = await scoped(req, (t) => t.all(`
    SELECT r.status, r.reminder_count, r.responded_at, r.sent_at, r.skip_reason, r.email,
           k.id AS contact_id, k.salutation, k.title, k.first_name, k.last_name,
           (SELECT c.name FROM crm_company_contacts cc JOIN crm_companies c ON c.id = cc.company_id
             WHERE cc.contact_id = k.id AND cc.ended_on IS NULL LIMIT 1) AS company_name
    FROM crm_campaign_recipients r
    LEFT JOIN crm_contacts k ON k.id = r.contact_id
    WHERE r.campaign_id = ?
    ORDER BY (r.status = 'responded') DESC, r.reminder_count DESC, k.last_name NULLS LAST`, [req.params.id]));
  res.json({ success: true, data: { recipients: rows } });
}));

// Reminder-Automatik einer Kampagne an-/abschalten
router.put('/campaigns/:id', ...isStaff, wrap(async (req, res) => {
  await scoped(req, (t) => t.run(`UPDATE crm_campaigns SET reminders_enabled = ? WHERE id = ?`,
    [req.body.reminders_enabled ? 1 : 0, req.params.id]));
  db.auditLog(req.user.id, 'CRM_CAMPAIGN_UPDATED', 'crm_campaign', req.params.id,
    `Reminder ${req.body.reminders_enabled ? 'aktiviert' : 'deaktiviert'}`, req.ip);
  res.json({ success: true, data: { message: 'Kampagne aktualisiert' } });
}));

// Fällige Reminder sofort laufen lassen (sonst stündlich automatisch)
router.post('/campaigns/run-reminders', ...isStaff, wrap(async (req, res) => {
  const n = await campaigns.runReminders();
  res.json({ success: true, data: { sent: n } });
}));

// Projekt-Update manuell an die aktiven, eingewilligten Beteiligten senden
router.post('/deals/:projectId/update-mail', ...isStaff, canSend, wrap(async (req, res) => {
  const note = String(req.body.note || '').trim();
  if (note.length < 10) return res.status(400).json({ success: false, error: 'Bitte formulieren Sie die Aktualisierung (mind. 10 Zeichen).' });
  const r = await campaigns.notifyProjectChange(req.params.projectId, [], { actorId: req.user.id, note, force: true });
  res.json({ success: true, data: r });
}));

// Wer würde ein Projekt-Update erhalten?
router.get('/deals/:projectId/active-participants', ...isStaff, wrap(async (req, res) => {
  const rows = await campaigns.activeParticipants(req.params.projectId);
  res.json({ success: true, data: { participants: rows.map(r => ({ contact_id: r.contact_id, name: [r.first_name, r.last_name].filter(Boolean).join(' '), email: r.email })) } });
}));

// ═══════════════════════════════════════════════════════════════════════════
// Sprint 22: Prozess-Mailvorlagen
//
// Je Prozessschritt eine Vorlage (Wiederaufnahme, Erstansprache, NDA, IM,
// Gespräch, LOI, DD, Absage). Versand an einen einzelnen Kontakt oder an eine
// Auswahl. Vorlagen sind im Admin einsehbar und änderbar; der Text lässt sich
// zusätzlich pro Versand einmalig anpassen, ohne die Vorlage zu überschreiben.
// ═══════════════════════════════════════════════════════════════════════════
const mt = require('../utils/mailTemplates');

router.get('/templates', ...isStaff, wrap(async (req, res) => {
  const rows = await scoped(req, (t) => t.all(
    `SELECT * FROM mail_templates ORDER BY sort, name`));
  res.json({ success: true, data: { templates: rows, placeholders: mt.PLACEHOLDERS, stages: FUNNEL_STAGES } });
}));

router.post('/templates', ...isStaff, canTemplates, wrap(async (req, res) => {
  const { name, subject, body } = req.body;
  if (!name || !subject || !body) return res.status(400).json({ success: false, error: 'Name, Betreff und Text sind Pflicht.' });
  const key = 'custom_' + Date.now();
  const id = await scoped(req, (t) => t.insert(`
    INSERT INTO mail_templates (tenant_id, key, name, stage, subject, body, cta_label, cta_target, is_system, sort, updated_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 500, ?)`,
    [req.tenantId || 1, key, name, req.body.stage ?? null, subject, body,
     req.body.cta_label || null, mt.CTA_TARGETS.includes(req.body.cta_target) ? req.body.cta_target : 'project', req.user.id]));
  db.auditLog(req.user.id, 'TEMPLATE_CREATED', 'mail_template', id, name, req.ip);
  res.status(201).json({ success: true, data: { id, key } });
}));

router.put('/templates/:id', ...isStaff, canTemplates, wrap(async (req, res) => {
  const tpl = await scoped(req, (t) => t.get('SELECT * FROM mail_templates WHERE id = ?', [req.params.id]));
  if (!tpl) return res.status(404).json({ success: false, error: 'Vorlage nicht gefunden' });
  const target = mt.CTA_TARGETS.includes(req.body.cta_target) ? req.body.cta_target : tpl.cta_target;
  await scoped(req, (t) => t.run(`
    UPDATE mail_templates SET
      name = COALESCE(?, name), subject = COALESCE(?, subject), body = COALESCE(?, body),
      cta_label = ?, cta_target = ?, stage = ?, is_active = ?, updated_by = ?, updated_at = now()
    WHERE id = ?`,
    [req.body.name || null, req.body.subject || null, req.body.body || null,
     req.body.cta_label ?? tpl.cta_label, target,
     req.body.stage === undefined ? tpl.stage : req.body.stage,
     req.body.is_active === false ? 0 : 1, req.user.id, req.params.id]));
  db.auditLog(req.user.id, 'TEMPLATE_UPDATED', 'mail_template', req.params.id, tpl.name, req.ip);
  res.json({ success: true, data: { message: 'Vorlage gespeichert' } });
}));

router.delete('/templates/:id', ...isStaff, canTemplates, wrap(async (req, res) => {
  const tpl = await scoped(req, (t) => t.get('SELECT * FROM mail_templates WHERE id = ?', [req.params.id]));
  if (!tpl) return res.status(404).json({ success: false, error: 'Vorlage nicht gefunden' });
  if (tpl.is_system === 1) {
    return res.status(403).json({ success: false, error: 'Systemvorlagen können deaktiviert, aber nicht gelöscht werden.' });
  }
  await scoped(req, (t) => t.run('DELETE FROM mail_templates WHERE id = ?', [req.params.id]));
  db.auditLog(req.user.id, 'TEMPLATE_DELETED', 'mail_template', req.params.id, tpl.name, req.ip);
  res.json({ success: true, data: { message: 'Vorlage gelöscht' } });
}));

// Vorschau: exakt die Mail, die rausginge: mit echten Daten des ersten Empfängers
router.post('/templates/:id/preview', ...isStaff, wrap(async (req, res) => {
  const tpl = await scoped(req, (t) => t.get('SELECT * FROM mail_templates WHERE id = ?', [req.params.id]));
  if (!tpl) return res.status(404).json({ success: false, error: 'Vorlage nicht gefunden' });

  const contact = req.body.contact_id
    ? await scoped(req, (t) => t.get(`
        SELECT k.*, (SELECT c.name FROM crm_company_contacts cc JOIN crm_companies c ON c.id = cc.company_id
                      WHERE cc.contact_id = k.id AND cc.ended_on IS NULL LIMIT 1) AS company_name
        FROM crm_contacts k WHERE k.id = ?`, [req.body.contact_id]))
    : { salutation: 'Herr', last_name: 'Mustermann', first_name: 'Max', email: 'max@beispiel.de', company_name: 'Beispiel GmbH' };
  const project = req.body.project_id
    ? await scoped(req, (t) => t.get('SELECT * FROM projects WHERE id = ?', [req.body.project_id]))
    : { id: 0, codename: 'MANDAT', industry: 'Branche', region: 'Region', revenue_band: 'k. A.', ebitda_band: 'k. A.', deal_type: 'Nachfolge' };

  const mail = mt.buildFromTemplate({
    template: tpl, contact: contact || {}, project: project || {}, inviter: req.user,
    inviteToken: 'VORSCHAU', profileToken: 'VORSCHAU', frist: req.body.frist,
    overrideSubject: req.body.subject, overrideBody: req.body.body,
  });
  res.json({ success: true, data: { subject: mail.subject, body: mail.previewText, salutation: mail.salutation, cta: mail.ctaLabel, to: mail.to } });
}));

// Versand einer Vorlage an einen oder mehrere Kontakte eines Mandats
router.post('/deals/:projectId/send-template', ...isStaff, canSend, wrap(async (req, res) => {
  const projectId = Number(req.params.projectId);
  const project = await scoped(req, (t) => t.get('SELECT * FROM projects WHERE id = ?', [projectId]));
  if (!project) return res.status(404).json({ success: false, error: 'Mandat nicht gefunden' });

  const tpl = await scoped(req, (t) => t.get('SELECT * FROM mail_templates WHERE id = ?', [req.body.template_id]));
  if (!tpl) return res.status(404).json({ success: false, error: 'Vorlage nicht gefunden' });

  const ids = (req.body.contact_ids || []).slice(0, 200).map(Number).filter(Boolean);
  if (!ids.length) return res.status(400).json({ success: false, error: 'Keine Empfänger ausgewählt' });

  const crypto = require('crypto');
  const { sendCampaignEmail } = require('../utils/email');
  const tenant = req.tenantId || 1;
  const remind = req.body.reminders_enabled === true ? 1 : 0;   // bei Vorlagen standardmäßig AUS
  const advance = req.body.advance_stage === true;

  const campaignId = await scoped(req, (t) => t.insert(`
    INSERT INTO crm_campaigns (tenant_id, project_id, name, purpose, subject, intro, reminders_enabled, status, created_by, sent_at, template_key)
    VALUES (?, ?, ?, 'invite', ?, ?, ?, 'sent', ?, now(), ?)`,
    [tenant, projectId, `${tpl.name}: ${project.codename}`,
     req.body.subject || tpl.subject, req.body.body || null, remind, req.user.id, tpl.key]));

  const sent = [], skipped = [];
  for (const cid of ids) {
    const k = await scoped(req, (t) => t.get(`
      SELECT k.*, (SELECT c.name FROM crm_company_contacts cc JOIN crm_companies c ON c.id = cc.company_id
                    WHERE cc.contact_id = k.id AND cc.ended_on IS NULL LIMIT 1) AS company_name
      FROM crm_contacts k WHERE k.id = ?`, [cid]));
    if (!k || !k.email) { skipped.push({ id: cid, reason: 'keine E-Mail' }); continue; }
    if (k.contact_status === 'do_not_contact' || k.consent_status === 'opt_out') {
      skipped.push({ id: cid, email: k.email, reason: 'Widerspruch' });
      await scoped(req, (t) => t.run(`
        INSERT INTO crm_campaign_recipients (tenant_id, campaign_id, contact_id, email, status, skip_reason)
        VALUES (?, ?, ?, ?, 'skipped', 'Widerspruch') ON CONFLICT (campaign_id, contact_id) DO NOTHING`,
        [tenant, campaignId, cid, k.email])).catch(() => {});
      continue;
    }

    // Tokens nur erzeugen, wenn die Vorlage sie braucht
    let inviteId = null, inviteToken = null;
    if (tpl.cta_target === 'consent' && k.consent_status !== 'opt_in') {
      const open = await scoped(req, (t) => t.get(
        `SELECT id, token FROM crm_invitations WHERE contact_id = ? AND status IN ('invited','opened')
          AND (expires_at IS NULL OR expires_at > now()) ORDER BY id DESC LIMIT 1`, [cid]));
      if (open) { inviteId = open.id; inviteToken = open.token; }
      else {
        inviteToken = crypto.randomBytes(32).toString('hex');
        const expires = new Date(Date.now() + INVITE_DAYS * 24 * 3600 * 1000);
        inviteId = await scoped(req, (t) => t.insert(`
          INSERT INTO crm_invitations (tenant_id, contact_id, project_id, email, token, invited_by, expires_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)`, [tenant, cid, projectId, k.email, inviteToken, req.user.id, expires]));
      }
    }
    let profileId = null, profileToken = null;
    if (tpl.cta_target === 'profile') {
      const active = await scoped(req, (t) => t.get(
        `SELECT id, token FROM crm_profile_links WHERE contact_id = ? AND status = 'active'
          AND (expires_at IS NULL OR expires_at > now()) ORDER BY id DESC LIMIT 1`, [cid]));
      if (active) { profileId = active.id; profileToken = active.token; }
      else {
        profileToken = crypto.randomBytes(32).toString('hex');
        const pExp = new Date(Date.now() + PROFILE_DAYS * 24 * 3600 * 1000);
        profileId = await scoped(req, (t) => t.insert(`
          INSERT INTO crm_profile_links (tenant_id, contact_id, token, requires_approval, created_by, expires_at)
          VALUES (?, ?, ?, 0, ?, ?)`, [tenant, cid, profileToken, req.user.id, pExp]));
      }
    }

    sendCampaignEmail({ ...mt.buildFromTemplate({
      template: tpl, contact: k, project, inviter: req.user,
      inviteToken, profileToken, frist: req.body.frist,
      overrideSubject: req.body.subject, overrideBody: req.body.body,
      withFacts: req.body.with_facts !== false,
    }), meta: { type: 'campaign', templateKey: tpl.key, contactId: cid, projectId, actorId: req.user.id, tenantId: tenant } }).catch(() => {});

    await scoped(req, (t) => t.run(`
      INSERT INTO crm_campaign_recipients (tenant_id, campaign_id, contact_id, email, invitation_id, profile_link_id, status, sent_at)
      VALUES (?, ?, ?, ?, ?, ?, 'sent', now())
      ON CONFLICT (campaign_id, contact_id) DO NOTHING`,
      [tenant, campaignId, cid, k.email, inviteId, profileId])).catch(() => {});

    // Funnel nachziehen: mindestens „angesprochen"; auf Wunsch auf die Stufe der Vorlage
    const target = advance && Number.isInteger(tpl.stage) ? Math.max(1, tpl.stage) : 1;
    await scoped(req, (t) => t.run(`
      UPDATE crm_deal_parties
         SET mails_sent = COALESCE(mails_sent,0) + 1,
             last_contact = CURRENT_DATE,
             first_contact = COALESCE(first_contact, CURRENT_DATE),
             funnel_stage = GREATEST(funnel_stage, ?),
             stage_changed_at = CASE WHEN funnel_stage < ? THEN now() ELSE stage_changed_at END
       WHERE project_id = ? AND contact_id = ?`, [target, target, projectId, cid])).catch(() => {});

    sent.push({ id: cid, email: k.email });
  }

  db.auditLog(req.user.id, 'CRM_TEMPLATE_SENT', 'project', projectId,
    `Vorlage „${tpl.name}" · ${sent.length} versendet · ${skipped.length} übersprungen`, req.ip);
  res.status(201).json({ success: true, data: { campaign_id: campaignId, sent: sent.length, skipped: skipped.length, details: { sent, skipped } } });
}));

// ═══════════════════════════════════════════════════════════════════════════
// Sprint 23: Posteingang (eingehende Antworten) & Wiedervorlagen
// ═══════════════════════════════════════════════════════════════════════════
const inbound = require('../utils/inbound');

// Eingegangene Antwort manuell erfassen (funktioniert ohne Provider-Konfiguration)
router.post('/contacts/:id/messages', ...isStaff, wrap(async (req, res) => {
  const contact = await scoped(req, (t) => t.get('SELECT * FROM crm_contacts WHERE id = ?', [req.params.id]));
  if (!contact) return res.status(404).json({ success: false, error: 'Kontakt nicht gefunden' });
  const body = String(req.body.body || '').trim();
  if (!body) return res.status(400).json({ success: false, error: 'Bitte den Text der Antwort einfügen.' });

  const r = await inbound.ingestReply({
    from: contact.email, to: req.user.email, subject: req.body.subject || '', body,
    source: 'manual', contactId: contact.id, projectId: req.body.project_id || null, actorId: req.user.id,
  });
  res.status(201).json({ success: true, data: r });
}));

// Nachrichten eines Kontakts
router.get('/contacts/:id/messages', ...isStaff, wrap(async (req, res) => {
  const rows = await scoped(req, (t) => t.all(`
    SELECT m.*, p.codename FROM crm_messages m LEFT JOIN projects p ON p.id = m.project_id
    WHERE m.contact_id = ? ORDER BY COALESCE(m.sent_at, m.created_at) DESC LIMIT 50`, [req.params.id]));
  res.json({ success: true, data: { messages: rows } });
}));

// ── Wiedervorlagen ──────────────────────────────────────────────────────────
router.get('/tasks', ...isStaff, wrap(async (req, res) => {
  const status = req.query.status === 'done' ? 'done' : 'open';
  const rows = await scoped(req, (t) => t.all(`
    SELECT t.*, p.codename,
           k.first_name, k.last_name, k.email,
           u.first_name AS assignee_first, u.last_name AS assignee_last
    FROM crm_tasks t
    LEFT JOIN projects p ON p.id = t.project_id
    LEFT JOIN crm_contacts k ON k.id = t.contact_id
    LEFT JOIN users u ON u.id = t.assignee_id
    WHERE t.status = ?
    ORDER BY t.due_on NULLS LAST, t.id DESC LIMIT 300`, [status]));
  const today = new Date().toISOString().slice(0, 10);
  const list = rows.map(t => ({
    ...t,
    overdue: t.status === 'open' && t.due_on && String(t.due_on).slice(0, 10) < today,
    due_today: t.status === 'open' && t.due_on && String(t.due_on).slice(0, 10) === today,
  }));
  res.json({
    success: true,
    data: {
      tasks: list,
      counts: {
        open: list.filter(t => t.status === 'open').length,
        overdue: list.filter(t => t.overdue).length,
        today: list.filter(t => t.due_today).length,
      },
    },
  });
}));

router.post('/tasks', ...isStaff, wrap(async (req, res) => {
  const title = String(req.body.title || '').trim();
  if (!title) return res.status(400).json({ success: false, error: 'Titel fehlt' });
  const id = await scoped(req, (t) => t.insert(`
    INSERT INTO crm_tasks (tenant_id, title, notes, due_on, contact_id, project_id, assignee_id, source, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [req.tenantId || 1, title, req.body.notes || null, req.body.due_on || null,
     req.body.contact_id || null, req.body.project_id || null,
     req.body.assignee_id || req.user.id, req.body.source || 'manual', req.user.id]));
  db.auditLog(req.user.id, 'TASK_CREATED', 'crm_task', id, title, req.ip);
  res.status(201).json({ success: true, data: { id } });
}));

router.put('/tasks/:id', ...isStaff, wrap(async (req, res) => {
  const t0 = await scoped(req, (t) => t.get('SELECT * FROM crm_tasks WHERE id = ?', [req.params.id]));
  if (!t0) return res.status(404).json({ success: false, error: 'Aufgabe nicht gefunden' });
  const done = req.body.status === 'done';
  await scoped(req, (t) => t.run(`
    UPDATE crm_tasks SET
      title = COALESCE(?, title), notes = COALESCE(?, notes), due_on = COALESCE(?, due_on),
      status = COALESCE(?, status), done_at = ?
    WHERE id = ?`,
    [req.body.title || null, req.body.notes || null, req.body.due_on || null,
     req.body.status || null, done ? new Date() : null, req.params.id]));
  res.json({ success: true, data: { message: done ? 'Erledigt' : 'Aufgabe aktualisiert' } });
}));

router.delete('/tasks/:id', ...isStaff, wrap(async (req, res) => {
  await scoped(req, (t) => t.run('DELETE FROM crm_tasks WHERE id = ?', [req.params.id]));
  res.json({ success: true, data: { message: 'Aufgabe gelöscht' } });
}));

// Plattform-Nutzer → CRM-Kontakt: vorhandenen finden oder anlegen (und verknüpfen).
// Damit lässt sich aus der Nutzerliste heraus direkt die 360°-Ansicht öffnen.
router.post('/contacts/from-user/:userId', ...isStaff, wrap(async (req, res) => {
  const u = await db.get('SELECT * FROM users WHERE id = ?', [req.params.userId]);
  if (!u) return res.status(404).json({ success: false, error: 'Nutzer nicht gefunden' });

  let contact = await scoped(req, (t) => t.get('SELECT * FROM crm_contacts WHERE user_id = ?', [u.id]));
  if (!contact && u.email) {
    contact = await scoped(req, (t) => t.get('SELECT * FROM crm_contacts WHERE lower(email) = ?', [String(u.email).toLowerCase()]));
    if (contact) await scoped(req, (t) => t.run('UPDATE crm_contacts SET user_id = ? WHERE id = ?', [u.id, contact.id]));
  }
  if (!contact) {
    const id = await scoped(req, (t) => t.insert(`
      INSERT INTO crm_contacts (tenant_id, salutation, title, first_name, last_name, email, mobile,
                                responsibility, consent_status, contact_status, user_id, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'opt_in', 'active', ?, ?)`,
      [req.tenantId || 1, u.salutation || null, u.title || null, u.first_name, u.last_name,
       String(u.email).toLowerCase(), u.mobile || null, u.position || null, u.id, req.user.id]));
    contact = { id };
    db.auditLog(req.user.id, 'CRM_CONTACT_FROM_USER', 'crm_contact', id, u.email, req.ip);
    // Registrierte Nutzer haben der Nutzung zugestimmt → consent_status = opt_in
  }
  res.json({ success: true, data: { contact_id: contact.id } });
}));

// ═══════════════════════════════════════════════════════════════════════════
// Sprint 13: DSGVO: Auskunft (Art. 15) und Vergessenwerden (Art. 17)
// ═══════════════════════════════════════════════════════════════════════════

// Vollständige Datenauskunft zu einem Kontakt, alles, was wir über ihn haben.
router.get('/contacts/:id/export', ...isStaff, requirePermission('crm.export'), wrap(async (req, res) => {
  const id = req.params.id;
  const contact = await scoped(req, (t) => t.get('SELECT * FROM crm_contacts WHERE id = ?', [id]));
  if (!contact) return res.status(404).json({ success: false, error: 'Kontakt nicht gefunden' });

  const q = (sql) => scoped(req, (t) => t.all(sql, [id])).catch(() => []);
  const data = {
    exported_at: new Date().toISOString(),
    exported_by: req.user.email,
    hinweis: 'Datenauskunft nach Art. 15 DSGVO: alle zu dieser Person gespeicherten Daten.',
    stammdaten: contact,
    unternehmen: await q('SELECT * FROM crm_company_contacts WHERE contact_id = ?'),
    mandate: await q('SELECT * FROM crm_deal_parties WHERE contact_id = ?'),
    einladungen: await q('SELECT * FROM crm_invitations WHERE contact_id = ?'),
    mailings: await q('SELECT * FROM crm_campaign_recipients WHERE contact_id = ?'),
    versendete_mails: await q('SELECT id, to_email, subject, mail_type, created_at FROM email_log WHERE contact_id = ?'),
    nachrichten: await q('SELECT * FROM crm_messages WHERE contact_id = ?'),
    pflege_links: await q('SELECT id, status, created_at, last_opened_at, last_saved_at FROM crm_profile_links WHERE contact_id = ?'),
    selbstpflege_aenderungen: await q('SELECT * FROM crm_profile_changes WHERE contact_id = ?'),
    wiedervorlagen: await q('SELECT * FROM crm_tasks WHERE contact_id = ?'),
  };
  db.auditLog(req.user.id, 'CRM_CONTACT_EXPORT', 'crm_contact', id, contact.email, req.ip);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="Datenauskunft_Kontakt_${id}.json"`);
  res.send(JSON.stringify(data, null, 2));
}));

// Recht auf Vergessenwerden: personenbezogene Daten löschen, Nachweis behalten.
// Bewusst KEIN harter DELETE: die Tatsache der Löschung und der Prozessverlauf
// bleiben belegbar (berechtigtes Interesse, Rechenschaftspflicht Art. 5 Abs. 2).
router.post('/contacts/:id/anonymize', ...isStaff, requirePermission('crm.delete'), wrap(async (req, res) => {
  const id = req.params.id;
  const contact = await scoped(req, (t) => t.get('SELECT * FROM crm_contacts WHERE id = ?', [id]));
  if (!contact) return res.status(404).json({ success: false, error: 'Kontakt nicht gefunden' });
  if (contact.anonymized_at) return res.status(409).json({ success: false, error: 'Dieser Kontakt ist bereits anonymisiert.' });

  await scoped(req, (t) => t.run(`
    UPDATE crm_contacts SET
      salutation = NULL, title = NULL, first_name = NULL, last_name = 'Gelöschter Kontakt',
      email = NULL, phone = NULL, mobile = NULL, linkedin_url = NULL, location = NULL,
      responsibility = NULL, notes = NULL, tags_json = '[]',
      focus_industries = NULL, focus_regions = NULL, investment_focus = NULL,
      consent_status = 'opt_out', contact_status = 'do_not_contact',
      anonymized_at = now(), anonymized_by = ?, updated_at = now()
    WHERE id = ?`, [req.user.id, id]));

  // Offene Zugänge entwerten, Inhalte der Nachrichten löschen (Metadaten bleiben)
  await scoped(req, (t) => t.run(`UPDATE crm_profile_links SET status = 'revoked' WHERE contact_id = ?`, [id])).catch(() => {});
  await scoped(req, (t) => t.run(`UPDATE crm_invitations SET status = 'revoked' WHERE contact_id = ? AND status IN ('invited','opened')`, [id])).catch(() => {});
  await scoped(req, (t) => t.run(`UPDATE crm_messages SET body = '[gelöscht]', from_email = NULL, to_email = NULL WHERE contact_id = ?`, [id])).catch(() => {});
  await scoped(req, (t) => t.run(`UPDATE email_log SET body_html = NULL, to_email = '[gelöscht]' WHERE contact_id = ?`, [id])).catch(() => {});

  db.auditLog(req.user.id, 'CRM_CONTACT_ANONYMIZED', 'crm_contact', id,
    `${contact.email || 'ohne E-Mail'} · auf Wunsch gelöscht (Art. 17 DSGVO)`, req.ip);
  res.json({ success: true, data: { message: 'Kontakt anonymisiert. Die Prozesshistorie bleibt als Nachweis erhalten.' } });
}));

// Kennzahlen fürs Dashboard ─────────────────────────────────────────────────
router.get('/stats', ...isStaff, wrap(async (req, res) => {
  const c = await scoped(req, (t) => t.get('SELECT COUNT(*)::int AS n FROM crm_companies'));
  const k = await scoped(req, (t) => t.get(`
    SELECT COUNT(*)::int AS n,
           COUNT(*) FILTER (WHERE is_decision_maker = 1)::int AS decision_makers,
           COUNT(*) FILTER (WHERE consent_status = 'opt_in')::int AS opt_in,
           COUNT(*) FILTER (WHERE contact_status = 'do_not_contact')::int AS blocked
    FROM crm_contacts`));
  res.json({ success: true, data: { companies: c.n, contacts: k.n, decision_makers: k.decision_makers, opt_in: k.opt_in, blocked: k.blocked } });
}));

module.exports = router;
