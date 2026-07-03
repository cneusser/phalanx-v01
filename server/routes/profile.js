const express = require('express');
const db = require('../db/database');
const { authenticate } = require('../middleware/auth');
const wrap = require('../utils/asyncHandler');
const { missingProfileFields } = require('../utils/profileCompleteness');
const router = express.Router();

const USER_FIELDS = 'id, email, role, first_name, last_name, company, position, buyer_type, phone, about, website, linkedin_url, privacy_consent_at, created_at';

router.get('/', authenticate, wrap(async (req, res) => {
  const user = await db.get(`SELECT ${USER_FIELDS} FROM users WHERE id = ?`, [req.user.id]);
  const profile = await db.get('SELECT * FROM buyer_profiles WHERE user_id = ?', [req.user.id]);
  const parsed = profile ? { ...profile, industries: JSON.parse(profile.industries||'[]'), regions: JSON.parse(profile.regions||'[]'), deal_types: JSON.parse(profile.deal_types||'[]') } : null;
  // Vollständigkeit mitliefern — Client kann Hinweis anzeigen
  const missing = missingProfileFields(user || {});
  res.json({ success: true, data: { user, profile: parsed, profile_complete: missing.length === 0, missing_fields: missing } });
}));

router.put('/', authenticate, wrap(async (req, res) => {
  const { first_name, last_name, company, position, buyer_type, phone, about, website, linkedin_url,
          industries, regions, revenue_min, revenue_max, ebitda_min, ebitda_max, deal_types, investment_style, notes } = req.body;
  await db.run(`UPDATE users SET first_name=COALESCE(?,first_name), last_name=COALESCE(?,last_name), company=COALESCE(?,company), position=COALESCE(?,position), buyer_type=COALESCE(?,buyer_type), phone=COALESCE(?,phone), about=COALESCE(?,about), website=COALESCE(?,website), linkedin_url=COALESCE(?,linkedin_url) WHERE id=?`,
    [first_name||null, last_name||null, company||null, position||null, buyer_type||null, phone||null, about??null, website??null, linkedin_url??null, req.user.id]);
  const ep = await db.get('SELECT id FROM buyer_profiles WHERE user_id = ?', [req.user.id]);
  if (ep) {
    await db.run(`UPDATE buyer_profiles SET industries=COALESCE(?,industries), regions=COALESCE(?,regions), revenue_min=COALESCE(?,revenue_min), revenue_max=COALESCE(?,revenue_max), ebitda_min=COALESCE(?,ebitda_min), ebitda_max=COALESCE(?,ebitda_max), deal_types=COALESCE(?,deal_types), investment_style=COALESCE(?,investment_style), notes=COALESCE(?,notes), updated_at=now() WHERE user_id=?`,
      [industries?JSON.stringify(industries):null, regions?JSON.stringify(regions):null, revenue_min??null, revenue_max??null, ebitda_min??null, ebitda_max??null, deal_types?JSON.stringify(deal_types):null, investment_style||null, notes||null, req.user.id]);
  } else {
    await db.run(`INSERT INTO buyer_profiles (user_id, industries, regions, revenue_min, revenue_max, ebitda_min, ebitda_max, deal_types, investment_style) VALUES (?,?,?,?,?,?,?,?,?)`,
      [req.user.id, JSON.stringify(industries||[]), JSON.stringify(regions||[]), revenue_min||0, revenue_max||100, ebitda_min||0, ebitda_max||20, JSON.stringify(deal_types||[]), investment_style||'both']);
  }
  db.auditLog(req.user.id, 'PROFILE_UPDATED', 'user', req.user.id, null, req.ip);
  res.json({ success: true, data: { message: 'Profil aktualisiert' } });
}));

// ── Eigener Audit-Trail (DSGVO-Transparenz, Art. 15) ────────────────────────
async function loadOwnActivity(userId) {
  const audit = await db.all(
    `SELECT created_at AS ts, action, resource_type AS resource, details FROM audit_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT 1000`,
    [userId]
  );
  const activity = await db.all(
    `SELECT ts, action, resource, NULL AS details FROM activity_log WHERE actor_id = ? ORDER BY ts DESC LIMIT 1000`,
    [userId]
  );
  return [...audit, ...activity].sort((a, b) => new Date(b.ts) - new Date(a.ts));
}

router.get('/activity', authenticate, wrap(async (req, res) => {
  res.json({ success: true, data: await loadOwnActivity(req.user.id) });
}));

// CSV-Export des eigenen Audit-Trails
router.get('/activity/export', authenticate, wrap(async (req, res) => {
  const rows = await loadOwnActivity(req.user.id);
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = ['Zeitpunkt;Aktion;Ressource;Details',
    ...rows.map(r => [new Date(r.ts).toLocaleString('de-DE', { timeZone: 'Europe/Berlin' }), r.action, r.resource, r.details].map(esc).join(';'))
  ].join('\n');
  db.auditLog(req.user.id, 'OWN_AUDIT_EXPORT', 'user', req.user.id, null, req.ip);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="CapitalMatch_Aktivitaeten_${req.user.id}.csv"`);
  res.send('﻿' + csv); // BOM für Excel-Umlaute
}));

module.exports = router;
