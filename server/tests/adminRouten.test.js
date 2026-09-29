// ─────────────────────────────────────────────────────────────────────────────
// Rufen Oberfläche und Server dieselben Adressen auf?
//
// Anlass: Beim Einbauen der Berichte habe ich zweierlei falsch angeschlossen.
// Der API-Client packt die Hülle { success, data } schon aus, ich habe trotzdem
// noch einmal .data gelesen, und für ein INSERT mit neuer Kennung gibt es im
// Haus db.insert statt db.get mit RETURNING. Beides fällt im Build nicht auf,
// weil Vite nichts prüft, sondern erst beim Klick.
//
// Diese Prüfung fängt die erste Klasse: eine Adresse, die die Oberfläche ruft,
// die es auf dem Server aber nicht gibt.
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');

let fail = 0;
const ok = (n, c) => { console.log((c ? '✓' : '✗ FEHLER') + ' ' + n); if (!c) fail++; };

const wurzel = path.join(__dirname, '..', '..');
const routenDatei = (name) => fs.readFileSync(path.join(wurzel, 'server', 'routes', `${name}.js`), 'utf8');

// Alle Adressen, die der Server unter /admin anbietet.
function serverRouten(quelle) {
  const raus = new Set();
  for (const m of quelle.matchAll(/router\.(get|post|put|patch|delete)\(\s*'([^']+)'/g)) {
    raus.add(`${m[1].toUpperCase()} ${m[2]}`);
  }
  return raus;
}

// Eine Adresse vergleichbar machen.
//
// Zwei Stolpersteine, beide beim Bauen gelernt: In einem Ausdruck wie
// `${id ? '/' + id : ''}` stehen Anführungszeichen, an denen eine naive Suche
// abbricht. Und ein Ausdruck, der einen Pfadteil weglassen KANN, entspricht
// einem optionalen Parameter der Route. Beides wird zu einer Leerstelle, damit
// /berichte/klarnamen${…} und /berichte/klarnamen/:projectId? zusammenpassen.
const WEG = '\u0000';
const optionaleTeile = (q) => q.replace(/\$\{[^{}]*\?[^{}]*\}/g, WEG);
const eingesetzteWerte = (q) => q.replace(/\$\{[^{}]*\}/g, ':x');

const muster = (pfad) => pfad
  .replace(/:[A-Za-z_]+\?/g, WEG)
  .replace(/:[A-Za-z_]+/g, ':x')
  .replace(/\?.*$/, '')
  .split(WEG).join('')
  .replace(/\/$/, '');

const admin = routenDatei('admin');
const serverAdmin = new Set([...serverRouten(admin)].map((r) => {
  const [verb, pfad] = r.split(' ');
  return `${verb} ${muster(pfad)}`;
}));
ok(`der Server bietet ${serverAdmin.size} Adressen unter /admin an`, serverAdmin.size > 20);

const seite = fs.readFileSync(path.join(wurzel, 'client', 'src', 'pages', 'Admin.jsx'), 'utf8');
const bereinigt = eingesetzteWerte(optionaleTeile(seite));
const gerufen = new Set();
for (const m of bereinigt.matchAll(/api\.(get|post|put|patch|delete)\(\s*[`']\/admin([^`']*)[`']/g)) {
  gerufen.add(`${m[1].toUpperCase()} ${muster(m[2])}`);
}
ok(`die Oberfläche ruft ${gerufen.size} Adressen unter /admin`, gerufen.size > 5);

const fehlend = [...gerufen].filter((r) => !serverAdmin.has(r));
ok('jede gerufene Adresse gibt es auch auf dem Server'
  + (fehlend.length ? `  (fehlt: ${fehlend.join(', ')})` : ''), fehlend.length === 0);

// ── Die Berichte im Einzelnen ─────────────────────────────────────────────
for (const r of [
  'GET /berichte/suchprofile',
  'GET /berichte/datenraum/:x',
  'POST /berichte/datenraum/:x/anwenden',
  'GET /berichte/fehler',
  'GET /berichte/klarnamen',
]) {
  ok(`Route vorhanden: ${r}`, serverAdmin.has(r));
}

// Ein Bericht ohne Adminrecht gäbe Profildaten, Dokumentnamen und jetzt auch
// gefundene Personennamen preis.
const berichtsBlock = admin.slice(admin.indexOf("router.get('/berichte"),
  admin.indexOf("router.get('/valuation-leads'"));
const ohneSchutz = [...berichtsBlock.matchAll(/router\.\w+\('(\/berichte[^']*)',\s*([^,]+),/g)]
  .filter((m) => !/isAdmin/.test(m[2])).map((m) => m[1]);
ok('alle Berichtsrouten verlangen Adminrecht'
  + (ohneSchutz.length ? `  (ungeschützt: ${ohneSchutz.join(', ')})` : ''), ohneSchutz.length === 0);

// ── Die Hülle wird nur einmal ausgepackt ──────────────────────────────────
const doppelt = [...seite.matchAll(/const\s+(\w+)\s*=\s*await api\.(get|post|put)\([^)]*\);[\s\S]{0,80}?\1\.data\b/g)]
  .map((m) => m[0].split('\n')[0].trim());
ok('kein doppeltes Auspacken von .data' + (doppelt.length ? `  (${doppelt.join(' | ')})` : ''),
  doppelt.length === 0);

// ── Im Haus wird db.insert benutzt, nicht db.get mit RETURNING ────────────
const rueckgabe = [...admin.matchAll(/db\.get\(\s*`[^`]*INSERT[^`]*RETURNING/gi)];
ok('kein db.get für ein INSERT mit RETURNING', rueckgabe.length === 0);

process.exit(fail ? 1 : 0);
