// ─────────────────────────────────────────────────────────────────────────────
// Eine Quelle für den JWT-Schlüssel. Er signiert Sessions UND Datei-/Share-Links.
// In Produktion ist ein schwacher oder fehlender Schlüssel ein kritisches Risiko,
// deshalb wird der Start dort abgebrochen (fail-closed). Notausgang: ALLOW_WEAK_JWT=1.
// ─────────────────────────────────────────────────────────────────────────────
const WEAK = new Set([
  'phalanx-secret',
  'phalanx-secret-key-change-in-production-2024',
]);

function isWeak(s) {
  return !s || WEAK.has(s) || String(s).length < 32;
}

// Wird beim Serverstart aufgerufen (index.js). Bricht in Produktion bei schwachem
// Schlüssel ab, sofern nicht ausdrücklich per ALLOW_WEAK_JWT=1 erlaubt.
function assertStrongOrExit() {
  const s = process.env.JWT_SECRET || '';
  if (!isWeak(s)) return;
  const msg = 'JWT_SECRET fehlt, ist ein bekannter Beispielwert oder kürzer als 32 Zeichen.';
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_WEAK_JWT !== '1') {
    console.error(`\n🔴 FATAL: ${msg}`);
    console.error('   Der Start wird abgebrochen, damit sich keine Tokens fälschen lassen.');
    console.error('   Bitte in Railway ein starkes JWT_SECRET setzen (>= 32 Zeichen).');
    console.error('   Erzeugen: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"');
    console.error('   Notausgang nur für den Übergang: ALLOW_WEAK_JWT=1\n');
    process.exit(1);
  }
  console.warn(`⚠️  ${msg} (nur außerhalb der Produktion toleriert)`);
}

function getJwtSecret() {
  const s = process.env.JWT_SECRET || '';
  if (!isWeak(s)) return s;
  // Nur außerhalb der Produktion erreichbar (in Produktion bricht der Start ab).
  return s || 'dev-only-insecure-secret-change-me';
}

module.exports = { getJwtSecret, assertStrongOrExit, isWeak };
