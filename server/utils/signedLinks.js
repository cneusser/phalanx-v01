// ─────────────────────────────────────────────────────────────────────────────
// Sprint 4 — Signierte, ablaufende Datei-Links (HMAC-SHA256).
// Der Link trägt Dokument-ID, Nutzer-ID und Ablaufzeit; jede Manipulation
// invalidiert die Signatur. Standard-Gültigkeit: 15 Minuten.
// ─────────────────────────────────────────────────────────────────────────────
const crypto = require('crypto');

const SECRET = () => process.env.JWT_SECRET || 'phalanx-secret';
const DEFAULT_TTL_MS = 15 * 60 * 1000;

function sign(payload) {
  return crypto.createHmac('sha256', SECRET()).update(payload).digest('base64url');
}

/** Erzeugt einen signierten Token für einen Dokument-Download. */
function createDownloadToken({ docId, userId, ttlMs = DEFAULT_TTL_MS }) {
  const exp = Date.now() + ttlMs;
  const payload = `${docId}.${userId}.${exp}`;
  return `${Buffer.from(payload).toString('base64url')}.${sign(payload)}`;
}

/** Prüft Token; liefert { docId, userId } oder null (ungültig/abgelaufen). */
function verifyDownloadToken(token) {
  try {
    const [payloadB64, signature] = String(token).split('.');
    const payload = Buffer.from(payloadB64, 'base64url').toString();
    const expected = sign(payload);
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
    const [docId, userId, exp] = payload.split('.');
    if (Date.now() > parseInt(exp, 10)) return null; // abgelaufen
    return { docId: parseInt(docId, 10), userId: parseInt(userId, 10) };
  } catch {
    return null;
  }
}

module.exports = { createDownloadToken, verifyDownloadToken, DEFAULT_TTL_MS };
