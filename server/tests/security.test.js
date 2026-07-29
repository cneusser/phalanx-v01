// Prüft die reinen Sicherheits-Helfer aus Sprint 29:
// HTML-Escaping (Content-Injection) und die JWT-Schwäche-Erkennung.
const { escapeHtml } = require('../utils/escapeHtml');
const { isWeak } = require('../utils/jwtSecret');

let fail = 0;
const ok = (n, c) => { console.log((c ? '✓' : '✗ FAIL') + ' ' + n); if (!c) fail++; };

// ── escapeHtml ───────────────────────────────────────────────────────────────
ok('Skript-Tag wird entschärft', escapeHtml('<script>alert(1)</script>') === '&lt;script&gt;alert(1)&lt;/script&gt;');
ok('Anführungszeichen werden escaped', escapeHtml('a"b\'c') === 'a&quot;b&#39;c');
ok('Ampersand zuerst', escapeHtml('a & <b>') === 'a &amp; &lt;b&gt;');
ok('null wird zu leer', escapeHtml(null) === '');
ok('harmloser Text bleibt lesbar', escapeHtml('Müller GmbH, 5 Mio.') === 'Müller GmbH, 5 Mio.');

// ── JWT-Schwäche ─────────────────────────────────────────────────────────────
ok('leer ist schwach', isWeak('') === true);
ok('bekannter Beispielwert ist schwach', isWeak('phalanx-secret-key-change-in-production-2024') === true);
ok('kurzer Wert ist schwach', isWeak('abc123') === true);
ok('31 Zeichen sind schwach', isWeak('a'.repeat(31)) === true);
ok('32 Zeichen sind stark', isWeak('a'.repeat(32)) === false);
ok('langer Zufallswert ist stark', isWeak(require('crypto').randomBytes(48).toString('hex')) === false);

console.log(fail ? `\n${fail} FEHLER` : '\nAlle Tests grün');
process.exit(fail ? 1 : 0);
