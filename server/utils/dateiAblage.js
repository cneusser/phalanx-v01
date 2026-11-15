// ─────────────────────────────────────────────────────────────────────────────
// Eine Stelle, an der Dateien liegen (v0.477, Datenraum 2.0 Sprint 1a)
//
// Vorher schrieben vier Stellen an der Speicherwahl vorbei direkt auf das
// Railway-Volume:
//
//   routes/documents.js      der alte Dokumente-Reiter, also Teaser und IM
//   routes/projects.js       Mandatsbilder
//   routes/safe.js           die zweite Kopie bei „In Datenraum übernehmen"
//   utils/ndaGenerator.js    unterzeichnete Vertraulichkeitsvereinbarungen
//
// Jede dieser Stellen hatte ihre eigene Ordnerlogik, ihre eigene
// Namensbereinigung und ihr eigenes Verständnis davon, wo „hier" ist. Dass
// die Hälfte der Unterlagen nicht bei R2 liegt, obwohl R2 eingestellt ist,
// folgt daraus und ist kein Betriebsfehler.
//
// Diese Datei ist der eine Weg. Sie kennt nur drei Dinge: ablegen, holen,
// entfernen. Wohin, entscheidet der Speicheranbieter.
//
// Zwei Festlegungen, die bleiben sollen:
//
//   1. Der Schlüssel wird gebildet, nicht übernommen. Ein Dateiname aus dem
//      Upload taugt nicht als Schlüssel: Er kann Schrägstriche enthalten,
//      zweimal vorkommen und in zwei Mandaten derselbe sein.
//   2. Gelesen wird mit Rückfall. Bestandszeilen tragen `file_path` und
//      keinen Schlüssel; die bleiben lesbar, bis sie umgezogen sind. Ohne
//      diesen Rückfall wäre der erste Tag nach dem Einspielen ein Tag ohne
//      Unterlagen.
// ─────────────────────────────────────────────────────────────────────────────

const path = require('path');
const crypto = require('crypto');

/** Der Schlüssel einer neuen Datei. Mandat, Bereich, Zufall, Endung. */
function schluessel({ projectId, bereich = 'dokumente', dateiname = '' }) {
  const endung = path.extname(String(dateiname)).toLowerCase().replace(/[^.a-z0-9]/g, '').slice(0, 10);
  return `project_${Number(projectId) || 0}/${bereich}/${crypto.randomUUID()}${endung}`;
}

/**
 * Eine Datei ablegen.
 *
 * @returns {Promise<{storage_key: string, size: number, pruefsumme: string}>}
 */
async function ablegen(buffer, { projectId, bereich, dateiname, mime }) {
  if (!Buffer.isBuffer(buffer)) throw new Error('Es wurde kein Dateiinhalt übergeben.');
  const key = schluessel({ projectId, bereich, dateiname });
  const { getStorage } = require('../providers/storage');
  await getStorage().put(key, buffer, mime || 'application/octet-stream');
  return {
    storage_key: key,
    size: buffer.length,
    pruefsumme: crypto.createHash('sha256').update(buffer).digest('hex'),
  };
}

/**
 * Eine Datei holen, egal auf welchem Weg sie abgelegt wurde.
 *
 * @param zeile  { storage_key, file_path }
 * @returns {Promise<Buffer>}
 */
async function holen(zeile) {
  const { getStorage } = require('../providers/storage');
  if (zeile && zeile.storage_key) return getStorage().get(zeile.storage_key);
  // Rückfall für Bestandszeilen: die Datei liegt als Datei auf dem Volume.
  if (zeile && zeile.file_path) {
    const fs = require('fs');
    if (fs.existsSync(zeile.file_path)) return fs.readFileSync(zeile.file_path);
    throw Object.assign(new Error('Die Datei ist auf dem Datenträger nicht mehr vorhanden.'), { status: 410 });
  }
  throw Object.assign(new Error('Zu diesem Eintrag ist keine Datei hinterlegt.'), { status: 404 });
}

/** Eine Datei entfernen. Fehlt sie schon, ist das kein Fehler. */
async function entfernen(zeile) {
  try {
    if (zeile && zeile.storage_key) {
      const { getStorage } = require('../providers/storage');
      await getStorage().delete(zeile.storage_key);
      return true;
    }
    if (zeile && zeile.file_path) {
      const fs = require('fs');
      if (fs.existsSync(zeile.file_path)) fs.unlinkSync(zeile.file_path);
      return true;
    }
  } catch { /* Ein Entfernen, das scheitert, darf den Vorgang nicht aufhalten */ }
  return false;
}

/** Liegt diese Zeile noch auf dem Volume statt beim Speicheranbieter? */
const nochAufDemVolume = (zeile) => !!(zeile && !zeile.storage_key && zeile.file_path);

module.exports = { schluessel, ablegen, holen, entfernen, nochAufDemVolume };
