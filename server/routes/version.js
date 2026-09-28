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

function lies() {
  try {
    const p = path.join(__dirname, '..', '..', 'package.json');
    return JSON.parse(fs.readFileSync(p, 'utf8')).version || null;
  } catch { return null; }
}

// Einmal lesen genügt: Die Datei ändert sich nicht, während der Dienst läuft.
const VERSION = lies();
const GESTARTET = new Date().toISOString();

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
    },
  });
});

module.exports = router;
