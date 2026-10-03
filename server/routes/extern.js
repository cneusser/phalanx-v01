// ─────────────────────────────────────────────────────────────────────────────
// Schnittstelle für Phalanx OS (v0.446, Schritt 3 des Auftrags).
//
// Nur für die Maschine, nicht für Nutzer. Absicherung über einen Schlüssel in
// der Umgebungskonfiguration, nach demselben Muster wie der Posteingang:
// Ohne gesetzten Schlüssel ist die Schnittstelle abgeschaltet, nicht offen.
// Eine Schnittstelle, die bei fehlender Konfiguration durchlässt, ist die
// gefährlichste Art von Vergesslichkeit.
//
// Was hier hinausgeht, sind Zahlen und Zustände. Keine Klarnamen, kein
// Firmenname des Verkäufers, keine Dokumente, keine Q&A-Texte, keine
// Nachrichten. Phalanx OS ist nicht der Datenraum. Diese Zusage steht nicht
// nur im Kommentar: verbotenesGefunden() prüft jede Antwort, bevor sie
// hinausgeht, und eine Antwort mit einem unerwarteten Feld wird nicht
// gesendet, sondern gemeldet.
// ─────────────────────────────────────────────────────────────────────────────
const express = require('express');
const db = require('../db/database');
const wrap = require('../utils/asyncHandler');
const pp = require('../utils/phalanxProjekt');

const router = express.Router();

/** Zeitgleicher Vergleich, damit die Laufzeit nichts über den Schlüssel verrät. */
function gleich(a, b) {
  const x = String(a || ''); const y = String(b || '');
  if (x.length !== y.length) return false;
  let unterschied = 0;
  for (let i = 0; i < x.length; i++) unterschied |= x.charCodeAt(i) ^ y.charCodeAt(i);
  return unterschied === 0;
}

function schluesselPruefen(req, res, next) {
  const erwartet = process.env.PHALANX_OS_SYNC_KEY;
  if (!erwartet) {
    return res.status(503).json({ success: false, error: 'Die Schnittstelle ist nicht konfiguriert.' });
  }
  const kopf = String(req.headers.authorization || '');
  const gegeben = kopf.startsWith('Bearer ') ? kopf.slice(7) : '';
  if (!gleich(gegeben, erwartet)) {
    // Protokolliert wird der Versuch, nicht der Schlüssel.
    console.warn(`⚠️  Abgleich abgewiesen: ungültiger Schlüssel von ${req.ip}`);
    return res.status(401).json({ success: false, error: 'Kein gültiger Schlüssel.' });
  }
  return next();
}

router.use(schluesselPruefen);

// ── Mandate: Zahlen und Zustände ───────────────────────────────────────────
router.get('/mandate', wrap(async (req, res) => {
  const zeilen = await db.all(`
    SELECT p.id, p.codename, p.status, p.mandate_type, p.deal_type,
           p.phalanx_projekt_nummer, p.created_at, p.updated_at,
           (SELECT COUNT(*)::int FROM interests i WHERE i.project_id = p.id) AS interessenten,
           (SELECT COUNT(*)::int FROM nda_requests n
             WHERE n.project_id = p.id AND (n.signed_at IS NOT NULL OR n.status IN ('signed','approved'))) AS nda_unterschrieben,
           (SELECT COUNT(*)::int FROM interests i
             WHERE i.project_id = p.id AND i.stage IN ('dataroom_granted','loi')) AS datenraum_freigegeben,
           (SELECT MAX(a.created_at) FROM safe_access_log a WHERE a.project_id = p.id) AS letzte_aktivitaet_am
      FROM projects p
     WHERE p.status = 'active'
     ORDER BY p.id DESC LIMIT 500`).catch(() => []);

  const daten = zeilen.map(pp.mandatNachAussen);

  // Die Zusage wird geprüft, nicht behauptet. Ein Feld, das jemand später
  // ergänzt, ohne hier nachzusehen, verlässt die Anwendung nicht.
  for (const satz of daten) {
    const verboten = pp.verbotenesGefunden(satz);
    if (verboten.length) {
      console.error('[extern/mandate] Unerwartete Felder, Antwort zurückgehalten:', verboten.join(', '));
      return res.status(500).json({ success: false,
        error: 'Die Antwort enthielt unerwartete Felder und wurde zurückgehalten.' });
    }
  }

  console.log(`⇄  Abgleich gelesen: ${daten.length} Mandate an Phalanx OS`);
  res.json({ success: true, data: daten });
}));

// ── Projekt: was Phalanx OS über ein Mandat mitteilt ───────────────────────
router.post('/projekt', wrap(async (req, res) => {
  const b = req.body || {};
  const gelesen = pp.nummerLesen(b.nummer);
  if (gelesen.fehler || !gelesen.nummer) {
    return res.status(400).json({ success: false, error: gelesen.fehler || 'Nummer fehlt.' });
  }

  const mandat = await db.get(
    'SELECT id, codename FROM projects WHERE phalanx_projekt_nummer = ? LIMIT 1', [gelesen.nummer]);
  if (!mandat) {
    // Bewusst kein Anlegen. Ein Mandat entsteht hier, nicht durch einen
    // Abgleich: Eine falsch getippte Nummer erzeugte sonst ein Phantommandat.
    return res.status(404).json({ success: false,
      error: `Kein Mandat trägt die Nummer ${gelesen.nummer}. Angelegt wird über diesen Weg nichts.` });
  }

  const felder = pp.uebernahmeFelder(b);
  // Doppelte Sicherung: Was unantastbar ist, kann hier nicht hineinkommen,
  // auch wenn uebernahmeFelder eines Tages mehr zurückgibt.
  for (const k of pp.UNANTASTBAR) delete felder[k];

  const satz = Object.keys(felder);
  await db.run(
    `UPDATE projects SET ${satz.map((k) => `${k} = ?`).join(', ')} WHERE id = ?`,
    [...satz.map((k) => felder[k]), mandat.id]);

  console.log(`⇄  Abgleich übernommen: Mandat ${mandat.codename} (Nummer ${gelesen.nummer}), Felder ${satz.join(', ')}`);
  res.json({ success: true, data: { mandat_id: mandat.id, uebernommen: satz } });
}));

module.exports = router;
