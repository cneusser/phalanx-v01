// ─────────────────────────────────────────────────────────────────────────────
// Stimmt die Versionsangabe, die wir anzeigen?
//
// Eine Versionsanzeige, die nicht mitwächst, ist schlimmer als keine: Man
// glaubt ihr und sucht den Fehler an der falschen Stelle. Deshalb prüft dieser
// Lauf, dass package.json und der jüngste Changelog-Eintrag dieselbe Fassung
// nennen, und dass die Anzeige überhaupt eingehängt ist.
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');

let fail = 0;
const ok = (n, c) => { console.log((c ? '✓' : '✗ FEHLER') + ' ' + n); if (!c) fail++; };

const wurzel = path.join(__dirname, '..', '..');
const lies = (...t) => fs.readFileSync(path.join(wurzel, ...t), 'utf8');

// ── Eine Quelle für die Version ───────────────────────────────────────────
const paket = JSON.parse(lies('package.json'));
const clientPaket = JSON.parse(lies('client', 'package.json'));
ok('package.json nennt eine Version', /^\d+\.\d+\.\d+$/.test(paket.version || ''));
ok('Server und Oberfläche führen dieselbe Version', paket.version === clientPaket.version);

// ── Sie passt zum jüngsten Changelog-Eintrag ──────────────────────────────
const migrationen = fs.readdirSync(path.join(wurzel, 'server', 'db', 'migrations'))
  .filter((f) => /changelog_v\d+/.test(f)).sort();
ok('es gibt Changelog-Migrationen', migrationen.length > 0);

const nummerAus = (datei) => Number((datei.match(/changelog_v(\d+)/) || [])[1]);
const juengste = migrationen[migrationen.length - 1];
const clVersion = (lies('server', 'db', 'migrations', juengste).match(/version: 'v([\d.]+)'/) || [])[1];
// „0.421.0" in package.json entspricht „v0.421" im Changelog.
const ausPaket = String(paket.version).replace(/\.0$/, '');
ok(`package.json (${ausPaket}) passt zum jüngsten Changelog (${clVersion}) in ${juengste}`,
  ausPaket === clVersion);

// Die Migrationen müssen aufsteigend nummeriert sein, sonst laufen sie in
// falscher Reihenfolge und der Changelog steht durcheinander.
const nummern = migrationen.map(nummerAus);
ok('Changelog-Migrationen sind aufsteigend',
  nummern.every((n, i) => i === 0 || n > nummern[i - 1]));

// ── Die Anzeige ist wirklich eingehängt ───────────────────────────────────
const app = lies('client', 'src', 'App.jsx');
ok('die Fassungsanzeige steht im Fuß', /<Fassung\b/.test(app));
ok('die Changelog-Seite ist als Route eingetragen', /path="\/changelog"/.test(app));

const vite = lies('client', 'vite.config.js');
ok('Vite setzt die Version in das Bundle', /__APP_VERSION__/.test(vite));
ok('Vite setzt den Bauzeitpunkt', /__BUILD_TIME__/.test(vite));
ok('Vite liest die Version aus package.json, nicht fest verdrahtet',
  /readFileSync\([^)]*package\.json/.test(vite) && !/__APP_VERSION__: JSON\.stringify\(['"]\d/.test(vite));

const index = lies('server', 'index.js');
ok('die Versions-Route ist eingebunden', /routes\/version/.test(index));

// ── Die Route selbst ──────────────────────────────────────────────────────
const route = lies('server', 'routes', 'version.js');
ok('die Route liest die Version aus package.json', /package\.json/.test(route));
ok('sie nennt den Commit, wenn Railway ihn setzt', /RAILWAY_GIT_COMMIT_SHA/.test(route));
ok('sie gibt kein Geheimnis preis',
  !/SECRET|PASSWORD|TOKEN|DATABASE_URL/i.test(route.replace(/\/\/.*|\/\*[\s\S]*?\*\//g, '')));

// ── Die Anzeige vergleicht Browser und Server ─────────────────────────────
const fassung = lies('client', 'src', 'components', 'Fassung.jsx');
ok('sie vergleicht die geladene mit der ausgelieferten Fassung',
  /server\.version !== GELADEN/.test(fassung));
ok('sie bietet ein Neuladen an', /location\.reload/.test(fassung));

process.exit(fail ? 1 : 0);
