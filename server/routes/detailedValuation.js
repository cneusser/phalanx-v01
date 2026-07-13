// ─────────────────────────────────────────────────────────────────────────────
// Sprint 7 — Ausführliche Bewertung (Login-Pflicht).
//   POST   /api/detailed-valuations            Entwurf anlegen
//   GET    /api/detailed-valuations            eigene Bewertungen (Admin: alle)
//   GET    /api/detailed-valuations/:id        eine Bewertung (Eigentümer/Admin)
//   PUT    /api/detailed-valuations/:id        Entwurf aktualisieren (Eigentümer)
//   POST   /api/detailed-valuations/:id/submit berechnen + Status submitted
//   GET    /api/detailed-valuations/:id/report PDF-Report (on-demand generiert)
//   PUT    /api/detailed-valuations/:id/review Admin: prüfen + Mandat zuordnen
//
// Vorerst gratis, aber Login-Pflicht. Billing-Haken vorbereitet (VALUATION_PAID),
// standardmäßig aus.
// ─────────────────────────────────────────────────────────────────────────────
const express = require('express');
const db = require('../db/database');
const wrap = require('../utils/asyncHandler');
const { authenticate, requireRole } = require('../middleware/auth');
const { evaluateDetailed } = require('../valuation/detailedEngine');
const { generateDetailedReport } = require('../valuation/detailedReport');
const router = express.Router();

const enabled = () => process.env.VALUATION_ENABLED !== '0';
const ADMIN_ROLES = ['super_admin', 'advisor', 'tenant_owner'];
const isAdminRole = (u) => u && ADMIN_ROLES.includes(u.role);

// ── Paygate (vorbereitet): kostenlos bis VALUATION_FREE_UNTIL (Default 2026-08-31).
//    Danach greift die Bezahlschranke, sofern VALUATION_PAYWALL=1 gesetzt ist.
//    Entitlement-Stub: berechtigte Nutzer via VALUATION_ENTITLED (E-Mail-Liste)
//    oder Admin-Rollen. Zahlungsabwicklung folgt separat.
const FREE_UNTIL = () => process.env.VALUATION_FREE_UNTIL || '2026-08-31';
const paywallFlag = () => process.env.VALUATION_PAYWALL === '1';
function entitled(user) {
  if (isAdminRole(user)) return true;
  const list = (process.env.VALUATION_ENTITLED || '').toLowerCase().split(',').map(s => s.trim()).filter(Boolean);
  return user && list.includes((user.email || '').toLowerCase());
}
function valuationAccess(user) {
  const freeUntil = FREE_UNTIL();
  const endOfDay = new Date(freeUntil + 'T23:59:59').getTime();
  const inFreePeriod = Date.now() <= endOfDay;
  const hasEntitlement = entitled(user);
  const allowed = inFreePeriod || !paywallFlag() || hasEntitlement;
  return { allowed, in_free_period: inFreePeriod, free_until: freeUntil, paywall_enabled: paywallFlag(), has_entitlement: hasEntitlement, requires_payment: !allowed };
}

// Tenant-Kontext (RLS): Default-Tenant über normale Verbindung, sonst withTenant.
const scoped = (req, fn) => (req.tenantId && req.tenantId !== 1) ? db.withTenant(req.tenantId, fn) : fn(db);

function industryKey(inputs) {
  const k = String(inputs && inputs.industry || '').trim().toLowerCase();
  return k || 'sonstige';
}
async function loadMultiple(req, key) {
  const hit = await scoped(req, (t) => t.get(`SELECT * FROM valuation_multiples WHERE industry_key = ?`, [key]));
  if (hit) return hit;
  return scoped(req, (t) => t.get(`SELECT * FROM valuation_multiples WHERE industry_key = 'sonstige'`));
}

async function getOwned(req, id) {
  const row = await scoped(req, (t) => t.get(`SELECT * FROM detailed_valuations WHERE id = ?`, [id]));
  if (!row) return { err: 404 };
  if (row.user_id !== req.user.id && !isAdminRole(req.user)) return { err: 403 };
  return { row };
}

function parseRow(row) {
  let inputs = {}, results = {};
  try { inputs = JSON.parse(row.inputs_json || '{}'); } catch {}
  try { results = JSON.parse(row.results_json || '{}'); } catch {}
  return { ...row, inputs, results, inputs_json: undefined, results_json: undefined };
}

// ── Zugriffs-/Paygate-Status (für Client-Banner) ────────────────────────────
router.get('/access', authenticate, wrap(async (req, res) => {
  res.json({ success: true, data: valuationAccess(req.user) });
}));

// ── Entwurf anlegen ─────────────────────────────────────────────────────────
router.post('/', authenticate, wrap(async (req, res) => {
  if (!enabled()) return res.status(404).json({ success: false, error: 'Bewertung derzeit nicht verfügbar' });
  const acc = valuationAccess(req.user);
  if (!acc.allowed) return res.status(402).json({ success: false, code: 'PAYWALL', error: `Die ausführliche Bewertung ist ab dem ${new Date(acc.free_until).toLocaleDateString('de-DE')} kostenpflichtig. Bitte schalten Sie sie frei oder sprechen Sie uns an.`, data: acc });
  const tenantId = req.tenantId || 1;
  const { title, inputs, project_id } = req.body;
  const id = await scoped(req, (t) => t.insert(
    `INSERT INTO detailed_valuations (tenant_id, user_id, project_id, title, status, inputs_json)
     VALUES (?, ?, ?, ?, 'draft', ?)`,
    [tenantId, req.user.id, project_id || null, title || null, JSON.stringify(inputs || {})]
  ));
  db.activityLog(req.user.id, 'DETAILED_VALUATION_CREATE', 'detailed_valuation', id, req.ip);
  res.json({ success: true, data: { id } });
}));

// ── Liste (eigene; Admin: alle) ─────────────────────────────────────────────
router.get('/', authenticate, wrap(async (req, res) => {
  const admin = isAdminRole(req.user);
  const where = admin ? '' : 'WHERE dv.user_id = ?';
  const params = admin ? [] : [req.user.id];
  const rows = await scoped(req, (t) => t.all(`
    SELECT dv.id, dv.title, dv.status, dv.project_id, dv.user_id, dv.created_at, dv.updated_at,
           dv.reviewed_at, dv.results_json, u.first_name, u.last_name, u.email, p.codename
    FROM detailed_valuations dv
    LEFT JOIN users u ON u.id = dv.user_id
    LEFT JOIN projects p ON p.id = dv.project_id
    ${where} ORDER BY dv.updated_at DESC LIMIT 200`, params));
  const data = rows.map(r => {
    let base = null, positive = null, industry = null;
    try { const res = JSON.parse(r.results_json || '{}'); base = res.corridor ? res.corridor.base : null; positive = res.positive; industry = res.industryLabel; } catch {}
    return { id: r.id, title: r.title, status: r.status, project_id: r.project_id, codename: r.codename,
      owner: [r.first_name, r.last_name].filter(Boolean).join(' ') || r.email, owner_email: r.email,
      corridor_base: base, positive, industry, created_at: r.created_at, updated_at: r.updated_at, reviewed_at: r.reviewed_at };
  });
  res.json({ success: true, data });
}));

// ── Einzelne Bewertung ──────────────────────────────────────────────────────
router.get('/:id', authenticate, wrap(async (req, res) => {
  const { row, err } = await getOwned(req, req.params.id);
  if (err) return res.status(err).json({ success: false, error: err === 404 ? 'Nicht gefunden' : 'Kein Zugriff' });
  res.json({ success: true, data: parseRow(row) });
}));

// ── Entwurf aktualisieren ───────────────────────────────────────────────────
router.put('/:id', authenticate, wrap(async (req, res) => {
  const { row, err } = await getOwned(req, req.params.id);
  if (err) return res.status(err).json({ success: false, error: err === 404 ? 'Nicht gefunden' : 'Kein Zugriff' });
  if (row.status === 'reviewed') return res.status(409).json({ success: false, error: 'Geprüfte Bewertung ist gesperrt' });
  const { title, inputs, project_id } = req.body;
  await scoped(req, (t) => t.run(
    `UPDATE detailed_valuations SET
       title = COALESCE(?, title),
       inputs_json = COALESCE(?, inputs_json),
       project_id = ?,
       updated_at = now()
     WHERE id = ?`,
    [title ?? null, inputs ? JSON.stringify(inputs) : null,
     project_id !== undefined ? project_id : row.project_id, req.params.id]
  ));
  res.json({ success: true, data: { message: 'Gespeichert' } });
}));

// ── Berechnen + submit ──────────────────────────────────────────────────────
router.post('/:id/submit', authenticate, wrap(async (req, res) => {
  const acc = valuationAccess(req.user);
  if (!acc.allowed) return res.status(402).json({ success: false, code: 'PAYWALL', error: `Die ausführliche Bewertung ist ab dem ${new Date(acc.free_until).toLocaleDateString('de-DE')} kostenpflichtig.`, data: acc });
  const { row, err } = await getOwned(req, req.params.id);
  if (err) return res.status(err).json({ success: false, error: err === 404 ? 'Nicht gefunden' : 'Kein Zugriff' });
  const inputs = req.body && req.body.inputs ? req.body.inputs : (() => { try { return JSON.parse(row.inputs_json || '{}'); } catch { return {}; } })();
  const multiple = await loadMultiple(req, industryKey(inputs));
  if (!multiple) return res.status(500).json({ success: false, error: 'Bewertungsgrundlagen nicht verfügbar' });
  // Sprint 12: Branchen-Benchmarks (falls für die Branche hinterlegt)
  const bench = await scoped(req, (t) => t.get(
    'SELECT * FROM valuation_benchmarks WHERE industry = ?', [inputs.industry])).catch(() => null);
  const result = evaluateDetailed(inputs, multiple, bench);
  await scoped(req, (t) => t.run(
    `UPDATE detailed_valuations SET inputs_json = ?, results_json = ?, status = 'submitted', submitted_at = now(), updated_at = now() WHERE id = ?`,
    [JSON.stringify(inputs), JSON.stringify(result), req.params.id]
  ));
  db.auditLog(req.user.id, 'DETAILED_VALUATION_SUBMIT', 'detailed_valuation', req.params.id, null, req.ip);
  res.json({ success: true, data: { result } });
}));

// ── PDF-Report (on-demand generiert) ────────────────────────────────────────
router.get('/:id/report', authenticate, wrap(async (req, res) => {
  const { row, err } = await getOwned(req, req.params.id);
  if (err) return res.status(err).json({ success: false, error: err === 404 ? 'Nicht gefunden' : 'Kein Zugriff' });
  let inputs = {}, result = {};
  try { inputs = JSON.parse(row.inputs_json || '{}'); } catch {}
  try { result = JSON.parse(row.results_json || '{}'); } catch {}
  if (!result.corridor) return res.status(409).json({ success: false, error: 'Bitte zuerst berechnen (submit)' });
  const user = req.user;
  const pdf = await generateDetailedReport({
    result, inputs, company: row.title || inputs.company || null,
    name: [user.title, user.first_name, user.last_name].filter(Boolean).join(' '), date: new Date(),
  });
  db.activityLog(req.user.id, 'DETAILED_VALUATION_REPORT', 'detailed_valuation', req.params.id, req.ip);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="CapitalMatch_Bewertung_${req.params.id}.pdf"`);
  res.send(pdf);
}));

// ── Admin-Review: prüfen, kommentieren, Mandat zuordnen ─────────────────────
router.put('/:id/review', authenticate, requireRole(...ADMIN_ROLES), wrap(async (req, res) => {
  const row = await scoped(req, (t) => t.get(`SELECT * FROM detailed_valuations WHERE id = ?`, [req.params.id]));
  if (!row) return res.status(404).json({ success: false, error: 'Nicht gefunden' });
  const { reviewer_comment, project_id, status } = req.body;
  const newStatus = status === 'reviewed' ? 'reviewed' : row.status;
  await scoped(req, (t) => t.run(
    `UPDATE detailed_valuations SET
       reviewer_comment = COALESCE(?, reviewer_comment),
       project_id = ?, status = ?, reviewed_by = ?, reviewed_at = now(), updated_at = now()
     WHERE id = ?`,
    [reviewer_comment ?? null, project_id !== undefined ? project_id : row.project_id,
     newStatus, req.user.id, req.params.id]
  ));
  db.auditLog(req.user.id, 'DETAILED_VALUATION_REVIEW', 'detailed_valuation', req.params.id, null, req.ip);
  res.json({ success: true, data: { message: 'Review gespeichert' } });
}));

module.exports = router;
