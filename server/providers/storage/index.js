// ─────────────────────────────────────────────────────────────────────────────
// Sprint 8 — StorageProvider-Factory.
// Interface (alle Provider): put(key, buffer[, mime]) · get(key) → Buffer ·
//   delete(key) · exists(key) · list(prefix) → [{ key, size }].
// Auswahl über ENV STORAGE_PROVIDER = 'local' (Default) | 's3' (S3/R2-kompatibel).
// Umschaltbar ohne Codeänderung; Local ist das heutige Verhalten (Volume/Disk).
// ─────────────────────────────────────────────────────────────────────────────
let instance = null;

function getStorage() {
  if (instance) return instance;
  const provider = (process.env.STORAGE_PROVIDER || 'local').toLowerCase();
  if (provider === 's3' || provider === 'r2') {
    instance = require('./s3Provider').create();
  } else {
    instance = require('./localVolumeProvider').create();
  }
  return instance;
}

module.exports = { getStorage };
