// ─────────────────────────────────────────────────────────────────────────────
// NDAs, die ausserhalb der Plattform unterschrieben wurden (v0.504)
//
// Der Online-Weg erzeugt alles selbst: Wortlaut, Fassung, Zeitpunkt, Prüfsumme,
// Gegenzeichnung. Ein NDA, der per Mail zurückkommt, bringt nur ein PDF mit.
// Alles andere muss eingetragen werden, sonst ist die Ablage ein Ordner und
// keine Dokumentation.
//
// Deshalb verlangt das Hochlegen dieselben Angaben, die der Online-Weg
// festhält: wann unterzeichnet, von wem, für welche Vertragspartei, auf
// welchem Weg hereingekommen. Fehlt eine davon, wird nichts gespeichert. Ein
// unvollständiger Nachweis ist schlechter als keiner, weil er so aussieht, als
// wäre die Sache erledigt.
//
// Zwei Rechte, bewusst verschieden:
//
//   Hochlegen und Liste   nur die Verwaltung des Mandats (projectAccess).
//   Herunterladen         die Verwaltung und der Unterzeichner selbst, sofern
//                         sein Konto an der Zeile hängt. Seinen eigenen
//                         Vertrag muss jemand lesen können, ohne zu fragen.
//
// Gelöscht wird nichts. Eine neue Fassung wird hochgelegt, die alte dabei als
// ersetzt gekennzeichnet; beide bleiben abrufbar. Jeder Download steht im
// Protokoll.
// ─────────────────────────────────────────────────────────────────────────────

const express = require('express');
const multer = require('multer');
const db = require('../db/database');
const { authenticate } = require('../middleware/auth');
const wrap = require('../utils/asyncHandler');
const dateitypen = require('../utils/dateitypen');
const dateiAblage = require('../utils/dateiAblage');
const { canManage } = require('../utils/projectAccess');
const { mitFehlermeldung } = require('../utils/hochladen');

const router = express.Router();

const scoped = (req, fn) => (req.tenantId && req.tenantId !== 1) ? db.withTenant(req.tenantId, fn) : fn(db);
const getFn = (req) => (sql, p) => scoped(req, (t) => t.get(sql, p));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024, files: 1 },
  fileFilter: dateitypen.multerFilter,
});

const HERKUNFT = {
  mail: 'per E-Mail zurückerhalten',
  papier: 'auf Papier unterschrieben',
  anbieter: 'über einen anderen Signaturanbieter',
  sonstiges: 'auf anderem Weg',
};

/**
 * Ein Datum ohne Uhrzeit bleibt ein Datum (v0.504).
 *
 * Die Datenbankspalte ist ein DATE, der Treiber macht daraus einen Zeitpunkt
 * um Mitternacht Ortszeit. Über toISOString ausgeliefert, wird aus dem 20.
 * wieder der 19., weil Mitternacht in Mitteleuropa der Vorabend in UTC ist.
 * Bei einem Unterzeichnungsdatum ist das kein Schönheitsfehler.
 */
function tagVon(wert) {
  if (!wert) return null;
  if (wert instanceof Date) {
    const m = String(wert.getMonth() + 1).padStart(2, '0');
    const t = String(wert.getDate()).padStart(2, '0');
    return `${wert.getFullYear()}-${m}-${t}`;
  }
  return String(wert).slice(0, 10);
}

function raus(z) {
  return {
    id: z.id,
    project_id: z.project_id,
    contact_id: z.contact_id,
    party_id: z.party_id,
    user_id: z.user_id,
    dateiname: z.dateiname,
    groesse: Number(z.groesse || 0),
    pruefsumme: z.pruefsumme,
    // Ein Datum ohne Uhrzeit bleibt ein Datum (v0.504). Als Zeitstempel
    // ausgeliefert, verschiebt die Zeitzone den 20. auf den 19., und das
    // Unterzeichnungsdatum ist nichts, woran gerundet werden darf.
    unterzeichnet_am: tagVon(z.unterzeichnet_am),
    unterzeichner_name: z.unterzeichner_name,
    partei_firma: z.partei_firma,
    partei_sitz: z.partei_sitz,
    partei_register: z.partei_register,
    herkunft: z.herkunft,
    herkunft_text: HERKUNFT[z.herkunft] || HERKUNFT.sonstiges,
    bemerkung: z.bemerkung,
    hochgeladen_von: z.hochgeladen_von,
    hochgeladen_von_name: z.hochlader_name || null,
    hochgeladen_am: z.hochgeladen_am,
    ersetzt_am: z.ersetzt_am,
    gilt: !z.ersetzt_am,
  };
}

/**
 * Die Pflichtangaben prüfen.
 *
 * Bewusst streng: Ein Datum in der Zukunft ist entweder ein Tippfehler oder
 * ein Vorgang, der noch nicht abgeschlossen ist. Beides gehört nicht
 * kommentarlos in eine Urkundenablage.
 */
function angabenPruefen(k) {
  const fehlt = [];
  const datum = String(k.unterzeichnet_am || '').trim();
  const name = String(k.unterzeichner_name || '').trim();
  const firma = String(k.partei_firma || '').trim();
  const sitz = String(k.partei_sitz || '').trim();
  const register = String(k.partei_register || '').trim();
  const herkunft = String(k.herkunft || '').trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(datum)) fehlt.push('Unterzeichnungsdatum');
  if (name.length < 3) fehlt.push('Name des Unterzeichners');
  if (firma.length < 2) fehlt.push('Vertragspartei (Firma)');
  if (sitz.length < 2) fehlt.push('Sitz der Vertragspartei');
  if (register.length < 2) fehlt.push('Registereintrag');
  if (!Object.prototype.hasOwnProperty.call(HERKUNFT, herkunft)) fehlt.push('Herkunft');

  if (!fehlt.length) {
    const heute = new Date().toISOString().slice(0, 10);
    if (datum > heute) {
      return { fehlt: [], fehler: 'Das Unterzeichnungsdatum liegt in der Zukunft. Bitte prüfen Sie das Datum auf dem Dokument.' };
    }
  }
  return { fehlt, fehler: null, werte: { datum, name, firma, sitz, register, herkunft, bemerkung: String(k.bemerkung || '').trim() || null } };
}

// Diese beiden Wege stehen bewusst vor `/:projectId`. Express nimmt die
// erste passende Regel, und `/:projectId` passt sonst auch auf „datei".
// ── Herunterladen ────────────────────────────────────────────────────────────
router.get('/datei/:id', authenticate, wrap(async (req, res) => {
  const zeile = await scoped(req, (t) => t.get('SELECT * FROM nda_dokumente WHERE id = ?', [Number(req.params.id)]));
  if (!zeile) return res.status(404).json({ success: false, error: 'Dieses Dokument gibt es nicht.' });

  const selbst = zeile.user_id && Number(zeile.user_id) === Number(req.user.id);
  const verwaltung = await canManage(getFn(req), req.user, zeile.project_id);
  if (!selbst && !verwaltung) {
    return res.status(403).json({ success: false, error: 'Keine Berechtigung für dieses Dokument' });
  }

  const inhalt = await dateiAblage.holen(zeile);
  dateitypen.kopfzeilen(res, zeile.dateiname, zeile.mime, false);
  db.auditLog(req.user.id, selbst && !verwaltung ? 'NDA_DOKUMENT_EIGENES' : 'NDA_DOKUMENT_ABGERUFEN',
    'nda_dokument', zeile.id, zeile.dateiname, req.ip);
  res.send(inhalt);
}));

// ── Was der Unterzeichner selbst sieht ───────────────────────────────────────
router.get('/meine/uebersicht', authenticate, wrap(async (req, res) => {
  const zeilen = await scoped(req, (t) => t.all(
    `SELECT d.id, d.project_id, d.dateiname, d.unterzeichnet_am, d.partei_firma, d.herkunft, d.ersetzt_am,
            p.codename
       FROM nda_dokumente d
       LEFT JOIN projects p ON p.id = d.project_id
      WHERE d.user_id = ? AND d.ersetzt_am IS NULL
      ORDER BY d.unterzeichnet_am DESC`, [req.user.id]));
  res.json({ success: true, data: zeilen.map((z) => ({
    ...z, unterzeichnet_am: tagVon(z.unterzeichnet_am),
    herkunft_text: HERKUNFT[z.herkunft] || HERKUNFT.sonstiges })) });
}));

// ── Liste: was liegt zu diesem Mandat und diesem Kontakt ─────────────────────
router.get('/:projectId', authenticate, wrap(async (req, res) => {
  const projectId = Number(req.params.projectId);
  if (!(await canManage(getFn(req), req.user, projectId))) {
    return res.status(403).json({ success: false, error: 'Keine Berechtigung für dieses Mandat', code: 'NICHT_MEIN_MANDAT' });
  }
  const contactId = req.query.contact_id ? Number(req.query.contact_id) : null;
  const zeilen = await scoped(req, (t) => t.all(
    `SELECT d.*, concat_ws(' ', u.first_name, u.last_name) AS hochlader_name
       FROM nda_dokumente d
       LEFT JOIN users u ON u.id = d.hochgeladen_von
      WHERE d.project_id = ?${contactId ? ' AND d.contact_id = ?' : ''}
      ORDER BY d.id DESC`,
    contactId ? [projectId, contactId] : [projectId]));
  res.json({ success: true, data: { dokumente: zeilen.map(raus), herkunft: HERKUNFT } });
}));

// ── Hochlegen ────────────────────────────────────────────────────────────────
router.post('/:projectId', authenticate, mitFehlermeldung(upload.single('datei'), 25 * 1024 * 1024), wrap(async (req, res) => {
  const projectId = Number(req.params.projectId);
  if (!(await canManage(getFn(req), req.user, projectId))) {
    return res.status(403).json({ success: false, error: 'Keine Berechtigung für dieses Mandat', code: 'NICHT_MEIN_MANDAT' });
  }
  if (!req.file) return res.status(400).json({ success: false, error: 'Es wurde keine Datei übergeben.' });

  const geprueft = angabenPruefen(req.body || {});
  if (geprueft.fehler) return res.status(400).json({ success: false, error: geprueft.fehler });
  if (geprueft.fehlt.length) {
    return res.status(400).json({
      success: false,
      code: 'ANGABEN_FEHLEN',
      fehlende_angaben: geprueft.fehlt,
      error: `Ohne diese Angaben wird nichts abgelegt: ${geprueft.fehlt.join(', ')}.`,
    });
  }
  const w = geprueft.werte;

  const contactId = req.body.contact_id ? Number(req.body.contact_id) : null;
  const partyId = req.body.party_id ? Number(req.body.party_id) : null;

  // Die Partei muss zu diesem Mandat gehören. Sonst hinge der Nachweis am
  // falschen Vorgang, und das fällt erst auf, wenn jemand fragt.
  let partei = null;
  if (partyId) {
    partei = await scoped(req, (t) => t.get(
      'SELECT id, project_id, contact_id FROM crm_deal_parties WHERE id = ?', [partyId]));
    if (!partei || Number(partei.project_id) !== projectId) {
      return res.status(400).json({ success: false, error: 'Diese Zuordnung gehört nicht zu dem gewählten Mandat.' });
    }
  }

  // Das Konto des Unterzeichners, falls es eines gibt: über die Adresse des
  // Kontakts. Ohne Konto wird die Zeile trotzdem angelegt, sie ist dann nur
  // für die Verwaltung lesbar.
  let userId = null;
  const kid = contactId || (partei && partei.contact_id) || null;
  if (kid) {
    const kontakt = await scoped(req, (t) => t.get('SELECT email FROM crm_contacts WHERE id = ?', [kid]));
    if (kontakt && kontakt.email) {
      const konto = await scoped(req, (t) => t.get('SELECT id FROM users WHERE lower(email) = lower(?)', [kontakt.email]));
      if (konto) userId = konto.id;
    }
  }

  const abgelegt = await dateiAblage.ablegen(req.file.buffer, {
    projectId,
    bereich: 'nda',
    dateiname: req.file.originalname,
    mime: req.file.mimetype,
  });

  const id = await scoped(req, (t) => t.insert(
    `INSERT INTO nda_dokumente
       (project_id, contact_id, party_id, user_id, dateiname, storage_key, mime, groesse, pruefsumme,
        unterzeichnet_am, unterzeichner_name, partei_firma, partei_sitz, partei_register, herkunft, bemerkung,
        hochgeladen_von)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
    [projectId, kid, partyId, userId, req.file.originalname, abgelegt.storage_key, req.file.mimetype,
      abgelegt.size, abgelegt.pruefsumme, w.datum, w.name, w.firma, w.sitz, w.register, w.herkunft, w.bemerkung,
      req.user.id]));

  // Ältere Fassungen desselben Vorgangs als ersetzt kennzeichnen. Entfernt
  // wird nichts: Wer wissen will, was vorher galt, soll es sehen können.
  if (kid) {
    await scoped(req, (t) => t.run(
      `UPDATE nda_dokumente SET ersetzt_am = now(), ersetzt_durch = ?
        WHERE project_id = ? AND contact_id = ? AND id <> ? AND ersetzt_am IS NULL`,
      [id, projectId, kid, id]));
  }

  // Die Ampel schaltet mit. Ein hinterlegter NDA ist genau das, was das
  // Kennzeichen „liegt vor" behauptet, nur jetzt belegt.
  if (partyId) {
    await scoped(req, (t) => t.run(
      `UPDATE crm_deal_parties SET nda_status = 'signed' WHERE id = ?`, [partyId]));
  }

  db.auditLog(req.user.id, 'NDA_DOKUMENT_HOCHGELEGT', 'project', projectId,
    `${req.file.originalname} (${w.firma}, unterzeichnet ${w.datum}, ${HERKUNFT[w.herkunft]})`, req.ip);

  const zeile = await scoped(req, (t) => t.get(
    `SELECT d.*, concat_ws(' ', u.first_name, u.last_name) AS hochlader_name FROM nda_dokumente d
       LEFT JOIN users u ON u.id = d.hochgeladen_von WHERE d.id = ?`, [id]));
  res.status(201).json({ success: true, data: raus(zeile), konto_verknuepft: !!userId });
}));

module.exports = router;
module.exports.HERKUNFT = HERKUNFT;
module.exports.angabenPruefen = angabenPruefen;
