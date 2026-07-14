// ─────────────────────────────────────────────────────────────────────────────
// Sprint 13: 2-Faktor-Authentifizierung (TOTP nach RFC 6238).
//
// Bewusst ohne externe Bibliothek: HMAC-SHA1 kommt aus Node-crypto, Base32 sind
// 40 Zeilen. Kompatibel mit Google Authenticator, Microsoft Authenticator, 1Password,
// Authy: alles, was den otpauth://-Standard spricht.
//
// Sicherheitsentscheidungen:
//   · 30-Sekunden-Schritte, 6 Ziffern (Standard)
//   · ±1 Zeitfenster Toleranz (Uhrendrift), nicht mehr
//   · Backup-Codes werden nur als Hash gespeichert und beim Einlösen verbraucht
//   · Vergleich in konstanter Zeit (kein Timing-Leak)
// ─────────────────────────────────────────────────────────────────────────────
const crypto = require('crypto');

const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const STEP = 30;      // Sekunden je Zeitfenster
const DIGITS = 6;
const WINDOW = 1;     // ± ein Fenster Toleranz

function base32Encode(buf) {
  let bits = 0, value = 0, out = '';
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += B32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}

function base32Decode(str) {
  const clean = String(str || '').toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = 0, value = 0;
  const out = [];
  for (const ch of clean) {
    const idx = B32.indexOf(ch);
    if (idx < 0) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

// Neues Geheimnis (160 Bit: RFC-Empfehlung für HMAC-SHA1)
function generateSecret() {
  return base32Encode(crypto.randomBytes(20));
}

// HOTP für einen Zähler
function hotp(secret, counter) {
  const key = base32Decode(secret);
  const buf = Buffer.alloc(8);
  buf.writeUInt32BE(Math.floor(counter / 2 ** 32), 0);
  buf.writeUInt32BE(counter >>> 0, 4);
  const hmac = crypto.createHmac('sha1', key).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code = ((hmac[offset] & 0x7f) << 24 | (hmac[offset + 1] & 0xff) << 16
    | (hmac[offset + 2] & 0xff) << 8 | (hmac[offset + 3] & 0xff)) % 10 ** DIGITS;
  return String(code).padStart(DIGITS, '0');
}

function totp(secret, atMs = Date.now()) {
  return hotp(secret, Math.floor(atMs / 1000 / STEP));
}

// Zeitkonstanter Vergleich: verhindert, dass sich der Code über Laufzeit erraten lässt
function safeEqual(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

// Prüfung mit Drift-Toleranz (±1 Fenster = ±30 s)
function verify(secret, token, atMs = Date.now()) {
  const t = String(token || '').replace(/\s/g, '');
  if (!/^\d{6}$/.test(t) || !secret) return false;
  const counter = Math.floor(atMs / 1000 / STEP);
  for (let d = -WINDOW; d <= WINDOW; d++) {
    if (safeEqual(hotp(secret, counter + d), t)) return true;
  }
  return false;
}

// otpauth-URI für Authenticator-Apps (auf dem Handy direkt anklickbar)
function otpauthUrl(secret, { account, issuer = 'CapitalMatch' } = {}) {
  const label = encodeURIComponent(`${issuer}:${account}`);
  const q = new URLSearchParams({
    secret, issuer, algorithm: 'SHA1', digits: String(DIGITS), period: String(STEP),
  });
  return `otpauth://totp/${label}?${q.toString()}`;
}

// ── Backup-Codes ────────────────────────────────────────────────────────────
// Im Klartext genau einmal angezeigt, gespeichert wird nur der Hash.
function generateBackupCodes(count = 8) {
  const codes = [];
  for (let i = 0; i < count; i++) {
    const raw = crypto.randomBytes(5).toString('hex').toUpperCase(); // 10 Zeichen
    codes.push(`${raw.slice(0, 5)}-${raw.slice(5)}`);
  }
  return codes;
}

const hashCode = (code) => crypto.createHash('sha256')
  .update(String(code).toUpperCase().replace(/[^A-Z0-9]/g, '')).digest('hex');

function hashCodes(codes) { return codes.map(hashCode); }

// Einlösen: gibt die verbleibenden Hashes zurück (der benutzte Code fällt raus)
function consumeBackupCode(hashes, code) {
  const h = hashCode(code);
  const idx = (hashes || []).indexOf(h);
  if (idx < 0) return { ok: false, remaining: hashes || [] };
  const remaining = hashes.slice();
  remaining.splice(idx, 1);
  return { ok: true, remaining };
}

module.exports = {
  STEP, DIGITS, WINDOW,
  base32Encode, base32Decode, generateSecret, hotp, totp, verify, otpauthUrl,
  generateBackupCodes, hashCodes, consumeBackupCode, hashCode,
};
