// CapitalMatch – Admin-Route — PostgreSQL/Knex
const express = require('express');
const db = require('../db/database');
const { authenticate, requireRole } = require('../middleware/auth');
const wrap = require('../utils/asyncHandler');
const { setStage } = require('../middleware/gates');
const { canTransitionDeal, DEAL_TRANSITIONS } = require('../utils/dealStateMachine');
const router = express.Router();
// Sprint 5 — Rollenmodell: super_admin (Plattform), tenant_owner (eigener
// Mandant, RLS-beschränkt), advisor (Berater), auditor (nur Lesezugriff auf
// Protokolle), seller, buyer.
const isAdmin = [authenticate, requireRole('super_admin', 'advisor', 'tenant_owner')];
const isSuperAdmin = [authenticate, requireRole('super_admin')];
const isAuditorOrAdmin = [authenticate, requireRole('super_admin', 'advisor', 'tenant_owner', 'auditor')];

// Sprint 10: Käufer mit passendem Suchprofil (Sofort-Frequenz) benachrichtigen.
// Sprint 18: gibt die Menge der benachrichtigten Nutzer zurück — Grundlage der
// Anti-Doppel-Mail-Kaskade (Suchprofil → Ähnlichkeit → Newsletter).
async function notifyMatchingBuyers(projectId) {
  const notified = new Set();
  const p = await db.get(`SELECT id, codename, industry, region, deal_type, mandate_type, short_description FROM projects WHERE id = ?`, [projectId]);
  if (!p) return notified;
  const profiles = await db.all(`
    SELECT sp.id, sp.name, sp.criteria_json, u.id AS user_id, u.email, u.first_name
    FROM search_profiles sp JOIN users u ON u.id = sp.user_id
    WHERE sp.notify_frequency = 'instant' AND u.is_active = 1`);
  const matches = (c) => {
    if (c.industry && c.industry !== p.industry) return false;
    if (c.region && c.region !== p.region) return false;
    if (c.deal_type && c.deal_type !== p.deal_type) return false;
    if (c.mandate_type && c.mandate_type !== p.mandate_type) return false;
    if (c.search) { const s = (c.search || '').toLowerCase(); if (!(`${p.codename} ${p.short_description || ''}`.toLowerCase().includes(s))) return false; }
    return true;
  };
  const { sendProcessUpdateEmail } = require('../utils/email');
  for (const prof of profiles) {
    let c = {}; try { c = JSON.parse(prof.criteria_json || '{}'); } catch {}
    if (!matches(c)) continue;
    sendProcessUpdateEmail({
      to: prof.email, firstName: prof.first_name,
      title: `Neues passendes Mandat — ${p.codename}`,
      message: `zu Ihrem Suchprofil <strong>„${prof.name}"</strong> ist ein neues Mandat verfügbar: <strong>${p.codename}</strong> (${[p.industry, p.region].filter(Boolean).join(', ')}). Sehen Sie sich das Kurzprofil an und fordern Sie bei Interesse die vertraulichen Unterlagen an.`,
      ctaLabel: 'Mandat ansehen', ctaPath: `/projekte/${p.id}`,
    }).catch(() => {});
    notified.add(prof.user_id);
    db.run(`UPDATE search_profiles SET last_notified_at = now() WHERE id = ?`, [prof.id]).catch(() => {});
  }
  return notified;
}

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
  // Sprint 4: Datenraum-Zugriffe (7 Tage) + fällige Aufgaben
  const dr = await db.get(`
    SELECT COUNT(*)::int AS c FROM activity_log
    WHERE action IN ('DOWNLOAD_DOCUMENT','DOWNLOAD_SIGNED_LINK','ACCESS_DETAILS','ACCESS_DOCLIST')
      AND ts >= now() - interval '7 days'
  `);
  const t = await db.get(`
    SELECT COUNT(*) FILTER (WHERE status='open')::int AS open,
           COUNT(*) FILTER (WHERE status='open' AND due_date <= CURRENT_DATE)::int AS due
    FROM tasks
  `);
  const qa = await db.get(`SELECT COUNT(*) FILTER (WHERE status='open')::int AS open FROM qa_threads`);

  res.json({
    success: true,
    data: {
      projects: { total: p.total, active: p.active, draft: p.draft },
      users:    { total: u.total, pending: u.pending, this_week: u.this_week },
      ndas:     { requested: n.requested, signed: n.signed, approved: n.approved, total: n.total },
      dataroom: { accesses_7d: dr.c },
      tasks:    { open: t.open, due: t.due },
      qa:       { open: qa.open },
    },
  });
}));

// ── Sprint 16: Analytics-Overview (Funnel, Zeitreihen, Ranking, Badges) ─────
// Zeitfenster-parametrisiert (?range=7d|30d|90d|ytd). Nur Admin/Berater.
// Jeder Block ist defensiv gekapselt: ein fehlschlagendes Aggregat darf das
// Dashboard nicht als Ganzes killen.
router.get('/analytics', ...isAdmin, wrap(async (req, res) => {
  const RANGES = { '7d': 7, '30d': 30, '90d': 90 };
  const rangeKey = ['7d', '30d', '90d', 'ytd'].includes(req.query.range) ? req.query.range : '30d';
  const days = rangeKey === 'ytd' ? null : RANGES[rangeKey];
  // Fensterbedingung für Spalten unterschiedlicher Tabellen
  const since = (col) => days === null
    ? `${col} >= date_trunc('year', now())`
    : `${col} >= now() - interval '${days} days'`;
  const safe = async (fn, fallback) => { try { return await fn(); } catch (e) { console.warn('[analytics]', e.message); return fallback; } };

  // 1) Funnel — robuste Quellen (interests + nda_requests + projects.deal_status)
  const funnel = await safe(async () => {
    const i = await db.get(`SELECT
        COUNT(*) FILTER (WHERE stage <> 'rejected')::int AS interested,
        COUNT(*) FILTER (WHERE stage = 'loi')::int       AS loi
      FROM interests`);
    const n = await db.get(`SELECT
        COUNT(*)::int AS requested,
        COUNT(*) FILTER (WHERE status IN ('signed','approved'))::int AS signed,
        COUNT(*) FILTER (WHERE status = 'approved')::int             AS dataroom
      FROM nda_requests`);
    const c = await db.get(`SELECT COUNT(*) FILTER (WHERE deal_status = 'closed')::int AS closed FROM projects`);
    return [
      { key: 'interested', label: 'Interesse bekundet', value: i.interested },
      { key: 'nda_requested', label: 'NDA angefragt', value: n.requested },
      { key: 'nda_signed', label: 'NDA unterzeichnet', value: n.signed },
      { key: 'dataroom', label: 'Datenraum frei', value: n.dataroom },
      { key: 'loi', label: 'LOI', value: i.loi },
      { key: 'closed', label: 'Closing', value: c.closed },
    ];
  }, []);

  // 2) Zeitreihen (täglich, im Fenster) — mit Lückenfüllung via generate_series
  const daySpan = days === null ? 365 : days;
  const seriesFor = (sql) => db.all(`
    WITH d AS (
      SELECT generate_series(date_trunc('day', now()) - interval '${daySpan - 1} days',
                             date_trunc('day', now()), interval '1 day')::date AS day
    )
    SELECT to_char(d.day,'YYYY-MM-DD') AS day, COALESCE(x.c,0)::int AS v
    FROM d LEFT JOIN (${sql}) x ON x.day = d.day
    ORDER BY d.day ASC`);
  const timeseries = await safe(async () => ({
    new_users:  await seriesFor(`SELECT created_at::date AS day, COUNT(*) c FROM users WHERE role NOT IN ('super_admin','advisor') GROUP BY 1`),
    ndas:       await seriesFor(`SELECT requested_at::date AS day, COUNT(*) c FROM nda_requests GROUP BY 1`),
    dataroom:   await seriesFor(`SELECT ts::date AS day, COUNT(*) c FROM activity_log WHERE action IN ('DOWNLOAD_DOCUMENT','DOWNLOAD_SIGNED_LINK','ACCESS_DETAILS','ACCESS_DOCLIST') GROUP BY 1`),
    messages:   await seriesFor(`SELECT created_at::date AS day, COUNT(*) c FROM messages WHERE type = 'user' GROUP BY 1`),
  }), { new_users: [], ndas: [], dataroom: [], messages: [] });

  // 3) Mandats-Ranking (aktive Mandate) — Interessenten, NDAs, Alter, letzte Aktivität, Stagnation
  const mandates = await safe(() => db.all(`
    SELECT p.id, p.codename, p.industry, p.deal_status, p.mandate_type,
      EXTRACT(DAY FROM now() - p.created_at)::int AS age_days,
      (SELECT COUNT(*)::int FROM interests i WHERE i.project_id = p.id AND i.stage <> 'rejected') AS interested,
      (SELECT COUNT(*)::int FROM nda_requests nr WHERE nr.project_id = p.id) AS ndas,
      (SELECT COUNT(*)::int FROM nda_requests nr WHERE nr.project_id = p.id AND nr.status IN ('signed','approved')) AS signed,
      GREATEST(
        COALESCE((SELECT MAX(updated_at) FROM interests i WHERE i.project_id = p.id), p.created_at),
        COALESCE((SELECT MAX(created_at) FROM messages m WHERE m.project_id = p.id), p.created_at),
        COALESCE((SELECT MAX(requested_at) FROM nda_requests nr WHERE nr.project_id = p.id), p.created_at)
      ) AS last_activity
    FROM projects p
    WHERE p.status = 'active'
    ORDER BY interested DESC, ndas DESC, last_activity DESC
    LIMIT 20`), []);
  // Stagnations-Flag anreichern (kein Fortschritt seit > 14 Tagen)
  const now = Date.now();
  (mandates || []).forEach(m => {
    const la = m.last_activity ? new Date(m.last_activity).getTime() : now;
    m.idle_days = Math.max(0, Math.floor((now - la) / 86400000));
    m.stagnating = m.idle_days > 14 && !['closed', 'withdrawn'].includes(m.deal_status);
  });

  // 4) Letzte Aktivitäten (Feed)
  const recent = await safe(() => db.all(`
    SELECT a.action, a.resource, a.resource_id, a.ts,
           COALESCE(u.first_name || ' ' || u.last_name, 'System') AS actor
    FROM activity_log a LEFT JOIN users u ON u.id = a.actor_id
    ORDER BY a.ts DESC LIMIT 15`), []);

  // 5) Badges für die Schnellzugriff-Kacheln (Live-Kennzahlen statt statischer Links)
  const badges = await safe(async () => {
    const g = async (sql, fb = 0) => { try { const r = await db.get(sql); return r ? Number(Object.values(r)[0]) || 0 : fb; } catch { return fb; } };
    return {
      pipeline: await g(`SELECT COUNT(*)::int c FROM projects WHERE deal_status IN ('in_diligence','loi')`),
      projects: await g(`SELECT COUNT(*)::int c FROM projects WHERE status='active'`),
      ndas: await g(`SELECT COUNT(*)::int c FROM nda_requests WHERE status IN ('requested','sent')`),
      users: await g(`SELECT COUNT(*)::int c FROM users WHERE is_approved=0 AND role NOT IN ('super_admin','advisor')`),
      feedback: await g(`SELECT COUNT(*)::int c FROM feedback WHERE status='new'`),
      qa: await g(`SELECT COUNT(*)::int c FROM qa_threads WHERE status='open'`),
      detvals: await g(`SELECT COUNT(*)::int c FROM detailed_valuations WHERE status='submitted'`),
      leads: await g(`SELECT COUNT(*)::int c FROM valuation_leads`),
      activity_today: await g(`SELECT COUNT(*)::int c FROM activity_log WHERE ts >= date_trunc('day', now())`),
    };
  }, {});

  // 6) Conversion-Kennzahlen (im Fenster: neue Interessen/NDAs)
  const conv = await safe(async () => {
    const r = await db.get(`SELECT
        (SELECT COUNT(*)::int FROM nda_requests WHERE ${since('requested_at')}) AS nda_new,
        (SELECT COUNT(*)::int FROM nda_requests WHERE status IN ('signed','approved') AND ${since('COALESCE(signed_at, requested_at)')}) AS signed_new,
        (SELECT COUNT(*)::int FROM users WHERE role NOT IN ('super_admin','advisor') AND ${since('created_at')}) AS users_new,
        (SELECT COUNT(*)::int FROM messages WHERE type='user' AND ${since('created_at')}) AS msgs_new`);
    return r || {};
  }, {});

  res.json({ success: true, data: { range: rangeKey, funnel, timeseries, mandates, recent, badges, conversions: conv } });
}));

// ── Birdview: Ansicht als anderer Nutzer öffnen ────────────────────────────
// Nur Super-Admin. Das ausgestellte Token trägt den Claim `imp` (eigene Id) —
// damit ist der Zugriff serverseitig schreibgeschützt (siehe middleware/auth.js).
router.post('/impersonate/:userId', ...isSuperAdmin, wrap(async (req, res) => {
  const targetId = Number(req.params.userId);
  if (targetId === req.user.id) return res.status(400).json({ success: false, error: 'Sie sind bereits Sie selbst.' });

  const target = await db.get(
    'SELECT id, email, role, first_name, last_name, is_active FROM users WHERE id = ?', [targetId]);
  if (!target) return res.status(404).json({ success: false, error: 'Nutzer nicht gefunden' });
  if (!target.is_active) return res.status(400).json({ success: false, error: 'Nutzer ist deaktiviert.' });
  if (target.role === 'super_admin') {
    return res.status(403).json({ success: false, error: 'Die Ansicht eines anderen Super-Admins ist nicht möglich.' });
  }

  // Revisionssicherer Nachweis: wer sieht wessen Ansicht
  const logId = await db.insert(
    `INSERT INTO impersonation_log (tenant_id, admin_id, target_user_id, reason, ip)
     VALUES (?, ?, ?, ?, ?)`,
    [req.tenantId || 1, req.user.id, targetId, req.body.reason || null, req.ip]).catch(() => null);
  db.auditLog(req.user.id, 'IMPERSONATE_START', 'user', targetId,
    `Birdview als ${target.email} (${target.role})`, req.ip);

  const jwt = require('jsonwebtoken');
  const token = jwt.sign(
    { userId: targetId, imp: req.user.id, log: logId },
    process.env.JWT_SECRET || 'phalanx-secret',
    { expiresIn: '2h' },     // bewusst kurzlebig
  );
  res.json({
    success: true,
    data: {
      token,
      user: { id: target.id, email: target.email, role: target.role, first_name: target.first_name, last_name: target.last_name },
    },
  });
}));

// Birdview-Protokoll (wer hat wann wessen Ansicht geöffnet)
router.get('/impersonations', ...isAdmin, wrap(async (req, res) => {
  const rows = await db.all(`
    SELECT il.id, il.started_at, il.ended_at, il.ip, il.reason,
           a.first_name || ' ' || a.last_name AS admin_name, a.email AS admin_email,
           t.first_name || ' ' || t.last_name AS target_name, t.email AS target_email
    FROM impersonation_log il
    JOIN users a ON a.id = il.admin_id
    JOIN users t ON t.id = il.target_user_id
    ORDER BY il.started_at DESC LIMIT 200`).catch(() => []);
  res.json({ success: true, data: rows });
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
  // Sprint 18: alten Stand laden, um Änderungen zu erkennen (Follower-Mail / Publish-Kaskade)
  const project = await db.get(
    `SELECT id, codename, status, industry, region, revenue_band, ebitda_band, deal_type, short_description
     FROM projects WHERE id = ?`, [req.params.id]);
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

  // Sprint 18: Veröffentlichung auch über den generischen Update-Weg abfangen …
  const notify = require('../utils/notify');
  if (status === 'active' && project.status !== 'active') {
    (async () => {
      const notified = await notifyMatchingBuyers(req.params.id).catch(() => new Set());
      await notify.notifyProjectPublished(req.params.id, notified);
    })().catch(() => {});
  } else if (project.status === 'active') {
    // … und inhaltliche Änderungen an einem LIVE-Mandat den Followern melden.
    const changed = [];
    const cmp = (val, oldVal, label) => { if (val != null && String(val) !== String(oldVal ?? '')) changed.push(label); };
    cmp(industry, project.industry, 'Branche');
    cmp(region, project.region, 'Region');
    cmp(revenue_band, project.revenue_band, 'Umsatzband');
    cmp(ebitda_band, project.ebitda_band, 'Ergebnisband');
    cmp(deal_type, project.deal_type, 'Transaktionsart');
    cmp(short_description, project.short_description, 'Kurzbeschreibung');
    if (changed.length) {
      notify.notifyFollowers(req.params.id, {
        title: 'Mandat aktualisiert',
        message: `zu einem Mandat, dem Sie folgen, gibt es Neuigkeiten. Aktualisiert wurde: <strong>${changed.join(', ')}</strong>.`,
      }).catch(() => {});
    }
  }
  res.json({ success: true, data: { message: 'Aktualisiert' } });
}));

// Publish project (set active) — synchronisiert deal_status
router.put('/projects/:id/publish', ...isAdmin, wrap(async (req, res) => {
  const project = await db.get('SELECT id, codename, deal_status FROM projects WHERE id = ?', [req.params.id]);
  if (!project) return res.status(404).json({ success: false, error: 'Projekt nicht gefunden' });
  await db.run(`UPDATE projects SET status = 'active', deal_status = CASE WHEN deal_status = 'draft' THEN 'teaser_live' ELSE deal_status END, updated_at = now() WHERE id = ?`, [req.params.id]);
  db.auditLog(req.user.id, 'PROJECT_PUBLISHED', 'project', req.params.id, project.codename, req.ip);
  db.activityLog(req.user.id, 'DEAL_STATUS_TEASER_LIVE', 'deal', req.params.id, req.ip);
  // Sprint 10 + 18: Benachrichtigungs-Kaskade — jeder Nutzer erhält höchstens EINE Mail:
  //   1) Suchprofil-Treffer  2) Ähnlichkeitsvorschlag  3) Newsletter
  (async () => {
    const notified = await notifyMatchingBuyers(req.params.id).catch(() => new Set());
    await require('../utils/notify').notifyProjectPublished(req.params.id, notified);
  })().catch(() => {});
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

// ── Killswitch: Projekt ENDGÜLTIG löschen ──────────────────────────────────
// Entfernt das Mandat samt aller abhängigen Daten (Interessen, NDAs, Q&A,
// Aufgaben, Rechte, Zuordnungen — via FK-Kaskaden) und aller Dateien
// (Dokumente, Projektbild, signierte NDA-PDFs). Nicht umkehrbar.
router.delete('/projects/:id', ...isAdmin, wrap(async (req, res) => {
  const project = await db.get('SELECT id, codename, image_path FROM projects WHERE id = ?', [req.params.id]);
  if (!project) return res.status(404).json({ success: false, error: 'Projekt nicht gefunden' });

  const fs = require('fs');
  const path = require('path');
  const { NDA_DIR } = require('../utils/ndaGenerator');

  // Physische Dateien einsammeln und löschen
  const docs = await db.all(`SELECT file_path FROM documents WHERE project_id = ? AND file_path IS NOT NULL`, [project.id]);
  const ndaPdfs = await db.all(`SELECT signed_pdf_path FROM nda_requests WHERE project_id = ? AND signed_pdf_path IS NOT NULL`, [project.id]);
  for (const d of docs) { try { fs.unlinkSync(d.file_path); } catch { /* schon weg */ } }
  for (const n of ndaPdfs) { try { fs.unlinkSync(path.join(NDA_DIR, n.signed_pdf_path)); } catch { /* schon weg */ } }
  if (project.image_path) { try { fs.unlinkSync(project.image_path); } catch { /* schon weg */ } }

  // Datensatz löschen — FK-Kaskaden räumen alle abhängigen Tabellen ab
  await db.run(`DELETE FROM projects WHERE id = ?`, [project.id]);

  db.auditLog(req.user.id, 'PROJECT_KILLSWITCH', 'project', req.params.id,
    `"${project.codename}" endgültig gelöscht (${docs.length} Dokumente, ${ndaPdfs.length} NDA-PDFs)`, req.ip);
  db.activityLog(req.user.id, 'PROJECT_KILLSWITCH', 'project', req.params.id, req.ip);
  console.log(`🗑️  Killswitch: Projekt "${project.codename}" (#${project.id}) endgültig gelöscht durch Admin #${req.user.id}`);
  res.json({ success: true, data: { message: `Mandat "${project.codename}" wurde endgültig gelöscht` } });
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

  // Sprint 15: käuferrelevante Statuswechsel als Systemnachricht in die Deal-Timeline
  const DEAL_EVENT_MSG = {
    in_diligence: `🔎 Das Mandat „${project.codename}" ist in die Due-Diligence-Phase eingetreten.`,
    loi: `📝 Für „${project.codename}" liegt eine Absichtserklärung (LOI) vor.`,
    closed: `✅ Die Transaktion zu „${project.codename}" wurde erfolgreich abgeschlossen.`,
  };
  if (DEAL_EVENT_MSG[deal_status]) {
    require('../utils/dealChat').broadcastDealEvent({ project, body: DEAL_EVENT_MSG[deal_status] }).catch(() => {});
    // Sprint 18: zusätzlich per E-Mail an alle Follower des Mandats
    const STATUS_LABEL = { in_diligence: 'Due-Diligence-Phase', loi: 'Absichtserklärung (LOI)', closed: 'erfolgreich abgeschlossen' };
    require('../utils/notify').notifyFollowers(req.params.id, {
      title: 'Neuer Status',
      message: `ein Mandat, dem Sie folgen, hat einen neuen Stand erreicht: <strong>${STATUS_LABEL[deal_status]}</strong>.`,
    }).catch(() => {});
  }
  // Sprint 17: XP-Boni bei Deal-Fortschritt/Abschluss an die beteiligten Käufer
  if (deal_status === 'loi' || deal_status === 'closed') {
    (async () => {
      try {
        const xp = require('../utils/xp');
        const buyers = await xp.activeBuyerIds(req.params.id);
        await xp.awardMany(buyers, deal_status === 'closed' ? 'DEAL_CLOSED' : 'DEAL_LOI', { refType: 'project', refId: Number(req.params.id) });
      } catch (e) { console.warn('[xp deal]', e.message); }
    })();
  }

  // Sprint 5 — Billing-Hook: Setup-Gebühr je AKTIVIERTEM Deal-Prozess
  // (Feature-Flag: ENV BILLING_ENABLED=1 UND tenants.billing_enabled=1;
  //  doppelbuchungssicher über vorhandenes deal_setup-Event)
  try {
    const { getPaymentProvider, billingGloballyEnabled } = require('../providers/payment');
    if (deal_status === 'teaser_live' && billingGloballyEnabled()) {
      const tenant = await db.get(`SELECT * FROM tenants WHERE id = (SELECT tenant_id FROM projects WHERE id = ?)`, [req.params.id]);
      const already = await db.get(`SELECT id FROM billing_events WHERE project_id = ? AND event_type = 'deal_setup'`, [req.params.id]);
      if (tenant && tenant.billing_enabled === 1 && !already) {
        const provider = getPaymentProvider();
        const charge = await provider.chargeDealSetup(tenant, project);
        await db.run(
          `INSERT INTO billing_events (tenant_id, event_type, project_id, amount_cents, provider, provider_ref, status)
           VALUES (?, 'deal_setup', ?, ?, ?, ?, ?)`,
          [tenant.id, req.params.id, charge.amountCents, (process.env.PAYMENT_PROVIDER || 'stub'), charge.providerRef, charge.status === 'paid' ? 'paid' : 'recorded']
        );
        db.auditLog(req.user.id, 'BILLING_DEAL_SETUP', 'project', req.params.id, `${(charge.amountCents / 100).toFixed(2)} EUR (${charge.providerRef})`, req.ip);
      }
    }
  } catch (e) { console.warn('Billing-Hook:', e.message); }

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

  // Owner-Verbindung: ALTER TABLE (Trigger-Toggle) erfordert Tabellen-Owner —
  // dokumentierter DSGVO-Löschpfad, jede Nutzung wird protokolliert
  await db.ownerKnex.transaction(async (trx) => {
    await trx.raw(`SELECT set_config('app.tenant_id', '1', true)`);
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
  // Sprint 17: XP für Datenraum-Freigabe
  require('../utils/xp').award(nda.user_id, 'DATAROOM_GRANTED', { refType: 'project', refId: nda.project_id }).catch(() => {});
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

// ── Sprint 4: Q&A beantworten ─────────────────────────────────────────────
router.put('/questions/:id/answer', ...isAdmin, wrap(async (req, res) => {
  const { answer } = req.body;
  if (!answer || !answer.trim()) return res.status(400).json({ success: false, error: 'Antwort fehlt' });
  const q = await db.get('SELECT * FROM qa_threads WHERE id = ?', [req.params.id]);
  if (!q) return res.status(404).json({ success: false, error: 'Frage nicht gefunden' });
  await db.run(`UPDATE qa_threads SET answer = ?, status = 'answered', answered_at = now(), answered_by = ? WHERE id = ?`,
    [answer.trim(), req.user.id, req.params.id]);
  db.activityLog(req.user.id, 'QA_ANSWERED', 'qa', q.id, req.ip);
  // Fragesteller informieren
  const buyer = await db.get('SELECT email, first_name FROM users WHERE id = ?', [q.buyer_id]);
  const proj = await db.get('SELECT codename FROM projects WHERE id = ?', [q.project_id]);
  if (buyer) {
    const { sendProcessUpdateEmail } = require('../utils/email');
    sendProcessUpdateEmail({
      to: buyer.email, firstName: buyer.first_name,
      title: `Ihre Frage wurde beantwortet — ${proj ? proj.codename : 'Mandat'}`,
      message: `zu Ihrer Frage im Mandat <strong>${proj ? proj.codename : ''}</strong> liegt nun eine Antwort unseres Transaktionsberaters vor:<br/><br/>`
        + `<span style="display:block;background:#F4F8FC;border-left:3px solid #5B8FC9;padding:10px 14px;color:#555;margin-bottom:10px;"><em>Ihre Frage:</em><br/>${q.question}</span>`
        + `<span style="display:block;background:#f0fdf4;border-left:3px solid #16a34a;padding:10px 14px;color:#166534;"><em>Antwort:</em><br/>${answer.trim()}</span>`,
      ctaLabel: 'Im Mandat ansehen', ctaPath: `/projekte/${q.project_id}?tab=qa`,
    }).catch(() => {});
  }
  res.json({ success: true, data: { message: 'Antwort gespeichert' } });
}));

// ── Sprint 4: Granulare Datenraum-Rechte je Interessent ───────────────────
router.get('/projects/:id/permissions/:userId', ...isAdmin, wrap(async (req, res) => {
  const rows = await db.all(`SELECT resource, level FROM permissions WHERE project_id = ? AND user_id = ?`, [req.params.id, req.params.userId]);
  const dataroom = rows.find(r => r.resource === 'dataroom');
  res.json({ success: true, data: { dataroom: dataroom ? dataroom.level : 'none', qa: rows.some(r => r.resource === 'qa') } });
}));

router.put('/projects/:id/permissions/:userId', ...isAdmin, wrap(async (req, res) => {
  const { dataroom, qa } = req.body; // dataroom: 'download' | 'read' | 'none'; qa: bool
  if (dataroom === 'none') {
    await db.run(`DELETE FROM permissions WHERE project_id = ? AND user_id = ? AND resource = 'dataroom'`, [req.params.id, req.params.userId]);
  } else if (['read', 'download'].includes(dataroom)) {
    await db.run(`INSERT INTO permissions (project_id, user_id, resource, level) VALUES (?, ?, 'dataroom', ?)
      ON CONFLICT (project_id, user_id, resource) DO UPDATE SET level = EXCLUDED.level`, [req.params.id, req.params.userId, dataroom]);
  }
  if (qa === false) {
    await db.run(`DELETE FROM permissions WHERE project_id = ? AND user_id = ? AND resource = 'qa'`, [req.params.id, req.params.userId]);
  } else if (qa === true) {
    await db.run(`INSERT INTO permissions (project_id, user_id, resource, level) VALUES (?, ?, 'qa', 'qa')
      ON CONFLICT (project_id, user_id, resource) DO NOTHING`, [req.params.id, req.params.userId]);
  }
  db.auditLog(req.user.id, 'PERMISSIONS_CHANGED', 'project', req.params.id, `User #${req.params.userId}: dataroom=${dataroom}, qa=${qa}`, req.ip);
  res.json({ success: true, data: { message: 'Rechte aktualisiert' } });
}));

// ── Sprint 4: Aufgaben (CRM) ──────────────────────────────────────────────
router.get('/tasks', ...isAdmin, wrap(async (req, res) => {
  let sql = `SELECT t.*, p.codename, u.first_name || ' ' || u.last_name AS owner_name
             FROM tasks t LEFT JOIN projects p ON p.id = t.project_id LEFT JOIN users u ON u.id = t.owner_id`;
  const params = [];
  if (req.query.project_id) { sql += ` WHERE t.project_id = ?`; params.push(req.query.project_id); }
  sql += ` ORDER BY t.status ASC, t.due_date ASC NULLS LAST, t.created_at DESC`;
  res.json({ success: true, data: await db.all(sql, params) });
}));

router.post('/tasks', ...isAdmin, wrap(async (req, res) => {
  const { title, due_date, project_id, owner_id } = req.body;
  if (!title || !title.trim()) return res.status(400).json({ success: false, error: 'Titel fehlt' });
  const id = await db.insert(`INSERT INTO tasks (title, due_date, project_id, owner_id) VALUES (?, ?, ?, ?)`,
    [title.trim(), due_date || null, project_id || null, owner_id || req.user.id]);
  res.status(201).json({ success: true, data: { id } });
}));

router.put('/tasks/:id', ...isAdmin, wrap(async (req, res) => {
  const { status, title, due_date } = req.body;
  await db.run(`UPDATE tasks SET
      status = COALESCE(?, status),
      title = COALESCE(?, title),
      due_date = COALESCE(?, due_date),
      done_at = CASE WHEN ? = 'done' THEN now() WHEN ? = 'open' THEN NULL ELSE done_at END
    WHERE id = ?`,
    [status || null, title || null, due_date || null, status || '', status || '', req.params.id]);
  res.json({ success: true, data: { message: 'Aufgabe aktualisiert' } });
}));

router.delete('/tasks/:id', ...isAdmin, wrap(async (req, res) => {
  await db.run(`DELETE FROM tasks WHERE id = ?`, [req.params.id]);
  res.json({ success: true, data: { message: 'Aufgabe gelöscht' } });
}));

// ── Sprint 4: Aktivitätslog je Deal ───────────────────────────────────────
router.get('/projects/:id/activity', ...isAdmin, wrap(async (req, res) => {
  const rows = await db.all(`
    SELECT al.ts, al.action, al.resource, u.first_name || ' ' || u.last_name AS actor_name
    FROM activity_log al LEFT JOIN users u ON u.id = al.actor_id
    WHERE al.resource_id = ? OR (al.resource IN ('details','documents','teaser','im','dataroom','qa','interest','deal') AND al.resource_id = ?)
    ORDER BY al.ts DESC LIMIT 100
  `, [req.params.id, req.params.id]);
  res.json({ success: true, data: rows });
}));

// ── Sprint 5: Tenant-Verwaltung (nur Plattform-Admin) ─────────────────────
router.get('/tenants', ...isSuperAdmin, wrap(async (req, res) => {
  const tenants = await db.all(`SELECT id, slug, name, display_name, subdomain, primary_color, accent_color, billing_enabled, plan, created_at FROM tenants ORDER BY id`);
  res.json({ success: true, data: tenants });
}));

router.post('/tenants', ...isSuperAdmin, wrap(async (req, res) => {
  const { slug, name, subdomain, primary_color, accent_color, owner_email, owner_password, owner_first_name, owner_last_name } = req.body;
  if (!slug || !name || !owner_email || !owner_password) {
    return res.status(400).json({ success: false, error: 'Pflichtfelder: slug, name, owner_email, owner_password' });
  }
  const existing = await db.get(`SELECT id FROM tenants WHERE slug = ? OR subdomain = ?`, [slug, subdomain || slug]);
  if (existing) return res.status(409).json({ success: false, error: 'Slug/Subdomain bereits vergeben' });

  const tenantId = await db.insert(
    `INSERT INTO tenants (slug, name, display_name, subdomain, primary_color, accent_color)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [slug, name, name, subdomain || slug, primary_color || '#0D1B36', accent_color || '#29ABE2']
  );

  // Tenant-Owner im Kontext des NEUEN Mandanten anlegen (RLS: withTenant)
  const bcrypt = require('bcryptjs');
  await db.withTenant(tenantId, async (t) => {
    await t.insert(
      `INSERT INTO users (tenant_id, email, password_hash, role, first_name, last_name, company, is_approved, is_active, privacy_consent_at)
       VALUES (?, ?, ?, 'tenant_owner', ?, ?, ?, 1, 1, now())`,
      [tenantId, owner_email.toLowerCase(), bcrypt.hashSync(owner_password, 10),
       owner_first_name || 'Tenant', owner_last_name || 'Owner', name]
    );
  });

  db.auditLog(req.user.id, 'TENANT_CREATED', 'tenant', tenantId, `${slug} (${subdomain || slug})`, req.ip);
  res.status(201).json({ success: true, data: { id: tenantId, message: `Mandant "${name}" angelegt — erreichbar über Subdomain "${subdomain || slug}"` } });
}));

router.put('/tenants/:id', ...isSuperAdmin, wrap(async (req, res) => {
  const { display_name, subdomain, primary_color, accent_color, logo_url, billing_enabled, plan } = req.body;
  await db.run(`
    UPDATE tenants SET
      display_name = COALESCE(?, display_name), subdomain = COALESCE(?, subdomain),
      primary_color = COALESCE(?, primary_color), accent_color = COALESCE(?, accent_color),
      logo_url = COALESCE(?, logo_url), billing_enabled = COALESCE(?, billing_enabled),
      plan = COALESCE(?, plan)
    WHERE id = ?`,
    [display_name ?? null, subdomain ?? null, primary_color ?? null, accent_color ?? null,
     logo_url ?? null, billing_enabled ?? null, plan ?? null, req.params.id]);
  db.auditLog(req.user.id, 'TENANT_UPDATED', 'tenant', req.params.id, null, req.ip);
  res.json({ success: true, data: { message: 'Mandant aktualisiert' } });
}));

// ── Sprint 5: Billing-Events (Feature-Flag billing_enabled) ───────────────
router.get('/billing/events', ...isAdmin, wrap(async (req, res) => {
  const events = await db.all(`
    SELECT b.*, p.codename FROM billing_events b
    LEFT JOIN projects p ON p.id = b.project_id
    ORDER BY b.created_at DESC LIMIT 200
  `);
  res.json({ success: true, data: events });
}));

// ── Sprint 6: Bewertungs-Leads + Multiples-Pflege ─────────────────────────
router.get('/valuation-leads', ...isAdmin, wrap(async (req, res) => {
  const rows = await db.all(`
    SELECT id, lead_email, lead_name, nace_section, results_json, created_at
    FROM valuations ORDER BY created_at DESC LIMIT 200
  `);
  const data = rows.map(r => {
    let base = null, industry = null, positive = true;
    try { const res = JSON.parse(r.results_json || '{}'); base = res.corridor ? res.corridor.base : null; industry = res.industryLabel || null; positive = res.positive; } catch {}
    return { id: r.id, lead_email: r.lead_email, lead_name: r.lead_name, nace_section: r.nace_section, industry, corridor_base: base, positive, created_at: r.created_at };
  });
  res.json({ success: true, data });
}));

router.get('/valuation-multiples', ...isAdmin, wrap(async (req, res) => {
  const rows = await db.all(`SELECT * FROM valuation_multiples ORDER BY sort_order, label`);
  res.json({ success: true, data: rows });
}));

// Pflegbare Multiples-Zeile aktualisieren (Branche × Größenklasse, DUB-Struktur).
router.put('/valuation-multiples/:id', ...isAdmin, wrap(async (req, res) => {
  const FIELDS = [
    'label', 'source',
    'micro_ebit_min', 'micro_ebit_max',
    'small_ebit_min', 'small_ebit_max',
    'mid_ebit_min', 'mid_ebit_max',
    'revenue_multiple_min', 'revenue_multiple_max',
  ];
  const sets = [], vals = [];
  for (const f of FIELDS) {
    if (req.body[f] !== undefined && req.body[f] !== null && req.body[f] !== '') {
      sets.push(`${f} = ?`); vals.push(req.body[f]);
    }
  }
  if (!sets.length) return res.status(400).json({ success: false, error: 'Keine Änderungen übergeben' });
  vals.push(req.params.id);
  await db.run(`UPDATE valuation_multiples SET ${sets.join(', ')}, valid_from = now() WHERE id = ?`, vals);
  db.auditLog(req.user.id, 'VALUATION_MULTIPLE_UPDATED', 'valuation_multiple', req.params.id, null, req.ip);
  res.json({ success: true, data: { message: 'Multiple aktualisiert' } });
}));

// ── Activity + Audit (auditor: nur Lesezugriff hier) ──────────────────────
router.get('/activity', ...isAuditorOrAdmin, wrap(async (req, res) => {
  const logs = await db.all(`
    SELECT al.*, u.first_name || ' ' || u.last_name as user_name, u.email as user_email
    FROM audit_logs al LEFT JOIN users u ON u.id = al.user_id ORDER BY al.created_at DESC LIMIT 50
  `);
  res.json({ success: true, data: logs });
}));

router.get('/audit-logs', ...isAuditorOrAdmin, wrap(async (req, res) => {
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
