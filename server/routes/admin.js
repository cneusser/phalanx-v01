// CapitalMatch – Admin-Route — PostgreSQL/Knex
const express = require('express');
const db = require('../db/database');
const { authenticate, requireRole } = require('../middleware/auth');
const wrap = require('../utils/asyncHandler');
const { setStage } = require('../middleware/gates');
const { canTransitionDeal, DEAL_TRANSITIONS } = require('../utils/dealStateMachine');
const router = express.Router();
const isAdmin = [authenticate, requireRole('super_admin', 'advisor')];

// ── Stats ─────────────────────────────────────────────────────────────────
router.get('/stats', ...isAdmin, wrap(async (req, res) => {
  const p = await db.get(`
    SELECT COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE status='active')::int AS active,
           COUNT(*) FILTER (WHERE status='draft')::int  AS draft
    FROM projects
  `);
  const u = await db.get(`
    SELECT COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE is_approved = 0)::int AS pending,
           COUNT(*) FILTER (WHERE created_at >= now() - interval '7 days')::int AS this_week
    FROM users WHERE role NOT IN ('super_admin','advisor')
  `);
  const n = await db.get(`
    SELECT COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE status='requested')::int AS requested,
           COUNT(*) FILTER (WHERE status='signed')::int    AS signed,
           COUNT(*) FILTER (WHERE status='approved')::int  AS approved
    FROM nda_requests
  `);
  res.json({
    success: true,
    data: {
      projects: { total: p.total, active: p.active, draft: p.draft },
      users:    { total: u.total, pending: u.pending, this_week: u.this_week },
      ndas:     { requested: n.requested, signed: n.signed, approved: n.approved, total: n.total },
    },
  });
}));

// ── Projects ──────────────────────────────────────────────────────────────
router.get('/projects', ...isAdmin, wrap(async (req, res) => {
  const projects = (await db.all(`
    SELECT p.*, u.first_name || ' ' || u.last_name as created_by_name,
      (SELECT COUNT(*)::int FROM nda_requests nr WHERE nr.project_id = p.id) as nda_count,
      (SELECT COUNT(*)::int FROM nda_requests nr WHERE nr.project_id = p.id AND nr.status='approved') as approved_count
    FROM projects p LEFT JOIN users u ON u.id = p.created_by ORDER BY p.created_at DESC
  `)).map(p => ({ ...p, highlights: JSON.parse(p.highlights || '[]') }));
  res.json({ success: true, data: projects });
}));

router.post('/projects', ...isAdmin, wrap(async (req, res) => {
  const { codename, industry, region, revenue_band, ebitda_band, deal_type, short_description, highlights, status,
          mandate_type, stage, investment_needed, equity_stake, post_money_valuation, tam_band, sector_emoji, location_city } = req.body;
  if (!codename || !industry || !region || !short_description)
    return res.status(400).json({ success: false, error: 'Pflichtfelder fehlen (codename, industry, region, short_description)' });
  const existing = await db.get('SELECT id FROM projects WHERE codename = ?', [codename]);
  if (existing) return res.status(409).json({ success: false, error: 'Name/Codename bereits vergeben' });

  const projectId = await db.insert(`
    INSERT INTO projects (codename, industry, region, revenue_band, ebitda_band, deal_type, short_description, highlights, status,
      mandate_type, stage, investment_needed, equity_stake, post_money_valuation, tam_band, sector_emoji, location_city,
      created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    codename, industry, region, revenue_band || '—', ebitda_band || '—',
    deal_type || '', short_description, JSON.stringify(highlights || []), status || 'draft',
    mandate_type || 'ma', stage || null, investment_needed || null, equity_stake || null,
    post_money_valuation || null, tam_band || null, sector_emoji || null, location_city || null,
    req.user.id,
  ]);
  db.auditLog(req.user.id, 'CREATE_PROJECT', 'project', projectId, codename, req.ip);
  res.status(201).json({ success: true, data: { id: projectId } });
}));

router.put('/projects/:id', ...isAdmin, wrap(async (req, res) => {
  const { codename, industry, region, revenue_band, ebitda_band, deal_type, short_description, highlights, status,
          mandate_type, stage, investment_needed, equity_stake, post_money_valuation, tam_band, sector_emoji, location_city } = req.body;
  const project = await db.get('SELECT id FROM projects WHERE id = ?', [req.params.id]);
  if (!project) return res.status(404).json({ success: false, error: 'Projekt nicht gefunden' });
  await db.run(`
    UPDATE projects SET
      codename=COALESCE(?,codename), industry=COALESCE(?,industry), region=COALESCE(?,region),
      revenue_band=COALESCE(?,revenue_band), ebitda_band=COALESCE(?,ebitda_band),
      deal_type=COALESCE(?,deal_type), short_description=COALESCE(?,short_description),
      highlights=COALESCE(?,highlights), status=COALESCE(?,status),
      mandate_type=COALESCE(?,mandate_type), stage=COALESCE(?,stage),
      investment_needed=COALESCE(?,investment_needed), equity_stake=COALESCE(?,equity_stake),
      post_money_valuation=COALESCE(?,post_money_valuation), tam_band=COALESCE(?,tam_band),
      sector_emoji=COALESCE(?,sector_emoji), location_city=COALESCE(?,location_city),
      updated_at=now() WHERE id=?
  `, [
    codename||null, industry||null, region||null, revenue_band||null, ebitda_band||null,
    deal_type||null, short_description||null, highlights?JSON.stringify(highlights):null, status||null,
    mandate_type||null, stage||null, investment_needed||null, equity_stake||null,
    post_money_valuation||null, tam_band||null, sector_emoji||null, location_city||null,
    req.params.id,
  ]);
  db.auditLog(req.user.id, 'UPDATE_PROJECT', 'project', req.params.id, null, req.ip);
  res.json({ success: true, data: { message: 'Aktualisiert' } });
}));

// Publish project (set active) — synchronisiert deal_status
router.put('/projects/:id/publish', ...isAdmin, wrap(async (req, res) => {
  const project = await db.get('SELECT id, codename, deal_status FROM projects WHERE id = ?', [req.params.id]);
  if (!project) return res.status(404).json({ success: false, error: 'Projekt nicht gefunden' });
  await db.run(`UPDATE projects SET status = 'active', deal_status = CASE WHEN deal_status = 'draft' THEN 'teaser_live' ELSE deal_status END, updated_at = now() WHERE id = ?`, [req.params.id]);
  db.auditLog(req.user.id, 'PROJECT_PUBLISHED', 'project', req.params.id, project.codename, req.ip);
  db.activityLog(req.user.id, 'DEAL_STATUS_TEASER_LIVE', 'deal', req.params.id, req.ip);
  res.json({ success: true, data: { message: 'Projekt veröffentlicht' } });
}));

// Unpublish project (set draft) — synchronisiert deal_status
router.put('/projects/:id/unpublish', ...isAdmin, wrap(async (req, res) => {
  const project = await db.get('SELECT id, codename FROM projects WHERE id = ?', [req.params.id]);
  if (!project) return res.status(404).json({ success: false, error: 'Projekt nicht gefunden' });
  await db.run(`UPDATE projects SET status = 'draft', deal_status = 'draft', updated_at = now() WHERE id = ?`, [req.params.id]);
  db.auditLog(req.user.id, 'PROJECT_UNPUBLISHED', 'project', req.params.id, project.codename, req.ip);
  db.activityLog(req.user.id, 'DEAL_STATUS_DRAFT', 'deal', req.params.id, req.ip);
  res.json({ success: true, data: { message: 'Projekt zurückgezogen (Entwurf)' } });
}));

// ── Deal-Zustandsautomat (Sprint 2) ───────────────────────────────────────
// Deal-Status setzen — nur erlaubte Übergänge (State Machine wird serverseitig
// erzwungen, kein freies Setzen möglich)
router.put('/projects/:id/deal-status', ...isAdmin, wrap(async (req, res) => {
  const { deal_status } = req.body;
  const project = await db.get('SELECT id, codename, deal_status FROM projects WHERE id = ?', [req.params.id]);
  if (!project) return res.status(404).json({ success: false, error: 'Projekt nicht gefunden' });
  if (!canTransitionDeal(project.deal_status, deal_status)) {
    return res.status(400).json({
      success: false,
      error: `Ungültiger Übergang: ${project.deal_status} → ${deal_status}`,
      allowed: DEAL_TRANSITIONS[project.deal_status] || [],
    });
  }
  await db.run(`UPDATE projects SET deal_status = ?, updated_at = now() WHERE id = ?`, [deal_status, req.params.id]);
  db.activityLog(req.user.id, `DEAL_STATUS_${deal_status.toUpperCase()}`, 'deal', req.params.id, req.ip);
  db.auditLog(req.user.id, 'DEAL_STATUS_CHANGED', 'project', req.params.id, `${project.deal_status} → ${deal_status}`, req.ip);
  res.json({ success: true, data: { deal_status } });
}));

// ── Nutzer-Zuordnung zu Projekten (Pflegerechte) ──────────────────────────
router.get('/projects/:id/members', ...isAdmin, wrap(async (req, res) => {
  const members = await db.all(`
    SELECT pm.id, pm.user_id, pm.member_role, pm.created_at,
           u.first_name || ' ' || u.last_name AS name, u.email, u.company, u.role
    FROM project_members pm JOIN users u ON u.id = pm.user_id
    WHERE pm.project_id = ? ORDER BY pm.created_at
  `, [req.params.id]);
  res.json({ success: true, data: members });
}));

router.post('/projects/:id/members', ...isAdmin, wrap(async (req, res) => {
  const { user_id } = req.body;
  if (!user_id) return res.status(400).json({ success: false, error: 'user_id fehlt' });
  const project = await db.get('SELECT id, codename FROM projects WHERE id = ?', [req.params.id]);
  if (!project) return res.status(404).json({ success: false, error: 'Projekt nicht gefunden' });
  const user = await db.get('SELECT id, email, first_name FROM users WHERE id = ?', [user_id]);
  if (!user) return res.status(404).json({ success: false, error: 'Nutzer nicht gefunden' });
  await db.run(`
    INSERT INTO project_members (project_id, user_id) VALUES (?, ?)
    ON CONFLICT (project_id, user_id) DO NOTHING
  `, [req.params.id, user_id]);
  db.auditLog(req.user.id, 'PROJECT_MEMBER_ADDED', 'project', req.params.id, `${user.email} zugeordnet`, req.ip);
  // Zugeordneten Nutzer informieren
  const { sendProcessUpdateEmail } = require('../utils/email');
  sendProcessUpdateEmail({
    to: user.email, firstName: user.first_name,
    title: `Sie wurden dem Mandat ${project.codename} zugeordnet`,
    message: `Sie können das Mandat <strong>${project.codename}</strong> ab sofort über den Marktplatz einsehen und pflegen (Daten, Bild, Beschreibung).`,
    ctaLabel: 'Zum Mandat', ctaPath: `/projekte/${req.params.id}`,
  }).catch(() => {});
  res.status(201).json({ success: true, data: { message: 'Nutzer zugeordnet' } });
}));

router.delete('/projects/:id/members/:userId', ...isAdmin, wrap(async (req, res) => {
  await db.run('DELETE FROM project_members WHERE project_id = ? AND user_id = ?', [req.params.id, req.params.userId]);
  db.auditLog(req.user.id, 'PROJECT_MEMBER_REMOVED', 'project', req.params.id, `User #${req.params.userId} entfernt`, req.ip);
  res.json({ success: true, data: { message: 'Zuordnung entfernt' } });
}));

// Interessentenliste je Deal mit Funnel-Stage (Basis für Sprint-4-CRM)
router.get('/projects/:id/interests', ...isAdmin, wrap(async (req, res) => {
  const interests = await db.all(`
    SELECT i.*, u.first_name || ' ' || u.last_name AS buyer_name, u.email AS buyer_email, u.company AS buyer_company
    FROM interests i JOIN users u ON u.id = i.buyer_id
    WHERE i.project_id = ? ORDER BY i.updated_at DESC
  `, [req.params.id]);
  res.json({ success: true, data: interests });
}));

// ── Users ─────────────────────────────────────────────────────────────────
router.get('/users', ...isAdmin, wrap(async (req, res) => {
  const users = await db.all(`
    SELECT u.id, u.email, u.first_name, u.last_name, u.company, u.role, u.buyer_type,
      u.is_active, u.is_approved, u.created_at,
      (SELECT COUNT(*)::int FROM nda_requests nr WHERE nr.user_id = u.id) as nda_count,
      (SELECT COUNT(*)::int FROM nda_requests nr WHERE nr.user_id = u.id AND nr.status='approved') as approved_count
    FROM users u
    WHERE u.role NOT IN ('super_admin', 'advisor')
    ORDER BY u.is_approved ASC, u.created_at DESC
  `);
  res.json({ success: true, data: users });
}));

// Approve user
router.put('/users/:id/approve', ...isAdmin, wrap(async (req, res) => {
  const user = await db.get('SELECT id, email, first_name FROM users WHERE id = ?', [req.params.id]);
  if (!user) return res.status(404).json({ success: false, error: 'Nutzer nicht gefunden' });
  await db.run('UPDATE users SET is_approved = 1, is_active = 1 WHERE id = ?', [req.params.id]);
  db.auditLog(req.user.id, 'USER_APPROVED', 'user', user.id, user.email, req.ip);
  console.log(`✅ User freigegeben: ${user.first_name} <${user.email}>`);
  // Nutzer informieren: Zugang ist jetzt nutzbar
  const { sendAccountApprovedEmail } = require('../utils/email');
  sendAccountApprovedEmail({ to: user.email, firstName: user.first_name }).catch(() => {});
  res.json({ success: true, data: { message: `${user.first_name} wurde freigegeben` } });
}));

// Deactivate/reject user
router.put('/users/:id/deactivate', ...isAdmin, wrap(async (req, res) => {
  const user = await db.get('SELECT id, email FROM users WHERE id = ?', [req.params.id]);
  if (!user) return res.status(404).json({ success: false, error: 'Nutzer nicht gefunden' });
  await db.run('UPDATE users SET is_active = 0, is_approved = 0 WHERE id = ?', [req.params.id]);
  db.auditLog(req.user.id, 'USER_DEACTIVATED', 'user', user.id, user.email, req.ip);
  res.json({ success: true, data: { message: 'Nutzer deaktiviert' } });
}));

// Nutzer-Detail (Pitchbook-Ansicht): Kontaktdaten, Selbstdarstellung,
// Einwilligung, Interessen/NDAs, Suchprofil
router.get('/users/:id', ...isAdmin, wrap(async (req, res) => {
  const user = await db.get(`
    SELECT id, email, role, first_name, last_name, company, position, buyer_type, phone,
           about, website, linkedin_url, is_active, is_approved, privacy_consent_at, created_at
    FROM users WHERE id = ?`, [req.params.id]);
  if (!user) return res.status(404).json({ success: false, error: 'Nutzer nicht gefunden' });
  const profile = await db.get('SELECT * FROM buyer_profiles WHERE user_id = ?', [req.params.id]);
  const interests = await db.all(`
    SELECT i.stage, i.requested_at, i.updated_at, p.codename
    FROM interests i JOIN projects p ON p.id = i.project_id
    WHERE i.buyer_id = ? ORDER BY i.updated_at DESC`, [req.params.id]);
  const ndas = await db.all(`
    SELECT nr.status, nr.requested_at, nr.signed_at, nr.approved_at, p.codename
    FROM nda_requests nr JOIN projects p ON p.id = nr.project_id
    WHERE nr.user_id = ? ORDER BY nr.requested_at DESC`, [req.params.id]);
  res.json({
    success: true,
    data: {
      user,
      profile: profile ? { ...profile, industries: JSON.parse(profile.industries||'[]'), regions: JSON.parse(profile.regions||'[]'), deal_types: JSON.parse(profile.deal_types||'[]') } : null,
      interests, ndas,
    },
  });
}));

// Audit-Trail eines Nutzers als CSV (transparent herunterladbar)
router.get('/users/:id/audit-export', ...isAdmin, wrap(async (req, res) => {
  const user = await db.get('SELECT id, email FROM users WHERE id = ?', [req.params.id]);
  if (!user) return res.status(404).json({ success: false, error: 'Nutzer nicht gefunden' });
  const audit = await db.all(
    `SELECT created_at AS ts, action, resource_type AS resource, details, ip_address AS ip FROM audit_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT 5000`,
    [req.params.id]);
  const activity = await db.all(
    `SELECT ts, action, resource, NULL AS details, ip FROM activity_log WHERE actor_id = ? ORDER BY ts DESC LIMIT 5000`,
    [req.params.id]);
  const rows = [...audit, ...activity].sort((a, b) => new Date(b.ts) - new Date(a.ts));
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = ['Zeitpunkt;Aktion;Ressource;Details;IP',
    ...rows.map(r => [new Date(r.ts).toLocaleString('de-DE', { timeZone: 'Europe/Berlin' }), r.action, r.resource, r.details, r.ip].map(esc).join(';'))
  ].join('\n');
  db.auditLog(req.user.id, 'ADMIN_AUDIT_EXPORT', 'user', user.id, user.email, req.ip);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="AuditTrail_User${user.id}.csv"`);
  res.send('﻿' + csv);
}));

// ── DSGVO-Löschung (dokumentierter Löschpfad) ─────────────────────────────
// Löscht den Nutzer samt Profil/Interessen/NDA-Anfragen (FK-Kaskaden) und
// signierten NDA-PDFs. Personenbezug in Logs wird entfernt (IP/Details);
// dafür wird der Append-only-Trigger des activity_log innerhalb der
// Transaktion kontrolliert ausgesetzt und die Löschung selbst protokolliert.
router.delete('/users/:id', ...isAdmin, wrap(async (req, res) => {
  const user = await db.get('SELECT id, email, role FROM users WHERE id = ?', [req.params.id]);
  if (!user) return res.status(404).json({ success: false, error: 'Nutzer nicht gefunden' });
  if (['super_admin', 'advisor'].includes(user.role)) {
    return res.status(400).json({ success: false, error: 'Admin-Konten können nicht über diesen Weg gelöscht werden' });
  }

  // Signierte NDA-PDFs von der Platte entfernen
  const fs = require('fs');
  const path = require('path');
  const { NDA_DIR } = require('../utils/ndaGenerator');
  const pdfs = await db.all(`SELECT signed_pdf_path FROM nda_requests WHERE user_id = ? AND signed_pdf_path IS NOT NULL`, [user.id]);
  for (const p of pdfs) {
    try { fs.unlinkSync(path.join(NDA_DIR, p.signed_pdf_path)); } catch { /* Datei ggf. schon weg */ }
  }

  await db.knex.transaction(async (trx) => {
    // Personenbezug in Audit-Logs entfernen (Aktionen bleiben pseudonymisiert erhalten)
    await trx.raw(`UPDATE audit_logs SET details = '[DSGVO-gelöscht]', ip_address = NULL, user_id = NULL WHERE user_id = ?`, [user.id]);
    // activity_log ist append-only — Trigger für den dokumentierten Löschpfad kontrolliert aussetzen
    await trx.raw(`ALTER TABLE activity_log DISABLE TRIGGER trg_activity_log_append_only`);
    await trx.raw(`UPDATE activity_log SET ip = NULL, actor_id = NULL WHERE actor_id = ?`, [user.id]);
    await trx.raw(`ALTER TABLE activity_log ENABLE TRIGGER trg_activity_log_append_only`);
    // ndas-Referenzen kappen (SET NULL via FK), dann Nutzer löschen (Kaskaden)
    await trx.raw(`DELETE FROM users WHERE id = ?`, [user.id]);
  });

  db.auditLog(req.user.id, 'USER_GDPR_DELETED', 'user', req.params.id, `DSGVO-Löschung durchgeführt`, req.ip);
  db.activityLog(req.user.id, 'USER_GDPR_DELETED', 'user', req.params.id, req.ip);
  console.log(`🗑️  DSGVO-Löschung: User #${user.id} (${user.email}) durch Admin #${req.user.id}`);
  res.json({ success: true, data: { message: 'Nutzer DSGVO-konform gelöscht (Daten entfernt, Vorgänge pseudonymisiert)' } });
}));

// ── NDAs ──────────────────────────────────────────────────────────────────
router.get('/ndas', ...isAdmin, wrap(async (req, res) => {
  const ndas = await db.all(`
    SELECT nr.*, u.first_name || ' ' || u.last_name as user_name, u.email as user_email, u.company as user_company,
      p.codename as project_codename, p.industry as project_industry,
      a.first_name || ' ' || a.last_name as approved_by_name
    FROM nda_requests nr
    JOIN users u ON u.id = nr.user_id JOIN projects p ON p.id = nr.project_id
    LEFT JOIN users a ON a.id = nr.approved_by ORDER BY nr.requested_at DESC
  `);
  res.json({ success: true, data: ndas });
}));

router.put('/ndas/:id/approve', ...isAdmin, wrap(async (req, res) => {
  const nda = await db.get('SELECT * FROM nda_requests WHERE id = ?', [req.params.id]);
  if (!nda) return res.status(404).json({ success: false, error: 'NDA nicht gefunden' });
  await db.run(`UPDATE nda_requests SET status='approved', approved_at=now(), approved_by=? WHERE id=?`, [req.user.id, req.params.id]);
  // Zustandsautomat: Datenraum-Gate öffnen
  await setStage(nda.user_id, nda.project_id, 'dataroom_granted', req.user.id, req.ip);
  db.auditLog(req.user.id, 'NDA_APPROVED', 'nda_request', nda.id, null, req.ip);
  // Investor informieren: Vollzugriff freigeschaltet
  {
    const buyer = await db.get('SELECT email, first_name FROM users WHERE id = ?', [nda.user_id]);
    const proj = await db.get('SELECT codename FROM projects WHERE id = ?', [nda.project_id]);
    if (buyer) {
      const { sendProcessUpdateEmail } = require('../utils/email');
      sendProcessUpdateEmail({
        to: buyer.email, firstName: buyer.first_name,
        title: `Datenraum freigeschaltet — ${proj ? proj.codename : 'Mandat'}`,
        message: `Ihr Zugang für das Mandat <strong>${proj ? proj.codename : ''}</strong> wurde vollständig freigegeben. Sie haben ab sofort Zugriff auf alle Detailinformationen und den Datenraum.`,
        ctaLabel: 'Zum Mandat', ctaPath: `/projekte/${nda.project_id}`,
      }).catch(() => {});
    }
  }
  res.json({ success: true, data: { message: 'NDA freigegeben' } });
}));

router.put('/ndas/:id/reject', ...isAdmin, wrap(async (req, res) => {
  const nda = await db.get('SELECT * FROM nda_requests WHERE id = ?', [req.params.id]);
  if (!nda) return res.status(404).json({ success: false, error: 'NDA nicht gefunden' });
  await db.run(`UPDATE nda_requests SET status='rejected', rejected_at=now() WHERE id=?`, [req.params.id]);
  // Zustandsautomat: Interesse ablehnen (terminal)
  await setStage(nda.user_id, nda.project_id, 'rejected', req.user.id, req.ip);
  db.auditLog(req.user.id, 'NDA_REJECTED', 'nda_request', nda.id, null, req.ip);
  // Investor informieren
  {
    const buyer = await db.get('SELECT email, first_name FROM users WHERE id = ?', [nda.user_id]);
    const proj = await db.get('SELECT codename FROM projects WHERE id = ?', [nda.project_id]);
    if (buyer) {
      const { sendProcessUpdateEmail } = require('../utils/email');
      sendProcessUpdateEmail({
        to: buyer.email, firstName: buyer.first_name,
        title: `Rückmeldung zu Ihrer Anfrage — ${proj ? proj.codename : 'Mandat'}`,
        message: `Ihre Interessensbekundung für das Mandat <strong>${proj ? proj.codename : ''}</strong> konnte leider nicht freigegeben werden. Bei Rückfragen wenden Sie sich gern an unser Team.`,
      }).catch(() => {});
    }
  }
  res.json({ success: true, data: { message: 'NDA abgelehnt' } });
}));

// ── Activity + Audit ──────────────────────────────────────────────────────
router.get('/activity', ...isAdmin, wrap(async (req, res) => {
  const logs = await db.all(`
    SELECT al.*, u.first_name || ' ' || u.last_name as user_name, u.email as user_email
    FROM audit_logs al LEFT JOIN users u ON u.id = al.user_id ORDER BY al.created_at DESC LIMIT 50
  `);
  res.json({ success: true, data: logs });
}));

router.get('/audit-logs', ...isAdmin, wrap(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 50;
  const offset = (page - 1) * limit;
  const action = req.query.action || null;

  let query = `SELECT al.*, u.email, u.first_name, u.last_name FROM audit_logs al LEFT JOIN users u ON al.user_id = u.id`;
  let countQuery = `SELECT COUNT(*)::int as count FROM audit_logs al`;
  const params = [];

  if (action) {
    query += ` WHERE al.action = ?`;
    countQuery += ` WHERE al.action = ?`;
    params.push(action);
  }

  query += ` ORDER BY al.created_at DESC LIMIT ? OFFSET ?`;
  const logs = await db.all(query, [...params, limit, offset]);
  const totalRow = await db.get(countQuery, params);
  const total = totalRow ? totalRow.count : 0;

  res.json({ success: true, data: { logs, total, page, pages: Math.ceil(total / limit) } });
}));

module.exports = router;
