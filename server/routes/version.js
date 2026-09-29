// ─────────────────────────────────────────────────────────────────────────────
// Welche Fassung läuft hier? (v0.421)
//
// Anlass war eine halbe Stunde Suche nach einem Fehler, den es nicht gab: Eine
// Änderung war fertig, getestet und committet, aber nicht deployed. Von aussen
// sieht das genauso aus wie ein Fehler in der Änderung selbst. Dazu kommt der
// Browser, der eine alte Fassung im Speicher halten kann, und dann sieht es
// auch noch für zwei Personen unterschiedlich aus.
//
// Diese Route beantwortet die Frage in einem Aufruf. Sie ist bewusst offen:
// Es steht nichts Vertrauliches darin, und wer einen Fehler meldet, soll die
// Angabe mitschicken können, ohne sich anmelden zu müssen.
// ─────────────────────────────────────────────────────────────────────────────
const express = require('express');
const path = require('path');
const fs = require('fs');

const router = express.Router();

/**
 * Die Version lesen.
 *
 * Zuerst aus server/package.json, denn nur dieses Verzeichnis liegt sicher im
 * Container. Der erste Anlauf las die Datei im Wurzelverzeichnis, und die
 * kopiert das Dockerfile nicht hinein: Der Commit stand da, die Version nicht.
 * Derselbe Fehler wie bei der gemeinsamen Branchenliste, eine Ebene tiefer.
 *
 * Das Wurzelverzeichnis bleibt als zweiter Anlauf, für den Betrieb ausserhalb
 * eines Containers.
 */
function lies() {
  const orte = [
    path.join(__dirname, '..', 'package.json'),
    path.join(__dirname, '..', '..', 'package.json'),
  ];
  for (const p of orte) {
    try {
      const v = JSON.parse(fs.readFileSync(p, 'utf8')).version;
      if (v) return v;
    } catch { /* naechster Ort */ }
  }
  return null;
}

// Einmal lesen genügt: Die Datei ändert sich nicht, während der Dienst läuft.
const VERSION = lies();
const GESTARTET = new Date().toISOString();

function pruefungen() {
  try {
    return require('../utils/adressenPruefen').pruefe().map((f) => ({ schwere: f.schwere, text: f.text }));
  } catch { return []; }
}

router.get('/version', (req, res) => {
  res.json({
    success: true,
    data: {
      version: VERSION,
      // Railway setzt diese Variablen selbst. Fehlen sie, läuft es woanders.
      commit: process.env.RAILWAY_GIT_COMMIT_SHA
        ? String(process.env.RAILWAY_GIT_COMMIT_SHA).slice(0, 7) : null,
      deployed_am: process.env.RAILWAY_DEPLOYMENT_CREATED_AT || null,
      gestartet_am: GESTARTET,
      umgebung: process.env.NODE_ENV || 'development',
      // Was an der Konfiguration nicht stimmt (v0.426).
      //
      // Die Startprüfung aus v0.419 schreibt ihre Beanstandungen ins Protokoll,
      // und dorthin sieht man nur, wenn man schon weiss, dass etwas kaputt ist.
      // Hier stehen sie so, dass man sie von aussen sieht, ohne sich anzumelden
      // und ohne in den Logs zu suchen. Es sind Adressen, keine Geheimnisse.
      hinweise: pruefungen(),
    },
  });
});

/**
 * Einen Absturz der Oberfläche melden (v0.424).
 *
 * Bewusst ohne Anmeldung: Ein Fehler, der beim Laden auftritt, trifft auch
 * jemanden, der noch nicht angemeldet ist, und gerade der wird sich nicht
 * melden. Die Kennung des Nutzers kommt nur mit, wenn ein gültiges Token
 * dabei ist.
 *
 * Gespeichert wird nur, was zur Eingrenzung nötig ist. Alles wird gekürzt,
 * damit niemand die Tabelle als Ablage missbrauchen kann, und dieselbe Meldung
 * auf derselben Seite zählt hoch, statt eine neue Zeile anzulegen.
 */
const kurz = (w, n) => (w == null ? null : String(w).slice(0, n));

router.post('/fehler', async (req, res) => {
  try {
    const db = require('../db/database');
    const b = req.body || {};
    const meldung = kurz(b.meldung, 500);
    if (!meldung || !meldung.trim()) return res.json({ success: true });

    // Nur der Pfad, keine Parameter: in einer Adresse wie
    // /stammdaten/<token> steckt ein Schlüssel, der hier nichts verloren hat.
    let adresse = null;
    try { adresse = new URL(String(b.adresse || ''), 'https://x').pathname; } catch { /* egal */ }
    if (adresse && adresse.length > 120) adresse = adresse.slice(0, 120);

    let userId = null;
    try {
      const auth = String(req.headers.authorization || '');
      if (auth.startsWith('Bearer ')) {
        const jwt = require('jsonwebtoken');
        const { getJwtSecret } = require('../utils/jwtSecret');
        userId = jwt.verify(auth.slice(7), getJwtSecret()).userId || null;
      }
    } catch { /* ohne gültiges Token bleibt die Kennung leer */ }

    await db.run(
      `INSERT INTO fehlermeldungen (tenant_id, user_id, meldung, komponenten, adresse, fassung, browser)
       VALUES (1, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (tenant_id, md5(meldung), COALESCE(adresse,''), COALESCE(fassung,''))
       DO UPDATE SET anzahl = fehlermeldungen.anzahl + 1, zuletzt_am = now(), erledigt_am = NULL`,
      [userId, meldung, kurz(b.komponenten, 1500), adresse, kurz(b.fassung, 40),
        kurz(req.headers['user-agent'], 200)]);
  } catch { /* eine Fehlermeldung darf nie selbst einen Fehler auslösen */ }
  res.json({ success: true });
});

module.exports = router;
