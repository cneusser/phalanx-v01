// ─────────────────────────────────────────────────────────────────────────────
// Sprint 6 — Bewertungsrechner (öffentlicher Quick-Check als Lead-Magnet).
//   POST /api/valuation/quick   anonym: Werte-Korridor berechnen (kein Speichern)
//   POST /api/valuation/report  Lead-E-Mail + Consent: speichern + PDF (Download + Mail)
// Feature-Flag: VALUATION_ENABLED (Default: an). Rate-Limit für den öffentlichen Rechner.
// ─────────────────────────────────────────────────────────────────────────────
const express = require('express');
const rateLimit = require('express-rate-limit');
const db = require('../db/database');
const wrap = require('../utils/asyncHandler');
const { optionalAuth } = require('../middleware/auth');
const { evaluate } = require('../valuation/valuationEngine');
const { generateValuationReport } = require('../valuation/valuationReport');
const router = express.Router();

const enabled = () => process.env.VALUATION_ENABLED !== '0';

const valLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 40,
  standardHeaders: true, legacyHeaders: false,
  message: { success: false, error: 'Zu viele Bewertungsanfragen — bitte in einigen Minuten erneut versuchen.' },
});

// NACE-Abschnittsbuchstaben aus der Branchen-Auswahl ableiten (z. B. "C28 – …" → "C")
function naceSection(industry) {
  const m = String(industry || '').trim().match(/^([A-Z])/);
  return m ? m[1] : 'X';
}

async function loadMultiple(section) {
  return (await db.get(`SELECT * FROM valuation_multiples WHERE nace_section = ?`, [section]))
      || (await db.get(`SELECT * FROM valuation_multiples WHERE nace_section = 'X'`));
}

// Eingaben aus dem Request normalisieren
function parseInput(body) {
  return {
    industry: body.industry || '',
    legalForm: body.legalForm || null,
    foundingYear: body.foundingYear || null,
    revenues: Array.isArray(body.revenues) ? body.revenues : [],
    ebits: Array.isArray(body.ebits) ? body.ebits : [],
    ownerSalaryAdjustment: body.ownerSalaryAdjustment || 0,
    oneOffs: body.oneOffs || 0,
    netDebt: body.netDebt || 0,
    quality: body.quality || {},
  };
}

// ── POST /quick — anonymer Sofort-Korridor ─────────────────────────────────
router.post('/quick', valLimiter, optionalAuth, wrap(async (req, res) => {
  if (!enabled()) return res.status(404).json({ success: false, error: 'Bewertung derzeit nicht verfügbar' });
  const input = parseInput(req.body);
  const section = naceSection(input.industry);
  const multiple = await loadMultiple(section);
  if (!multiple) return res.status(500).json({ success: false, error: 'Bewertungsgrundlagen nicht verfügbar' });
  const result = evaluate(input, multiple);
  db.activityLog(req.user ? req.user.id : null, 'VALUATION_QUICK', 'valuation', null, req.ip);
  res.json({ success: true, data: { result, nace_section: section } });
}));

// ── POST /report — Lead + PDF-Report (E-Mail + DSGVO-Consent) ──────────────
router.post('/report', valLimiter, optionalAuth, wrap(async (req, res) => {
  if (!enabled()) return res.status(404).json({ success: false, error: 'Bewertung derzeit nicht verfügbar' });
  const { email, name, company, privacy_consent } = req.body;
  if (!email || !/.+@.+\..+/.test(email)) return res.status(400).json({ success: false, error: 'Bitte eine gültige E-Mail-Adresse angeben' });
  if (!privacy_consent) return res.status(400).json({ success: false, error: 'Bitte stimmen Sie der Datenschutzerklärung zu' });

  const input = parseInput(req.body);
  const section = naceSection(input.industry);
  const multiple = await loadMultiple(section);
  const result = evaluate(input, multiple);

  // Lead speichern (tenant-bewusst: Default-Tenant bzw. Subdomain-Tenant)
  const tenantId = req.tenantId || 1;
  await db.withTenant(tenantId, (t) => t.insert(
    `INSERT INTO valuations (tenant_id, lead_email, lead_name, user_id, nace_section, inputs_json, results_json, privacy_consent, ip)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)`,
    [tenantId, email.toLowerCase(), name || null, req.user ? req.user.id : null, section,
     JSON.stringify(input), JSON.stringify(result), req.ip]
  ));

  const pdf = await generateValuationReport({
    result, input, industryLabel: result.industryLabel, company, name, date: new Date(),
  });

  // Report per E-Mail an den Lead (nur wenn Mailversand konfiguriert) + Admin-Info
  const { sendMail } = require('../utils/email');
  const b64 = pdf.toString('base64');
  sendMail({
    to: email.toLowerCase(),
    subject: '[CapitalMatch] Ihre indikative Unternehmensbewertung',
    html: `<p>Hallo ${name || ''},</p><p>anbei Ihre indikative Unternehmensbewertung als PDF. <strong>Wichtig:</strong> Es handelt sich um eine erste Orientierung (Werte-Korridor), nicht um eine Bewertung nach IDW S1 und keinen Marktpreis. Gern besprechen wir das Ergebnis persönlich.</p><p>Ihr Phalanx-Team</p>`,
    attachments: [{ filename: 'CapitalMatch_Unternehmensbewertung.pdf', content: b64, encoding: 'base64', contentType: 'application/pdf' }],
  }).catch(() => {});
  sendMail({
    to: process.env.NOTIFICATION_EMAIL || 'neusser@phalanx.de',
    subject: `[CapitalMatch] Neuer Bewertungs-Lead: ${name || email}`,
    html: `<p>Neuer Bewertungs-Lead über den Quick-Check:</p><p>${name || '—'} · <a href="mailto:${email}">${email}</a>${company ? ' · ' + company : ''}<br/>Branche: ${result.industryLabel || section} · Korridor (Basis): ${result.positive ? Math.round(result.corridor.base).toLocaleString('de-DE') + ' €' : 'n. b.'}</p>`,
  }).catch(() => {});

  db.auditLog(req.user ? req.user.id : null, 'VALUATION_LEAD', 'valuation', null, email.toLowerCase(), req.ip);

  // PDF direkt zum Download zurückgeben (Base64, Client baut den Download)
  res.json({ success: true, data: { result, pdf_base64: b64, filename: 'CapitalMatch_Unternehmensbewertung.pdf' } });
}));

module.exports = router;
