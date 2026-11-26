// ─────────────────────────────────────────────────────────────────────────────
// Härtung v0.507: Webhook-Geheimnis, Trefferausschnitt, stabile Meldefunktion,
// keine Google-Schriften, kein Build-Ergebnis im Repository.
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');

let fail = 0;
const ok = (n, c) => { console.log((c ? '✓' : '✗ FEHLER') + ' ' + n); if (!c) fail++; };
const wurzel = path.join(__dirname, '..', '..');
const lies = (...p) => fs.readFileSync(path.join(wurzel, ...p), 'utf8');

const { geheimnisOk, gegebenesGeheimnis } = require('../utils/inboundGeheimnis');
const anfrage = ({ kopf = {}, query = {} } = {}) => ({
  get: (n) => kopf[String(n).toLowerCase()],
  query,
});
const env = { INBOUND_SECRET: 'geheim-123' };
const basic = (u, p) => `Basic ${Buffer.from(`${u}:${p}`).toString('base64')}`;

console.log('\n── Webhook-Geheimnis ──');
ok('ohne INBOUND_SECRET bleibt alles zu', !geheimnisOk(anfrage({ kopf: { 'x-inbound-secret': 'x' } }), {}));
ok('Kopfzeile richtig', geheimnisOk(anfrage({ kopf: { 'x-inbound-secret': 'geheim-123' } }), env));
ok('Kopfzeile falsch', !geheimnisOk(anfrage({ kopf: { 'x-inbound-secret': 'geheim-124' } }), env));
ok('Basic Auth richtig', geheimnisOk(anfrage({ kopf: { authorization: basic('inbound', 'geheim-123') } }), env));
ok('Basic Auth falsch', !geheimnisOk(anfrage({ kopf: { authorization: basic('inbound', 'nein') } }), env));
ok('Basic Auth mit Doppelpunkt im Geheimnis', geheimnisOk(anfrage({ kopf: { authorization: basic('inbound', 'a:b') } }), { INBOUND_SECRET: 'a:b' }));
ok('Adresszeile gilt übergangsweise', geheimnisOk(anfrage({ query: { secret: 'geheim-123' } }), env));
ok('Adresszeile abschaltbar', !geheimnisOk(anfrage({ query: { secret: 'geheim-123' } }), { ...env, INBOUND_SECRET_IN_ADRESSE: '0' }));
ok('Kopfzeile hat Vorrang vor Adresszeile', gegebenesGeheimnis(anfrage({ kopf: { 'x-inbound-secret': 'k' }, query: { secret: 'q' } })).quelle === 'kopfzeile');
ok('nichts angegeben, nichts erlaubt', !geheimnisOk(anfrage(), env));
ok('Route nutzt die neue Prüfung', /require\('\.\.\/utils\/inboundGeheimnis'\)/.test(lies('server', 'routes', 'inbound.js')));
ok('Route liest die Adresszeile nicht mehr selbst', !/req\.query\.secret/.test(lies('server', 'routes', 'inbound.js')));

console.log('\n── Trefferausschnitt ──');
const safe = lies('client', 'src', 'components', 'SafeDataRoom.jsx');
ok('Datenraum-Suche ohne dangerouslySetInnerHTML', !/dangerouslySetInnerHTML/.test(safe));
ok('Datenraum-Suche nutzt trefferAusschnitt', /trefferAusschnitt\(t\.snippet/.test(safe));
ok('Browser nutzt dieselbe Funktion', /trefferAusschnitt\(/.test(lies('client', 'src', 'components', 'DataRoomBrowser.jsx')));
const util = lies('client', 'src', 'utils', 'trefferAusschnitt.jsx');
ok('Hilfsfunktion baut nur Textknoten', !/innerHTML/.test(util) && /<mark/.test(util));

console.log('\n── Stabile Meldefunktion ──');
ok('CRM: show mit useCallback', /const show = useCallback\(/.test(lies('client', 'src', 'pages', 'Crm.jsx')));
ok('Funnel: show mit useCallback', /const show = useCallback\(/.test(lies('client', 'src', 'pages', 'Funnel.jsx')));
ok('Admin: showMsg mit useCallback', /const showMsg = useCallback\(/.test(lies('client', 'src', 'pages', 'Admin.jsx')));

console.log('\n── Schriften und Repository ──');
const html = lies('client', 'index.html');
ok('keine Google-Schriften', !/fonts\.(googleapis|gstatic)\.com/.test(html));
const ignore = lies('.gitignore');
ok('client/dist in .gitignore', /^client\/dist\/$/m.test(ignore));
ok('Vite-Zwischendateien in .gitignore', /\*\.timestamp-\*\.mjs/.test(ignore));

if (fail) { console.log(`\n${fail} Fehler`); process.exit(1); }
console.log('\nAlle Prüfungen bestanden.');
