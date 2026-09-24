// ─────────────────────────────────────────────────────────────────────────────
// Stammdatenpflege: Kampagnen (intern) und die Pflegeseite ohne Anmeldung.
//
// Öffentlich sind nur die Routen unter /api/stammdaten/:token. Sie arbeiten
// ausschließlich mit dem Einmal-Token und geben nie mehr preis als die Felder
// dieser einen Firma. Der Token wird nur gehasst verglichen.
// ─────────────────────────────────────────────────────────────────────────────
const express = require('express');
const rateLimit = require('express-rate-limit');
const db = require('../db/database');
const wrap = require('../utils/asyncHandler');
const { authenticate } = require('../middleware/auth');
const mailing = require('../utils/pflegeMailing');
const voll = require('../utils/vollstaendigkeit');
const vokabular = require('../utils/vokabular');

const scoped = (req, fn) => (req.tenantId && req.tenantId !== 1) ? db.withTenant(req.tenantId, fn) : fn(db);
const qFor = (req) => ({
  get: (s, p) => scoped(req, (t) => t.get(s, p)),
  all: (s, p) => scoped(req, (t) => t.all(s, p)),
  run: (s, p) => scoped(req, (t) => t.run(s, p)),
  insert: (s, p) => scoped(req, (t) => t.insert(s, p)),
});
const ADMIN_ROLES = ['super_admin', 'advisor', 'tenant_owner'];
const nurStaff = (req, res, next) => (req.user && ADMIN_ROLES.includes(req.user.role))
  ? next() : res.status(403).json({ success: false, error: 'Nur für Beratung und Verwaltung.' });

// ═══════════════════════════════════════════════════════════════════════════
// Öffentlich: die Pflegeseite
// ═══════════════════════════════════════════════════════════════════════════
const publicRouter = express.Router();
const pflegeLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 60, standardHeaders: true, legacyHeaders: false });

// Einladung über den Token finden. Ein verbrauchter oder abgemeldeter Token ist
// ungültig: Der Link gilt einmal, danach ist der Vorgang abgeschlossen.
async function einladungZu(token) {
  const hash = mailing.tokenHash(token);
  const e = await db.get('SELECT * FROM pflege_einladungen WHERE token_hash = ?', [hash]).catch(() => null);
  if (!e) return { fehler: 'Der Link ist ungültig. Möglicherweise wurde er beim Kopieren abgeschnitten.' };
  if (e.abgemeldet_am) return { fehler: 'Sie haben sich von diesem Mailing abgemeldet.' };
  if (e.ausgefuellt_am || e.bestaetigt_am) {
    return { fehler: 'Dieser Link wurde bereits verwendet. Vielen Dank, Ihre Angaben liegen vor.' };
  }
  return { einladung: e };
}

// Was steht an, und welche Felder fehlen? Wird beim Öffnen der Seite geholt.
publicRouter.get('/:token', pflegeLimiter, wrap(async (req, res) => {
  const { einladung, fehler } = await einladungZu(req.params.token);
  if (fehler) return res.status(404).json({ success: false, error: fehler });

  const firma = await db.get('SELECT * FROM crm_companies WHERE id = ?', [einladung.company_id]);
  const kontakt = await db.get('SELECT id, first_name, last_name, salutation, email, responsibility FROM crm_contacts WHERE id = ?', [einladung.contact_id]);
  if (!firma || !kontakt) return res.status(404).json({ success: false, error: 'Der Datensatz ist nicht mehr vorhanden.' });

  if (!einladung.geoeffnet_am) {
    await db.run(`UPDATE pflege_einladungen SET geoeffnet_am = now(), status = CASE WHEN status = 'versendet' THEN 'geoeffnet' ELSE status END WHERE id = ?`, [einladung.id]).catch(() => {});
  }

  const fehlend = JSON.parse(einladung.fehlend_json || '[]');
  res.json({ success: true, data: {
    firma: {
      name: firma.name, sektor: firma.sektor || '', schwerpunkt: firma.schwerpunkt || '',
      region: firma.region || '', employees: firma.employees || '',
      street: firma.street || '', postal_code: firma.postal_code || '',
      city: firma.city || '', country: firma.country || '',
    },
    kontakt: { name: [kontakt.first_name, kontakt.last_name].filter(Boolean).join(' '), email: kontakt.email || '', responsibility: kontakt.responsibility || '' },
    // Nur die Felder, die eine Person selbst beantworten kann.
    fehlend: voll.selbstPflegbar(fehlend),
    labels: Object.fromEntries(voll.FELDER.map((f) => [f.schluessel, f.label])),
    vokabular: { sektoren: vokabular.SEKTOREN, schwerpunkte: vokabular.SCHWERPUNKTE, laender: vokabular.LAENDER },
  } });
}));

const FIRMENFELDER = ['sektor', 'schwerpunkt', 'region', 'employees', 'street', 'postal_code', 'city', 'country'];

// Angaben ergänzen. Nur die Felder dieser Firma, nichts anderes.
publicRouter.post('/:token', pflegeLimiter, wrap(async (req, res) => {
  const { einladung, fehler } = await einladungZu(req.params.token);
  if (fehler) return res.status(404).json({ success: false, error: fehler });

  const eingabe = (req.body && req.body.firma) || {};
  const patch = {};
  for (const f of FIRMENFELDER) {
    if (eingabe[f] === undefined) continue;
    const wert = String(eingabe[f] == null ? '' : eingabe[f]).trim();
    if (!wert) continue;                                  // Leeres löscht nichts
    if (f === 'sektor' && !vokabular.istSektor(wert)) {
      return res.status(400).json({ success: false, error: 'Bitte wählen Sie einen Sektor aus der Liste.' });
    }
    if (f === 'employees') { const n = Number(wert); if (!Number.isFinite(n) || n <= 0) continue; patch.employees = Math.round(n); continue; }
    patch[f] = wert;
  }
  // Schwerpunkt muss zum Sektor passen. Sonst entstehen Angaben wie
  // „Handel / Private Equity", die sich später nicht auswerten lassen.
  const firmaAlt = await db.get('SELECT sektor FROM crm_companies WHERE id = ?', [einladung.company_id]);
  const sektor = patch.sektor || (firmaAlt && firmaAlt.sektor) || '';
  if (patch.schwerpunkt && !vokabular.schwerpunktPasst(sektor, patch.schwerpunkt)) {
    return res.status(400).json({ success: false, error: 'Der gewählte Schwerpunkt passt nicht zum Sektor.' });
  }

  if (Object.keys(patch).length) {
    await db.run(
      `UPDATE crm_companies SET ${Object.keys(patch).map((k) => `${k} = ?`).join(', ')}, updated_at = now() WHERE id = ?`,
      [...Object.values(patch), einladung.company_id]).catch(() => {});
  }

  // Angaben zur Person, sofern mitgeschickt.
  const person = (req.body && req.body.kontakt) || {};
  const kPatch = {};
  if (person.responsibility && String(person.responsibility).trim()) kPatch.responsibility = String(person.responsibility).trim().slice(0, 200);
  if (person.email && String(person.email).includes('@')) kPatch.email = String(person.email).trim().toLowerCase();
  if (Object.keys(kPatch).length) {
    await db.run(
      `UPDATE crm_contacts SET ${Object.keys(kPatch).map((k) => `${k} = ?`).join(', ')} WHERE id = ?`,
      [...Object.values(kPatch), einladung.contact_id]).catch(() => {});
  }

  await db.run(`UPDATE pflege_einladungen SET status = 'ausgefuellt', ausgefuellt_am = now(), token_hash = ? WHERE id = ?`,
    [mailing.tokenHash(mailing.neuerToken()), einladung.id]);
  db.auditLog(null, 'STAMMDATEN_SELBSTPFLEGE', 'crm_company', einladung.company_id,
    `${Object.keys(patch).length} Feld(er) ergänzt`, req.ip);
  res.json({ success: true, data: { gespeichert: Object.keys(patch).length + Object.keys(kPatch).length } });
}));

// Alles stimmt. Auch das ist ein Ergebnis und wird mit Zeitstempel festgehalten.
publicRouter.post('/:token/bestaetigen', pflegeLimiter, wrap(async (req, res) => {
  const { einladung, fehler } = await einladungZu(req.params.token);
  if (fehler) return res.status(404).json({ success: false, error: fehler });
  await db.run(`UPDATE pflege_einladungen SET status = 'bestaetigt', bestaetigt_am = now(), token_hash = ? WHERE id = ?`,
    [mailing.tokenHash(mailing.neuerToken()), einladung.id]);
  await db.run('UPDATE crm_companies SET updated_at = now() WHERE id = ?', [einladung.company_id]).catch(() => {});
  db.auditLog(null, 'STAMMDATEN_BESTAETIGT', 'crm_company', einladung.company_id, 'Angaben als aktuell bestätigt', req.ip);
  res.json({ success: true });
}));

// Abmeldung, und zwar nur für dieses Mailing. Das Konto bleibt unberührt.
publicRouter.post('/:token/abmelden', pflegeLimiter, wrap(async (req, res) => {
  const hash = mailing.tokenHash(req.params.token);
  const e = await db.get('SELECT * FROM pflege_einladungen WHERE token_hash = ?', [hash]).catch(() => null);
  if (!e) return res.status(404).json({ success: false, error: 'Der Link ist ungültig.' });
  await db.run(`UPDATE pflege_einladungen SET status = 'abgemeldet', abgemeldet_am = now() WHERE id = ?`, [e.id]);
  await db.run(
    `INSERT INTO pflege_sperren (tenant_id, email, grund, quelle) VALUES (?, ?, 'Abmeldung über den Link im Mailing', 'abmeldung')
     ON CONFLICT (tenant_id, email) DO NOTHING`, [e.tenant_id || 1, e.email]).catch(() => {});
  db.auditLog(null, 'STAMMDATEN_ABGEMELDET', 'crm_contact', e.contact_id, 'Abmeldung vom Pflege-Mailing', req.ip);
  res.json({ success: true });
}));

// ═══════════════════════════════════════════════════════════════════════════
// Intern: Kampagnen und Datenpflege
// ═══════════════════════════════════════════════════════════════════════════
const router = express.Router();
router.use(authenticate, nurStaff);

// Übersicht „Datenpflege": Firmen mit fehlenden Feldern, filterbar.
router.get('/pflege/uebersicht', wrap(async (req, res) => {
  const q = qFor(req);
  const firmen = await q.all(`
    SELECT c.id, c.name, c.sektor, c.schwerpunkt, c.rollen_json, c.region, c.employees,
           c.street, c.postal_code, c.city, c.country, c.company_type
      FROM crm_companies c WHERE c.is_deleted IS NOT TRUE ORDER BY c.name`).catch(() => []);
  const kontakte = await q.all(`
    SELECT k.id, k.last_name, k.email, k.responsibility, cc.company_id
      FROM crm_company_contacts cc JOIN crm_contacts k ON k.id = cc.contact_id
     WHERE k.is_deleted IS NOT TRUE`).catch(() => []);
  const proFirma = new Map();
  for (const k of kontakte) { const l = proFirma.get(Number(k.company_id)) || []; l.push(k); proFirma.set(Number(k.company_id), l); }

  const filter = String(req.query.fehlt || '').trim();
  const zeilen = [];
  const jeFeld = {};
  for (const f of firmen) {
    const { fehlend, labels, vollstaendig } = voll.pruefe(f, proFirma.get(Number(f.id)) || []);
    for (const k of fehlend) jeFeld[k] = (jeFeld[k] || 0) + 1;
    if (vollstaendig) continue;
    if (filter && !fehlend.includes(filter)) continue;
    zeilen.push({ id: f.id, name: f.name, sektor: f.sektor || null, company_type: f.company_type || null, fehlend, labels });
  }
  res.json({ success: true, data: {
    zeilen, gesamt: firmen.length, unvollstaendig: zeilen.length,
    je_feld: Object.entries(jeFeld).map(([k, n]) => ({ feld: k, label: voll.labelVon(k), anzahl: n })).sort((a, b) => b.anzahl - a.anzahl),
    felder: voll.FELDER,
  } });
}));

// Stapelbearbeitung: ein Feld für mehrere Firmen auf denselben Wert setzen.
router.post('/pflege/stapel', wrap(async (req, res) => {
  const feld = String(req.body.feld || '');
  const wert = String(req.body.wert == null ? '' : req.body.wert).trim();
  const ids = Array.isArray(req.body.ids) ? req.body.ids.map(Number).filter(Boolean) : [];
  if (!['sektor', 'schwerpunkt', 'region', 'country'].includes(feld)) {
    return res.status(400).json({ success: false, error: 'Dieses Feld lässt sich nicht im Stapel setzen.' });
  }
  if (!wert || !ids.length) return res.status(400).json({ success: false, error: 'Wert und Auswahl erforderlich.' });
  if (feld === 'sektor' && !vokabular.istSektor(wert)) return res.status(400).json({ success: false, error: 'Unbekannter Sektor.' });

  const q = qFor(req);
  let gesetzt = 0; const abgelehnt = [];
  for (const id of ids) {
    if (feld === 'schwerpunkt') {
      const f = await q.get('SELECT sektor, name FROM crm_companies WHERE id = ?', [id]);
      if (!f || !vokabular.schwerpunktPasst(f.sektor, wert)) { abgelehnt.push({ id, name: f && f.name, grund: 'Schwerpunkt passt nicht zum Sektor' }); continue; }
    }
    await q.run(`UPDATE crm_companies SET ${feld} = ?, updated_at = now() WHERE id = ?`, [wert, id]).catch(() => {});
    gesetzt += 1;
  }
  db.auditLog(req.user.id, 'CRM_STAPEL_PFLEGE', 'crm_company', null, `${feld} = ${wert} für ${gesetzt} Firmen`, req.ip);
  res.json({ success: true, data: { gesetzt, abgelehnt } });
}));

// ── Kampagnen ───────────────────────────────────────────────────────────────
router.get('/kampagnen', wrap(async (req, res) => {
  const q = qFor(req);
  const zeilen = await q.all('SELECT * FROM pflege_kampagnen ORDER BY id DESC LIMIT 50').catch(() => []);
  const mit = [];
  for (const k of zeilen) mit.push({ ...k, zahlen: await mailing.dashboard(q, k.id) });
  res.json({ success: true, data: mit });
}));

router.post('/kampagnen', wrap(async (req, res) => {
  const q = qFor(req);
  const name = String(req.body.name || '').trim() || `Stammdatenpflege ${new Date().toLocaleDateString('de-DE')}`;
  const id = await q.insert(
    `INSERT INTO pflege_kampagnen (tenant_id, name, betreff, text, text_erinnerung, created_by)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [req.tenantId || 1, name, req.body.betreff || mailing.STANDARD_BETREFF,
     req.body.text || mailing.STANDARD_TEXT, req.body.text_erinnerung || mailing.STANDARD_ERINNERUNG, req.user.id]);
  const anlegen = await mailing.einladungenAnlegen(q, { tenant: req.tenantId || 1, kampagneId: id });
  db.auditLog(req.user.id, 'PFLEGE_KAMPAGNE_ANGELEGT', 'pflege_kampagne', id, `${anlegen.angelegt} Einladungen`, req.ip);
  res.status(201).json({ success: true, data: { id, ...anlegen, klartext: undefined, ohneAnsprechperson: anlegen.ohneAnsprechperson } });
}));

router.put('/kampagnen/:id', wrap(async (req, res) => {
  const q = qFor(req);
  const erlaubt = ['name', 'betreff', 'text', 'text_erinnerung', 'status', 'ration', 'pause_sekunden', 'fenster_von', 'fenster_bis', 'erinnerung_nach_tagen'];
  const patch = {};
  for (const f of erlaubt) if (req.body[f] !== undefined) patch[f] = req.body[f];
  if (!Object.keys(patch).length) return res.json({ success: true });
  await q.run(`UPDATE pflege_kampagnen SET ${Object.keys(patch).map((k) => `${k} = ?`).join(', ')}, updated_at = now() WHERE id = ?`,
    [...Object.values(patch), req.params.id]);
  res.json({ success: true });
}));

// Eine Ration senden. Bewusst von Hand angestoßen, damit niemand aus Versehen
// einen Massenversand auslöst.
router.post('/kampagnen/:id/senden', wrap(async (req, res) => {
  const q = qFor(req);
  const appUrl = process.env.FRONTEND_URL || 'https://www.capitalmatch.de';
  const r = await mailing.versendeRation(q, {
    tenant: req.tenantId || 1, kampagneId: Number(req.params.id), appUrl,
    erinnerung: req.body && req.body.erinnerung === true,
  });
  res.json({ success: true, data: r });
}));

router.get('/kampagnen/:id/dashboard', wrap(async (req, res) => {
  res.json({ success: true, data: await mailing.dashboard(qFor(req), Number(req.params.id)) });
}));

// Empfängervorschau, bevor eine Kampagne angelegt wird.
router.get('/empfaenger-vorschau', wrap(async (req, res) => {
  const r = await mailing.empfaenger(qFor(req), { tenant: req.tenantId || 1 });
  res.json({ success: true, data: {
    anzahl: r.zeilen.length, firmen_geprueft: r.firmenGeprueft,
    ohne_ansprechperson: r.ohneAnsprechperson.slice(0, 50),
    beispiele: r.zeilen.slice(0, 10).map((z) => ({ firma: z.firma, email: z.email, fehlend: z.labels })),
  } });
}));

module.exports = { router, publicRouter };
