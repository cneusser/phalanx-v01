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

// ── Unternehmen zusammenführen (Dubletten aufräumen) ───────────────────────
// Alles von `source` wandert zu `target`: Kontakte, Funnel-Einträge, Töchter.
// Leere Felder in `target` werden aus `source` aufgefüllt (nichts geht verloren).
router.post('/companies/:id/merge', ...isStaff, wrap(async (req, res) => {
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
    const merged = [target.notes, `— aus „${source.name}": ${source.notes}`].filter(Boolean).join('\n');
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

  // Sprint 20: Mandats-Zuordnungen dieses Kontakts (Rolle + Funnel-Stufe)
  const deals = await scoped(req, (t) => t.all(`
    SELECT dp.id AS party_id, dp.project_id, dp.party_role, dp.funnel_stage, dp.party_status, dp.next_step,
           p.codename, p.status AS project_status
    FROM crm_deal_parties dp JOIN projects p ON p.id = dp.project_id
    WHERE dp.contact_id = ? ORDER BY dp.funnel_stage DESC`, [req.params.id])).catch(() => []);

  res.json({
    success: true,
    data: {
      contact: { ...contact, tags: safeJson(contact.tags_json, []) },
      current: links.filter(l => !l.ended_on),
      history: links.filter(l => l.ended_on),   // frühere Positionen / Unternehmenswechsel
      deals,
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

// ═══════════════════════════════════════════════════════════════════════════
// Sprint 20 — CRM II: Beteiligtenrollen & Sell-Side-Funnel je Mandat
// ═══════════════════════════════════════════════════════════════════════════
const FUNNEL_STAGES = [
  { key: 0, label: 'Longlist' },
  { key: 1, label: 'Angesprochen' },
  { key: 2, label: 'Rückmeldung' },
  { key: 3, label: 'NDA' },
  { key: 4, label: 'IM / Unterlagen' },
  { key: 5, label: 'Gespräch' },
  { key: 6, label: 'Angebot / LOI' },
  { key: 7, label: 'Due Diligence' },
  { key: 8, label: 'Abgeschlossen' },
];
const PARTY_ROLES = ['buyer', 'advisor', 'seller', 'bank', 'lawyer', 'target', 'other'];
const PARTY_STATUS = ['active', 'dropped', 'open', 'unclear'];
const STAGNANT_DAYS = 30;

// Mandate mit Funnel-Zahlen (Auswahl fürs Board)
router.get('/deals', ...isStaff, wrap(async (req, res) => {
  const rows = await scoped(req, (t) => t.all(`
    SELECT p.id, p.codename, p.status, p.industry, p.region,
           (SELECT COUNT(*)::int FROM crm_deal_parties dp WHERE dp.project_id = p.id) AS parties,
           (SELECT COUNT(*)::int FROM crm_deal_parties dp WHERE dp.project_id = p.id AND dp.party_status = 'active') AS active,
           (SELECT COUNT(*)::int FROM crm_deal_parties dp WHERE dp.project_id = p.id AND dp.party_status = 'open') AS open
    FROM projects p
    WHERE EXISTS (SELECT 1 FROM crm_deal_parties dp WHERE dp.project_id = p.id) OR p.status = 'active'
    ORDER BY parties DESC, p.codename`));
  res.json({ success: true, data: { deals: rows, stages: FUNNEL_STAGES } });
}));

// Board eines Mandats: alle Beteiligten je Funnel-Stufe (inkl. Verweildauer)
router.get('/deals/:projectId/parties', ...isStaff, wrap(async (req, res) => {
  const rows = await scoped(req, (t) => t.all(`
    SELECT dp.*,
           k.first_name, k.last_name, k.email, k.consent_status, k.contact_status, k.is_decision_maker,
           c.name AS company_name,
           (SELECT status FROM crm_invitations i WHERE i.contact_id = dp.contact_id ORDER BY i.invited_at DESC LIMIT 1) AS invite_status
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

router.post('/deals/:projectId/parties', ...isStaff, wrap(async (req, res) => {
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

// Stufe/Status ändern (Drag & Drop) — Verweildauer wird bei Stufenwechsel neu gestartet
router.put('/parties/:id', ...isStaff, wrap(async (req, res) => {
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
  if (!sets.length) return res.json({ success: true, data: { message: 'Nichts zu ändern' } });

  params.push(req.params.id);
  await scoped(req, (t) => t.run(`UPDATE crm_deal_parties SET ${sets.join(', ')} WHERE id = ?`, params));
  db.auditLog(req.user.id, 'CRM_PARTY_UPDATED', 'project', party.project_id, `Eintrag #${req.params.id}`, req.ip);
  res.json({ success: true, data: { message: 'Gespeichert' } });
}));

router.delete('/parties/:id', ...isStaff, wrap(async (req, res) => {
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

  const { sendProcessUpdateEmail } = require('../utils/email');
  const inviter = [req.user.title, req.user.first_name, req.user.last_name].filter(Boolean).join(' ');
  sendProcessUpdateEmail({
    to: contact.email,
    firstName: contact.first_name || '',
    title: 'Einladung zu CapitalMatch — Ihre Bestätigung erforderlich',
    message:
      `<strong>${inviter}</strong> (Phalanx GmbH) lädt Sie zu <strong>CapitalMatch</strong> ein — der Plattform, über die wir ` +
      `unsere M&A-Mandate künftig strukturiert und vertraulich bereitstellen: Kurzprofile, Unterlagen nach NDA, ` +
      `Datenraum und direkte Kommunikation an einem Ort.` +
      (req.body.message ? `<br/><br/><span style="display:block;background:#F4F8FC;border-left:3px solid #5B8FC9;padding:10px 14px;color:#333;">${req.body.message}</span>` : '') +
      `<br/><br/><strong>Wichtig (DSGVO):</strong> Wir legen kein Konto für Sie an und senden Ihnen keine weiteren ` +
      `Informationen, solange Sie nicht ausdrücklich zustimmen. Bitte bestätigen Sie Ihre Einwilligung über den Button. ` +
      `Sie können sie jederzeit mit Wirkung für die Zukunft widerrufen.` +
      `<br/><br/><span style="font-size:12px;color:#888;">Möchten Sie nicht kontaktiert werden, ignorieren Sie diese E-Mail einfach — ` +
      `oder klicken Sie auf der Bestätigungsseite auf „Nicht kontaktieren". Die Einladung verfällt nach ${INVITE_DAYS} Tagen.</span>`,
    ctaLabel: 'Einwilligung bestätigen',
    ctaPath: `/einwilligung?token=${token}`,
  }).catch(() => {});

  db.auditLog(req.user.id, 'CRM_INVITE_SENT', 'crm_contact', contact.id, contact.email, req.ip);
  return id;
}

// Einzelne Einladung
router.post('/contacts/:id/invite', ...isStaff, wrap(async (req, res) => {
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

// Sammel-Einladung (bewusst limitiert — kein Massenversand aus Versehen)
router.post('/invite/bulk', ...isStaff, wrap(async (req, res) => {
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

// Einwilligung erteilen (Double-Opt-in) — mit Nachweis
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

// Widerspruch — Kontakt wird dauerhaft auf „nicht kontaktieren" gesetzt
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

// Konto anlegen — NUR nach erteilter Einwilligung (Double-Opt-in erfüllt)
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

  const bcrypt = require('bcryptjs');
  const jwt = require('jsonwebtoken');
  const password_hash = bcrypt.hashSync(String(password), 10);
  // Einwilligung + Token belegen die E-Mail-Adresse → direkt freigeschaltet & verifiziert
  const userId = await db.insert(`
    INSERT INTO users (tenant_id, email, password_hash, role, salutation, title, first_name, last_name, company, position, mobile,
                       is_approved, is_active, email_verified, privacy_consent_at)
    VALUES (?, ?, ?, 'buyer', ?, ?, ?, ?, ?, ?, ?, 1, 1, 1, now())`,
    [inv.tenant_id || 1, String(inv.email).toLowerCase(), password_hash, salutation, title || null,
     first_name, last_name, company || null, position || null, mobile]);
  await db.run(`INSERT INTO buyer_profiles (tenant_id, user_id, industries, regions, deal_types) VALUES (?, ?, '[]', '[]', '[]')`,
    [inv.tenant_id || 1, userId]).catch(() => {});

  await db.run(`UPDATE crm_invitations SET status = 'registered', registered_at = now(), user_id = ? WHERE id = ?`, [userId, inv.id]);
  if (inv.contact_id) await db.run(`UPDATE crm_contacts SET user_id = ? WHERE id = ?`, [userId, inv.contact_id]).catch(() => {});
  db.auditLog(userId, 'REGISTER_VIA_CRM_INVITE', 'user', userId, `${inv.email} · Einwilligung ${inv.consent_text_version}`, req.ip);

  const token = jwt.sign({ userId }, process.env.JWT_SECRET || 'phalanx-secret', { expiresIn: '7d' });
  const user = await db.get('SELECT id, email, role, salutation, title, first_name, last_name, company FROM users WHERE id = ?', [userId]);
  res.status(201).json({ success: true, data: { token, user } });
}));

// ═══════════════════════════════════════════════════════════════════════════
// CRM IV — Kontakt-Selbstpflege-Portal
//
// Der Kontakt bekommt einen persönlichen, befristeten Link und pflegt seine
// Daten selbst. Jede Änderung wird protokolliert (Vorher/Nachher). Je nach Link
// wird sie direkt übernommen oder muss intern freigegeben werden. Abmeldung und
// Einschränkung der Kontaktaufnahme sind jederzeit möglich (DSGVO).
// ═══════════════════════════════════════════════════════════════════════════
const PROFILE_DAYS = 60;
// Nur diese Felder darf der Kontakt selbst ändern — nichts anderes.
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

// Link erzeugen und per Mail versenden
router.post('/contacts/:id/profile-link', ...isStaff, wrap(async (req, res) => {
  const contact = await scoped(req, (t) => t.get('SELECT * FROM crm_contacts WHERE id = ?', [req.params.id]));
  if (!contact) return res.status(404).json({ success: false, error: 'Kontakt nicht gefunden' });
  if (!contact.email) return res.status(400).json({ success: false, error: 'Kontakt hat keine E-Mail-Adresse.' });
  if (contact.contact_status === 'do_not_contact' || contact.consent_status === 'opt_out') {
    return res.status(403).json({ success: false, error: 'Dieser Kontakt hat der Kontaktaufnahme widersprochen.' });
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

  const { sendProcessUpdateEmail } = require('../utils/email');
  sendProcessUpdateEmail({
    to: contact.email, firstName: contact.first_name || '',
    title: 'Ihre Angaben bei der Phalanx GmbH — bitte kurz prüfen',
    message:
      `damit wir Sie nur mit wirklich passenden Transaktionen ansprechen, bitten wir Sie um eine kurze Prüfung ` +
      `Ihrer bei uns gespeicherten Angaben — Kontaktdaten, Position, Branchen- und Regionenfokus sowie Ticketgröße.` +
      `<br/><br/>Über den Button sehen Sie <strong>genau, was wir gespeichert haben</strong>, und können es selbst ` +
      `korrigieren. Der Link ist persönlich und ${PROFILE_DAYS} Tage gültig.` +
      `<br/><br/><span style="font-size:12px;color:#888;">Sie können dort auch festlegen, wie (oder ob) wir Sie ` +
      `künftig kontaktieren dürfen — bis hin zur vollständigen Abmeldung.</span>`,
    ctaLabel: 'Angaben prüfen', ctaPath: `/profil-pflege?token=${token}`,
  }).catch(() => {});

  db.auditLog(req.user.id, 'CRM_PROFILE_LINK_SENT', 'crm_contact', contact.id, contact.email, req.ip);
  res.status(201).json({ success: true, data: { id, expires_at: expires } });
}));

// Sammel-Versand (max. 50)
router.post('/profile-links/bulk', ...isStaff, wrap(async (req, res) => {
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
      to: contact.email, firstName: contact.first_name || '',
      title: 'Ihre Angaben bei der Phalanx GmbH — bitte kurz prüfen',
      message: `damit wir Sie nur mit passenden Transaktionen ansprechen, bitten wir Sie um eine kurze Prüfung Ihrer gespeicherten Angaben. Der Link ist persönlich und ${PROFILE_DAYS} Tage gültig.`,
      ctaLabel: 'Angaben prüfen', ctaPath: `/profil-pflege?token=${token}`,
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

  // Nur erlaubte Felder übernehmen — alles andere wird ignoriert
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
        : 'Vermerkt — wir kontaktieren Sie vorerst nicht mehr per E-Mail.',
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
