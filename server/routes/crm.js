// ─────────────────────────────────────────────────────────────────────────────
// Sprint 19 — CRM I: Unternehmen & Kontakte.
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
const router = express.Router();

const scoped = (req, fn) => (req.tenantId && req.tenantId !== 1) ? db.withTenant(req.tenantId, fn) : fn(db);
const isStaff = [authenticate, requireRole('super_admin', 'advisor', 'tenant_owner')];

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

router.post('/companies', ...isStaff, wrap(async (req, res) => {
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

router.put('/companies/:id', ...isStaff, wrap(async (req, res) => {
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

router.delete('/companies/:id', ...isStaff, wrap(async (req, res) => {
  await scoped(req, (t) => t.run('DELETE FROM crm_companies WHERE id = ?', [req.params.id]));
  db.auditLog(req.user.id, 'CRM_COMPANY_DELETED', 'crm_company', req.params.id, null, req.ip);
  res.json({ success: true, data: { message: 'Unternehmen gelöscht' } });
}));

// ── Kontakte ────────────────────────────────────────────────────────────────
const CONTACT_FIELDS = ['salutation', 'title', 'first_name', 'last_name', 'email', 'phone', 'mobile',
  'linkedin_url', 'location', 'responsibility', 'relationship', 'notes', 'consent_status', 'contact_status'];

router.get('/contacts', ...isStaff, wrap(async (req, res) => {
  const { q, decision_makers, company_id } = req.query;
  const where = ['1=1']; const params = [];
  if (q) { where.push('(k.last_name ILIKE ? OR k.first_name ILIKE ? OR k.email ILIKE ?)'); const s = `%${q}%`; params.push(s, s, s); }
  if (decision_makers === '1') where.push('k.is_decision_maker = 1');
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

router.post('/contacts', ...isStaff, wrap(async (req, res) => {
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
      consent_status, consent_at, contact_status, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [req.tenantId || 1, req.body.salutation || null, req.body.title || null, req.body.first_name || null, last,
     email, req.body.phone || null, req.body.mobile || null, req.body.linkedin_url || null,
     req.body.location || null, req.body.responsibility || null, req.body.relationship || null,
     req.body.notes || null, JSON.stringify(req.body.tags || []),
     req.body.is_decision_maker ? 1 : 0,
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

router.put('/contacts/:id', ...isStaff, wrap(async (req, res) => {
  const existing = await scoped(req, (t) => t.get('SELECT id, consent_status FROM crm_contacts WHERE id = ?', [req.params.id]));
  if (!existing) return res.status(404).json({ success: false, error: 'Kontakt nicht gefunden' });

  const sets = []; const params = [];
  for (const f of CONTACT_FIELDS) {
    if (req.body[f] !== undefined) { sets.push(`${f} = ?`); params.push(req.body[f] || null); }
  }
  if (req.body.is_decision_maker !== undefined) { sets.push('is_decision_maker = ?'); params.push(req.body.is_decision_maker ? 1 : 0); }
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

router.delete('/contacts/:id', ...isStaff, wrap(async (req, res) => {
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
  res.json({
    success: true,
    data: {
      contact: { ...contact, tags: safeJson(contact.tags_json, []) },
      current: links.filter(l => !l.ended_on),
      history: links.filter(l => l.ended_on),   // frühere Positionen / Unternehmenswechsel
    },
  });
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

router.get('/export/companies', ...isStaff, wrap(async (req, res) => {
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

router.get('/export/contacts', ...isStaff, wrap(async (req, res) => {
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

router.post('/import/companies', ...isStaff, wrap(async (req, res) => {
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

router.post('/import/contacts', ...isStaff, wrap(async (req, res) => {
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

// ── Kennzahlen fürs Dashboard ───────────────────────────────────────────────
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
