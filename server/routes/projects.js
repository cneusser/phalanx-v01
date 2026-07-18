// CapitalMatch – Projekte-Route: PostgreSQL/Knex
const express = require('express');
const db = require('../db/database');
const { authenticate, optionalAuth } = require('../middleware/auth');
const wrap = require('../utils/asyncHandler');
const { getStage, hasPermission } = require('../middleware/gates');
const { stageAllows } = require('../utils/dealStateMachine');
const { requireCompleteProfile } = require('../utils/profileCompleteness');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();

const PUBLIC_FIELDS = 'id, codename, industry, region, revenue_band, ebitda_band, deal_type, short_description, highlights, status, created_at, stage, investment_needed, equity_stake, post_money_valuation, tam_band, sector_emoji, location_city, mandate_type, (image_path IS NOT NULL)::int AS has_image';

// ── Pflege-Berechtigung (Sprint 19: rollenbewusst) ──────────────────────────
// Admin/Berater/Tenant-Owner, Ersteller oder Mitglied mit member_role='editor'.
// Ein „Betrachter" (member_role='viewer') darf NICHT pflegen.
const access = require('../utils/projectAccess');
const _get = (sql, p) => db.get(sql, p);

async function canManageProject(user, projectId) {
  return access.canManage(_get, user, projectId);
}
// Rolle auflösen: 'manager' | 'viewer' | null
async function projectRole(user, projectId) {
  return access.roleFor(_get, user, projectId);
}

// ── Projektbild-Upload (Teaser-Ebene, persistent: Railway-Volume bevorzugt) ──
const IMAGE_BASE = process.env.UPLOAD_DIR || process.env.RAILWAY_VOLUME_MOUNT_PATH;
const IMAGE_DIR = IMAGE_BASE
  ? path.join(IMAGE_BASE, 'project_images')
  : path.join(__dirname, '../../uploads/project_images');
if (!fs.existsSync(IMAGE_DIR)) fs.mkdirSync(IMAGE_DIR, { recursive: true });

const imageUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, IMAGE_DIR),
    filename: (req, file, cb) => cb(null, `project_${req.params.id}_${Date.now()}${path.extname(file.originalname).toLowerCase()}`),
  }),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    const ok = ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype);
    cb(ok ? null : new Error('Nur JPG, PNG oder WebP erlaubt (max. 5 MB)'), ok);
  },
});

// ── GET /stats: Public platform statistics ───────────────────────────────
router.get('/stats', wrap(async (req, res) => {
  const row = await db.get(`
    SELECT
      COUNT(*) FILTER (WHERE status='active' AND mandate_type='ma')::int          AS ma_active,
      COUNT(*) FILTER (WHERE mandate_type='ma')::int                              AS ma_total,
      COUNT(*) FILTER (WHERE status='active' AND mandate_type='fundraising')::int AS fund_active,
      COUNT(*) FILTER (WHERE mandate_type='fundraising')::int                     AS fund_total
    FROM projects
  `);
  const inv = await db.get(`SELECT COUNT(*)::int AS c FROM users WHERE role='buyer' AND is_approved=1 AND is_active=1`);

  res.json({
    success: true,
    data: {
      ma:          { active: row.ma_active,   total: row.ma_total },
      fundraising: { active: row.fund_active, total: row.fund_total },
      investors: inv.c,
      total_active: row.ma_active + row.fund_active,
    },
  });
}));

// ── GET /: Public list (active projects only) ─────────────────────────────
router.get('/', optionalAuth, wrap(async (req, res) => {
  const { industry, region, deal_type, search, mandate_type, revenue_band, ebitda_band } = req.query;
  let query = `SELECT ${PUBLIC_FIELDS} FROM projects WHERE status = 'active'`;
  const params = [];
  // Ein eingeloggter Nutzer sieht seine EIGENEN Mandate (als Verkäufer/Ersteller)
  // nicht im Käufer-Marktplatz, er soll dort nicht auf sich selbst bieten.
  if (req.user && req.user.id) { query += ' AND (created_by IS NULL OR created_by <> ?)'; params.push(req.user.id); }
  if (industry)     { query += ' AND industry = ?';     params.push(industry); }
  if (region)       { query += ' AND region = ?';       params.push(region); }
  if (deal_type)    { query += ' AND deal_type = ?';    params.push(deal_type); }
  if (mandate_type) { query += ' AND mandate_type = ?'; params.push(mandate_type); }
  if (revenue_band) { query += ' AND revenue_band = ?'; params.push(revenue_band); }
  if (ebitda_band)  { query += ' AND ebitda_band = ?';  params.push(ebitda_band); }
  if (search) { query += ' AND (codename ILIKE ? OR short_description ILIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
  query += ' ORDER BY created_at DESC';

  const projects = (await db.all(query, params)).map(p => ({ ...p, highlights: JSON.parse(p.highlights || '[]') }));
  const industries = (await db.all(`SELECT DISTINCT industry FROM projects WHERE status='active' ORDER BY industry`)).map(r => r.industry);
  const regions    = (await db.all(`SELECT DISTINCT region FROM projects WHERE status='active' ORDER BY region`)).map(r => r.region);
  const deal_types = (await db.all(`SELECT DISTINCT deal_type FROM projects WHERE status='active' ORDER BY deal_type`)).map(r => r.deal_type);
  const stages     = (await db.all(`SELECT DISTINCT stage FROM projects WHERE status='active' AND stage IS NOT NULL ORDER BY stage`)).map(r => r.stage);
  const revenue_bands = (await db.all(`SELECT DISTINCT revenue_band FROM projects WHERE status='active' AND revenue_band IS NOT NULL AND revenue_band <> 'k. A.' ORDER BY revenue_band`)).map(r => r.revenue_band);
  const ebitda_bands  = (await db.all(`SELECT DISTINCT ebitda_band FROM projects WHERE status='active' AND ebitda_band IS NOT NULL AND ebitda_band <> 'k. A.' ORDER BY ebitda_band`)).map(r => r.ebitda_band);

  res.json({ success: true, data: { projects, filters: { industries, regions, deal_types, stages, revenue_bands, ebitda_bands } } });
}));

// ── GET /my-projects: Seller's own projects (all statuses) ───────────────
router.get('/my-projects', authenticate, wrap(async (req, res) => {
  if (!['seller', 'super_admin', 'advisor'].includes(req.user.role)) {
    return res.status(403).json({ success: false, error: 'Nicht berechtigt' });
  }
  const projects = (await db.all(
    `SELECT ${PUBLIC_FIELDS}, created_by, review_note, submitted_at FROM projects
      WHERE created_by = ?
         OR id IN (SELECT dp.project_id FROM crm_deal_parties dp JOIN crm_contacts k ON k.id = dp.contact_id
                    WHERE dp.party_role = 'seller' AND k.user_id = ?)
      ORDER BY created_at DESC`,
    [req.user.id, req.user.id]
  )).map(p => ({ ...p, highlights: JSON.parse(p.highlights || '[]') }));
  res.json({ success: true, data: projects });
}));

// ── GET /:id/funnel-preview: reduzierter Funnel für den Verkäufer ───────────
// Der Mandant (Verkäufer, der das Mandat eingestellt hat) sieht, wie weit sein
// Prozess ist und WER interessiert ist, aber bewusst OHNE Kontaktdaten (keine
// E-Mail, kein Telefon) und ohne jeden Bezug zu anderen Mandaten. Berater und
// Admin sehen es ebenfalls; Käufer haben keinen Zugriff.
const SELLER_STAGES = [
  { key: 0, label: 'Longlist' }, { key: 1, label: 'Angesprochen' }, { key: 2, label: 'Rückmeldung' },
  { key: 3, label: 'Match' }, { key: 4, label: 'NDA' }, { key: 5, label: 'IM / Unterlagen' },
  { key: 6, label: 'Gespräch' }, { key: 7, label: 'LOI eingereicht' }, { key: 8, label: 'LOI unterschrieben' },
  { key: 9, label: 'Namensnennung' }, { key: 10, label: 'Due Diligence' }, { key: 11, label: 'Signing' },
  { key: 12, label: 'Closing' },
];
router.get('/:id/funnel-preview', authenticate, wrap(async (req, res) => {
  const project = await db.get('SELECT id, codename, created_by, status FROM projects WHERE id = ?', [req.params.id]);
  if (!project) return res.status(404).json({ success: false, error: 'Mandat nicht gefunden' });
  const isStaff = ['super_admin', 'advisor', 'tenant_owner'].includes(req.user.role);
  const isOwner = project.created_by === req.user.id;
  // Auch der eingeladene Verkäufer (als CRM-Kontakt mit party_role='seller' und
  // verknüpftem Konto) darf den Prozessstand seines Mandats sehen.
  let sellerLinked = false;
  if (!isStaff && !isOwner) {
    const s = await db.get(
      `SELECT 1 AS ok FROM crm_deal_parties dp JOIN crm_contacts k ON k.id = dp.contact_id
        WHERE dp.project_id = ? AND dp.party_role = 'seller' AND k.user_id = ? LIMIT 1`,
      [project.id, req.user.id]).catch(() => null);
    sellerLinked = !!s;
  }
  if (!isStaff && !isOwner && !sellerLinked) return res.status(403).json({ success: false, error: 'Nicht berechtigt' });

  const rows = await db.all(`
    SELECT dp.funnel_stage, dp.party_status, dp.stage_changed_at, dp.identity_revealed,
           k.salutation, k.title, k.first_name, k.last_name,
           (SELECT c.name FROM crm_company_contacts cc JOIN crm_companies c ON c.id = cc.company_id
             WHERE cc.contact_id = k.id AND cc.ended_on IS NULL LIMIT 1) AS company_name
    FROM crm_deal_parties dp
    LEFT JOIN crm_contacts k ON k.id = dp.contact_id
    WHERE dp.project_id = ? AND dp.party_role = 'buyer'
    ORDER BY dp.funnel_stage DESC, dp.stage_changed_at DESC NULLS LAST`, [project.id]).catch(() => []);

  // Bewusst reduziert: KEINE Kontaktdaten, KEINE IDs, KEIN Bezug zu anderen Mandaten.
  // Der Klarname erscheint erst nach der Namensnennung (Demasking, Stufe C), vorher anonym.
  const parties = rows
    .filter(r => r.party_status !== 'dropped')
    .map(r => ({
      name: r.identity_revealed === 1
        ? ([r.salutation, r.title, r.first_name, r.last_name].filter(Boolean).join(' ').trim() || 'Interessent')
        : 'Interessent (anonym)',
      company: r.identity_revealed === 1 ? (r.company_name || null) : null,
      revealed: r.identity_revealed === 1,
      funnel_stage: r.funnel_stage,
      active: r.party_status === 'active',
    }));
  const counts = {};
  SELLER_STAGES.forEach(s => { counts[s.key] = parties.filter(p => p.funnel_stage === s.key).length; });

  res.json({ success: true, data: { project: { codename: project.codename, status: project.status }, stages: SELLER_STAGES, parties, counts } });
}));

// ── GET /my-overview: Verkäufer-Cockpit (Statistik + konsolidierte Inbox) ───
// Aggregiert über alle Mandate des Verkäufers: Inserate-Status, interessierte
// Parteien je Mandat (anonym bis Namensnennung, KEINE Kontaktdaten) und die
// jüngsten Bewegungen als „Aktuelles"-Feed. Basis für das Verkäufer-Cockpit.
router.get('/my-overview', authenticate, wrap(async (req, res) => {
  if (!['seller', 'super_admin', 'advisor'].includes(req.user.role)) {
    return res.status(403).json({ success: false, error: 'Nicht berechtigt' });
  }
  const mandates = await db.all(
    `SELECT id, codename, status, mandate_type, created_at FROM projects
      WHERE created_by = ?
         OR id IN (SELECT dp.project_id FROM crm_deal_parties dp JOIN crm_contacts k ON k.id = dp.contact_id
                    WHERE dp.party_role = 'seller' AND k.user_id = ?)
      ORDER BY created_at DESC`,
    [req.user.id, req.user.id]).catch(() => []);
  const ids = mandates.map(m => m.id);

  let rows = [];
  if (ids.length) {
    const ph = ids.map(() => '?').join(',');
    rows = await db.all(
      `SELECT dp.project_id, dp.funnel_stage, dp.party_status, dp.stage_changed_at, dp.identity_revealed,
              k.salutation, k.title, k.first_name, k.last_name,
              (SELECT c.name FROM crm_company_contacts cc JOIN crm_companies c ON c.id = cc.company_id
                WHERE cc.contact_id = k.id AND cc.ended_on IS NULL LIMIT 1) AS company_name
         FROM crm_deal_parties dp
         LEFT JOIN crm_contacts k ON k.id = dp.contact_id
        WHERE dp.project_id IN (${ph}) AND dp.party_role = 'buyer' AND dp.party_status <> 'dropped'
        ORDER BY dp.funnel_stage DESC, dp.stage_changed_at DESC NULLS LAST`, ids).catch(() => []);
  }

  const byStatus = {};
  const mandateMap = {};
  mandates.forEach(m => {
    byStatus[m.status] = (byStatus[m.status] || 0) + 1;
    mandateMap[m.id] = { id: m.id, codename: m.codename, status: m.status, mandate_type: m.mandate_type, parties: [] };
  });

  const cutoff = Date.now() - 14 * 864e5;
  const recent = [];
  rows.forEach(r => {
    const revealed = r.identity_revealed === 1;
    const item = {
      name: revealed ? ([r.salutation, r.title, r.first_name, r.last_name].filter(Boolean).join(' ').trim() || 'Interessent') : 'Interessent (anonym)',
      company: revealed ? (r.company_name || null) : null,
      revealed,
      funnel_stage: r.funnel_stage,
      active: r.party_status === 'active',
      since: r.stage_changed_at,
    };
    if (mandateMap[r.project_id]) mandateMap[r.project_id].parties.push(item);
    if (r.stage_changed_at && new Date(r.stage_changed_at).getTime() >= cutoff) {
      recent.push({ codename: mandateMap[r.project_id]?.codename, name: item.name, stage: r.funnel_stage, at: r.stage_changed_at });
    }
  });
  recent.sort((a, b) => new Date(b.at) - new Date(a.at));

  res.json({
    success: true,
    data: {
      stages: SELLER_STAGES,
      byStatus,
      totalInterested: rows.length,
      activeMandates: mandates.filter(m => m.status === 'active').length,
      mandates: Object.values(mandateMap),
      recent: recent.slice(0, 12),
    },
  });
}));

// ── POST /my-project: Seller submits a new project (starts as draft) ─────
// Setzt vollständiges Profil voraus (Kontaktdaten Pflicht vor Mandatsanlage)
router.post('/my-project', authenticate, requireCompleteProfile(), wrap(async (req, res) => {
  if (!['seller', 'super_admin', 'advisor'].includes(req.user.role)) {
    return res.status(403).json({ success: false, error: 'Nur Verkäufer können Projekte einreichen' });
  }
  const { codename, industry, region, revenue_band, ebitda_band, deal_type, short_description, highlights, mandate_type } = req.body;
  // Für den geführten Wizard genügt der Name, um den Entwurf anzulegen. Branche,
  // Region und Beschreibung werden Schritt für Schritt ergänzt und erst beim
  // Einreichen (POST /:id/submit) zur Pflicht.
  if (!codename)
    return res.status(400).json({ success: false, error: 'Bitte einen Unternehmensnamen oder Codenamen angeben' });

  const existing = await db.get('SELECT id FROM projects WHERE codename = ?', [codename]);
  if (existing) return res.status(409).json({ success: false, error: 'Dieser Unternehmensname ist bereits vergeben' });

  const projectId = await db.insert(
    `INSERT INTO projects (codename, industry, region, revenue_band, ebitda_band, deal_type, short_description, highlights,
       status, mandate_type, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?)`,
    [codename, industry || '', region || '',
     revenue_band || 'k. A.', ebitda_band || 'k. A.',
     deal_type || 'Nachfolge', short_description || '',
     JSON.stringify(highlights || []),
     mandate_type || 'ma',
     req.user.id]
  );

  db.auditLog(req.user.id, 'SELLER_CREATED_DRAFT', 'project', projectId, codename, req.ip);
  console.log(`\n📝 Neuer Inserat-Entwurf angelegt: "${codename}" von User #${req.user.id}`);

  res.status(201).json({ success: true, data: { id: projectId, message: 'Entwurf angelegt. Du kannst ihn nun ausfüllen und einreichen.' } });
}));

// ── GET /:id/teaser: Public teaser (+ can_manage für eingeloggte Pfleger) ─
router.get('/:id/teaser', optionalAuth, wrap(async (req, res) => {
  // Pfleger (Admin/Ersteller/Mitglied) sehen den Teaser auch im Entwurfsstatus
  let project = await db.get(`SELECT ${PUBLIC_FIELDS} FROM projects WHERE id = ? AND status = 'active'`, [req.params.id]);
  // Sprint 19: Rolle auflösen: Pflegende UND Betrachter sehen das Mandat auch im Entwurf
  const role = req.user ? await projectRole(req.user, req.params.id) : null;
  const canManage = role === 'manager';
  if (!project && role) {
    project = await db.get(`SELECT ${PUBLIC_FIELDS} FROM projects WHERE id = ?`, [req.params.id]);
  }
  if (!project) return res.status(404).json({ success: false, error: 'Projekt nicht gefunden' });
  // Zielsteuerung (Käufergruppen, Schlagwörter) ist intern: nur für Pfleger.
  let targeting = {};
  if (canManage) {
    const t = await db.get('SELECT buyer_groups, keywords FROM projects WHERE id = ?', [req.params.id]);
    targeting = { buyer_groups: JSON.parse(t?.buyer_groups || '[]'), keywords: t?.keywords || '' };
  }
  res.json({
    success: true,
    data: {
      ...project,
      highlights: JSON.parse(project.highlights || '[]'),
      can_manage: canManage,
      project_role: role,          // 'manager' | 'viewer' | null
      ...targeting,
    },
  });
}));

// ── GET /:id/teaser.pdf: Kurzprofil als PDF (mit Audit-Trail & Markierung) ──
router.get('/:id/teaser.pdf', authenticate, wrap(async (req, res) => {
  const canManage = await canManageProject(req.user, req.params.id);
  let project = await db.get(`SELECT ${PUBLIC_FIELDS} FROM projects WHERE id = ? AND status = 'active'`, [req.params.id]);
  if (!project && canManage) project = await db.get(`SELECT ${PUBLIC_FIELDS} FROM projects WHERE id = ?`, [req.params.id]);
  if (!project) return res.status(404).json({ success: false, error: 'Projekt nicht gefunden' });
  const { generateTeaserReport } = require('../valuation/teaserReport');
  const pdf = await generateTeaserReport({
    project: { ...project, highlights: JSON.parse(project.highlights || '[]') },
    recipient: { name: [req.user.title, req.user.first_name, req.user.last_name].filter(Boolean).join(' '), email: req.user.email },
    date: new Date(),
  });
  // Jede Erzeugung wird protokolliert (Audit-Trail)
  db.auditLog(req.user.id, 'TEASER_PDF', 'project', project.id, `Kurzprofil ${project.codename}`, req.ip);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="Kurzprofil_${String(project.codename).replace(/[^a-zA-Z0-9]/g, '_')}.pdf"`);
  res.send(pdf);
}));

// ── PUT /:id: Mandat pflegen über den Marktplatz (Admin/Ersteller/Mitglied) ─
router.put('/:id', authenticate, wrap(async (req, res) => {
  if (!(await canManageProject(req.user, req.params.id))) {
    return res.status(403).json({ success: false, error: 'Keine Berechtigung zur Pflege dieses Mandats' });
  }
  const isAdmin = ['super_admin', 'advisor'].includes(req.user.role);
  const { codename, industry, region, revenue_band, ebitda_band, deal_type, short_description, highlights,
          stage, investment_needed, equity_stake, post_money_valuation, tam_band, sector_emoji, location_city, status,
          buyer_groups, keywords } = req.body;
  const BUYER_GROUPS = ['strategic', 'financial', 'private', 'advisor_mandate'];
  const buyerGroupsJson = Array.isArray(buyer_groups)
    ? JSON.stringify(buyer_groups.filter(g => BUYER_GROUPS.includes(g)))
    : null;

  if (codename) {
    const dupe = await db.get('SELECT id FROM projects WHERE codename = ? AND id != ?', [codename, req.params.id]);
    if (dupe) return res.status(409).json({ success: false, error: 'Name/Codename bereits vergeben' });
  }

  // Vorher-Stand für die Änderungs-Mail an aktive Beteiligte (CRM III)
  const before = await db.get('SELECT * FROM projects WHERE id = ?', [req.params.id]);

  await db.run(`
    UPDATE projects SET
      codename=COALESCE(?,codename), industry=COALESCE(?,industry), region=COALESCE(?,region),
      revenue_band=COALESCE(?,revenue_band), ebitda_band=COALESCE(?,ebitda_band),
      deal_type=COALESCE(?,deal_type), short_description=COALESCE(?,short_description),
      highlights=COALESCE(?,highlights), stage=COALESCE(?,stage),
      investment_needed=COALESCE(?,investment_needed), equity_stake=COALESCE(?,equity_stake),
      post_money_valuation=COALESCE(?,post_money_valuation), tam_band=COALESCE(?,tam_band),
      sector_emoji=COALESCE(?,sector_emoji), location_city=COALESCE(?,location_city),
      buyer_groups=COALESCE(?,buyer_groups), keywords=COALESCE(?,keywords),
      status=COALESCE(?,status),
      updated_at=now() WHERE id=?
  `, [
    codename||null, industry||null, region||null, revenue_band||null, ebitda_band||null,
    deal_type||null, short_description||null, highlights?JSON.stringify(highlights):null, stage||null,
    investment_needed||null, equity_stake||null, post_money_valuation||null, tam_band||null,
    sector_emoji||null, location_city||null,
    buyerGroupsJson, keywords !== undefined ? (keywords || '') : null,
    isAdmin ? (status || null) : null, // Sichtbarkeit ändert nur der Admin
    req.params.id,
  ]);
  db.auditLog(req.user.id, 'UPDATE_PROJECT', 'project', req.params.id, isAdmin ? 'via Marktplatz (Admin)' : 'via Marktplatz (Mitglied/Verkäufer)', req.ip);

  // Wesentliche Änderungen → aktive, eingewilligte Beteiligte informieren.
  // Läuft im Hintergrund, hat eine 24-h-Bremse und meldet sich nie bei Widerspruch.
  // Nur bei veröffentlichten Mandaten: Entwürfe/Prüfung informieren niemanden.
  try {
    const campaigns = require('../utils/campaigns');
    const after = await db.get('SELECT * FROM projects WHERE id = ?', [req.params.id]);
    const changes = after.status === 'active' ? campaigns.materialChanges(before, after) : [];
    if (changes.length) {
      campaigns.notifyProjectChange(req.params.id, changes, { actorId: req.user.id })
        .then(r => { if (r.sent) console.log(`📨 Mandats-Update #${req.params.id}: ${r.sent} Beteiligte informiert`); })
        .catch(() => {});
    }
  } catch { /* Benachrichtigung darf die Pflege nie blockieren */ }

  res.json({ success: true, data: { message: 'Mandat aktualisiert' } });
}));

// ── POST /:id/submit: Entwurf zur Prüfung einreichen (Verkäufer/Pfleger) ────
// Der Entwurf wandert auf „in Prüfung". Erst nach Admin-Freigabe wird er aktiv.
router.post('/:id/submit', authenticate, wrap(async (req, res) => {
  if (!(await canManageProject(req.user, req.params.id))) {
    return res.status(403).json({ success: false, error: 'Keine Berechtigung für dieses Mandat' });
  }
  const p = await db.get('SELECT id, codename, industry, region, short_description, status FROM projects WHERE id = ?', [req.params.id]);
  if (!p) return res.status(404).json({ success: false, error: 'Mandat nicht gefunden' });
  if (p.status !== 'draft') {
    return res.status(400).json({ success: false, error: 'Nur Entwürfe können zur Prüfung eingereicht werden' });
  }
  if (!p.codename || !p.industry || !p.region || !p.short_description) {
    return res.status(400).json({ success: false, error: 'Bitte Unternehmensname, Branche, Region und Beschreibung ausfüllen, bevor du einreichst' });
  }
  await db.run(`UPDATE projects SET status = 'in_review', submitted_at = now(), review_note = NULL, updated_at = now() WHERE id = ?`, [req.params.id]);
  db.auditLog(req.user.id, 'PROJECT_SUBMITTED_REVIEW', 'project', req.params.id, p.codename, req.ip);
  console.log(`\n🔎 Inserat zur Prüfung eingereicht: "${p.codename}" (#${p.id}) von User #${req.user.id}`);
  res.json({ success: true, data: { status: 'in_review', message: 'Zur Prüfung eingereicht. Wir prüfen dein Inserat und schalten es frei.' } });
}));

// ── POST /:id/lifecycle: Verkäufer steuert den Lebenszyklus seines Inserats ──
// Erlaubte Übergänge (nicht-Admin): aktiv↔pausiert, aktiv/pausiert→geschlossen,
// in-Prüfung→Entwurf (Einreichung zurückziehen). Freigeben bleibt beim Admin.
const SELLER_TRANSITIONS = {
  active: ['paused', 'closed'],
  paused: ['active', 'closed'],
  in_review: ['draft'],
  closed: ['active'],
};
router.post('/:id/lifecycle', authenticate, wrap(async (req, res) => {
  if (!(await canManageProject(req.user, req.params.id))) {
    return res.status(403).json({ success: false, error: 'Keine Berechtigung für dieses Mandat' });
  }
  const target = String(req.body.status || '');
  if (!['active', 'paused', 'closed', 'draft'].includes(target)) {
    return res.status(400).json({ success: false, error: 'Unbekannter Zielstatus' });
  }
  const p = await db.get('SELECT id, status, codename FROM projects WHERE id = ?', [req.params.id]);
  if (!p) return res.status(404).json({ success: false, error: 'Mandat nicht gefunden' });
  const isAdmin = ['super_admin', 'advisor', 'tenant_owner'].includes(req.user.role);
  const allowed = SELLER_TRANSITIONS[p.status] || [];
  if (!isAdmin && !allowed.includes(target)) {
    return res.status(400).json({ success: false, error: `Übergang von „${p.status}" zu „${target}" ist nicht erlaubt` });
  }
  // deal_status mitziehen, damit Marktplatz und Prozess konsistent bleiben
  let dealSet = '';
  if (target === 'closed') dealSet = `, deal_status = 'closed'`;
  else if (target === 'active') dealSet = `, deal_status = CASE WHEN deal_status IN ('draft', 'closed') THEN 'teaser_live' ELSE deal_status END`;
  await db.run(`UPDATE projects SET status = ?${dealSet}, updated_at = now() WHERE id = ?`, [target, req.params.id]);
  db.auditLog(req.user.id, 'PROJECT_LIFECYCLE', 'project', req.params.id, `${p.status} → ${target}`, req.ip);
  res.json({ success: true, data: { status: target } });
}));

// ── POST /:id/image: Projektbild hochladen (Pfleger) ───────────────────────
router.post('/:id/image', authenticate, wrap(async (req, res, next) => {
  if (!(await canManageProject(req.user, req.params.id))) {
    return res.status(403).json({ success: false, error: 'Keine Berechtigung' });
  }
  imageUpload.single('image')(req, res, async (err) => {
    if (err) return res.status(400).json({ success: false, error: err.message });
    if (!req.file) return res.status(400).json({ success: false, error: 'Keine Bilddatei hochgeladen' });
    // Altes Bild aufräumen
    const old = await db.get('SELECT image_path FROM projects WHERE id = ?', [req.params.id]);
    if (old && old.image_path && fs.existsSync(old.image_path)) fs.unlink(old.image_path, () => {});
    await db.run('UPDATE projects SET image_path = ?, updated_at = now() WHERE id = ?', [req.file.path, req.params.id]);
    db.auditLog(req.user.id, 'PROJECT_IMAGE_UPLOADED', 'project', req.params.id, req.file.filename, req.ip);
    res.json({ success: true, data: { message: 'Bild gespeichert' } });
  });
}));

// ── GET /:id/image: Projektbild ausliefern (öffentlich, Teaser-Ebene) ──────
router.get('/:id/image', wrap(async (req, res) => {
  const p = await db.get('SELECT image_path FROM projects WHERE id = ?', [req.params.id]);
  if (!p || !p.image_path || !fs.existsSync(p.image_path)) {
    return res.status(404).json({ success: false, error: 'Kein Bild vorhanden' });
  }
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.sendFile(path.resolve(p.image_path));
}));

// ── Q&A-Modul (Sprint 4): Fragen stellen & eigene Threads lesen ────────────
// Gate: Datenraum-Freigabe + granulares qa-Recht (serverseitig erzwungen)
router.post('/:id/questions', authenticate, wrap(async (req, res) => {
  const { question } = req.body;
  if (!question || question.trim().length < 5) {
    return res.status(400).json({ success: false, error: 'Bitte formulieren Sie Ihre Frage (mind. 5 Zeichen)' });
  }
  // Admins/Berater und Mandats-Pfleger dürfen jederzeit Fragen erfassen
  // (z. B. FAQ pflegen/testen); Käufer erst nach Datenraum-Freigabe + qa-Recht.
  const isManager = ['super_admin', 'advisor', 'tenant_owner'].includes(req.user.role) || await canManageProject(req.user, req.params.id);
  if (!isManager) {
    const stage = await getStage(req.user.id, req.params.id);
    if (!stageAllows(stage, 'qa') || !(await hasPermission(req.user, req.params.id, 'qa'))) {
      db.activityLog(req.user.id, 'QA_DENIED', 'qa', req.params.id, req.ip);
      return res.status(403).json({ success: false, error: 'Q&A ist erst nach Datenraum-Freigabe verfügbar' });
    }
  }
  const qId = await db.insert(
    `INSERT INTO qa_threads (project_id, buyer_id, question) VALUES (?, ?, ?)`,
    [req.params.id, req.user.id, question.trim()]
  );
  db.activityLog(req.user.id, 'QA_QUESTION_ASKED', 'qa', qId, req.ip);
  // Admin benachrichtigen: mit Direkt-Link zum Antworten
  const proj = await db.get('SELECT codename FROM projects WHERE id = ?', [req.params.id]);
  const { sendProcessUpdateEmail } = require('../utils/email');
  sendProcessUpdateEmail({
    to: process.env.NOTIFICATION_EMAIL || 'neusser@phalanx.de',
    firstName: '',
    title: `Neue Q&A-Frage: ${proj ? proj.codename : 'Mandat'}`,
    message: `<strong>${req.user.first_name} ${req.user.last_name}</strong> (${req.user.email}) fragt zum Mandat <strong>${proj ? proj.codename : ''}</strong>:<br/><br/><span style="display:block;background:#F4F8FC;border-left:3px solid #5B8FC9;padding:10px 14px;color:#333;">${question.trim()}</span>`,
    ctaLabel: 'Frage direkt beantworten', ctaPath: `/projekte/${req.params.id}?tab=qa`,
  }).catch(() => {});
  res.status(201).json({ success: true, data: { id: qId, status: 'open' } });
}));

router.get('/:id/questions', authenticate, wrap(async (req, res) => {
  const isAdmin = ['super_admin', 'advisor'].includes(req.user.role);
  // Käufer sehen ihre eigenen Fragen: plus die, die wir für alle Interessenten
  // freigegeben haben (FAQ). Der Fragesteller bleibt dort anonym.
  const rows = isAdmin
    ? await db.all(`SELECT q.*, u.first_name || ' ' || u.last_name AS buyer_name FROM qa_threads q JOIN users u ON u.id = q.buyer_id WHERE q.project_id = ? ORDER BY q.asked_at DESC`, [req.params.id])
    : await db.all(`
        SELECT id, question, answer, status, asked_at, answered_at, is_public,
               (buyer_id = ?) AS is_mine
        FROM qa_threads
        WHERE project_id = ?
          AND (buyer_id = ? OR (is_public = 1 AND status = 'answered'))
        ORDER BY (buyer_id = ?) DESC, asked_at DESC`,
        [req.user.id, req.params.id, req.user.id, req.user.id]);
  res.json({ success: true, data: rows });
}));

// ── GET /:id: Full detail (requires auth + vollständiges Profil + NDA) ───
router.get('/:id', authenticate, requireCompleteProfile(), wrap(async (req, res) => {
  const project = await db.get(`SELECT ${PUBLIC_FIELDS} FROM projects WHERE id = ? AND status = 'active'`, [req.params.id]);
  if (!project) return res.status(404).json({ success: false, error: 'Projekt nicht gefunden' });

  const isAdmin = ['super_admin', 'advisor'].includes(req.user.role);
  let ndaStatus = null;
  if (!isAdmin) {
    const nda = await db.get(`SELECT status FROM nda_requests WHERE user_id = ? AND project_id = ?`, [req.user.id, project.id]);
    ndaStatus = nda ? nda.status : null;
    // Zustandsautomat: Detaildaten erst ab Gate 'details' (dataroom_granted).
    // Serverseitig erzwungen: nicht über Direkt-URLs/API umgehbar.
    const stage = await getStage(req.user.id, project.id);
    if (!stageAllows(stage, 'details')) {
      db.activityLog(req.user.id, 'ACCESS_DETAILS_DENIED', 'details', project.id, req.ip);
      return res.status(403).json({ success: false, error: 'NDA-Freigabe erforderlich', ndaStatus, projectId: project.id });
    }
    db.activityLog(req.user.id, 'ACCESS_DETAILS', 'details', project.id, req.ip);
  }

  const details   = await db.get('SELECT * FROM project_details WHERE project_id = ?', [project.id]);
  const documents = await db.all(`SELECT id, filename, file_type, file_size, access_level, description, created_at, (file_path IS NOT NULL)::int AS has_file FROM documents WHERE project_id = ? ORDER BY access_level, created_at`, [project.id]);
  db.auditLog(req.user.id, 'VIEW_PROJECT', 'project', project.id, null, req.ip);

  res.json({ success: true, data: { ...project, highlights: JSON.parse(project.highlights || '[]'), details, documents, ndaStatus: isAdmin ? 'admin' : ndaStatus } });
}));

module.exports = router;
