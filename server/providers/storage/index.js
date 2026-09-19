// ─────────────────────────────────────────────────────────────────────────────
// Sprint 8: StorageProvider-Factory.
// Interface (alle Provider): put(key, buffer[, mime]) · get(key) → Buffer ·
//   delete(key) · exists(key) · list(prefix) → [{ key, size }].
// Auswahl über ENV STORAGE_PROVIDER = 'local' (Default) | 's3' (S3/R2-kompatibel).
// Umschaltbar ohne Codeänderung; Local ist das heutige Verhalten (Volume/Disk).
// ─────────────────────────────────────────────────────────────────────────────
let instance = null;

// Während eines Umzugs auf S3/R2 liegen noch nicht alle Dateien drüben. Damit in
// dieser Phase nichts ins Leere läuft, greift beim Lesen ein Rückfall auf das
// Volume. Abschaltbar über STORAGE_FALLBACK_LOCAL=0, sobald der Umzug durch ist.
function mitRueckfall(s3) {
  if (process.env.STORAGE_FALLBACK_LOCAL === '0') return s3;
  let lokal = null;
  const holeLokal = () => (lokal || (lokal = require('./localVolumeProvider').create()));
  return {
    ...s3,
    async get(key) {
      try {
        const buf = await s3.get(key);
        if (buf) return buf;
      } catch (e) {
        // Nicht gefunden ist der erwartete Fall während des Umzugs.
        if (!/not.?found|NoSuchKey|404/i.test(String(e.message))) throw e;
      }
      return holeLokal().get(key);
    },
    async exists(key) {
      if (await s3.exists(key).catch(() => false)) return true;
      return holeLokal().exists(key).catch(() => false);
    },
  };
}

function getStorage() {
  if (instance) return instance;
  const provider = (process.env.STORAGE_PROVIDER || 'local').toLowerCase();
  if (provider === 's3' || provider === 'r2') {
    instance = mitRueckfall(require('./s3Provider').create());
  } else {
    instance = require('./localVolumeProvider').create();
  }
  return instance;
}

// Für den Umzug: beide Provider direkt, unabhängig von STORAGE_PROVIDER.
function getProviderPaar() {
  return {
    lokal: require('./localVolumeProvider').create(),
    s3: require('./s3Provider').create(),
  };
}

module.exports = { getStorage, getProviderPaar };
