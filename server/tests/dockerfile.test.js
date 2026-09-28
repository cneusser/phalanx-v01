// ─────────────────────────────────────────────────────────────────────────────
// Baut das auch im Container? (v0.422)
//
// Anlass: Der Build lief hier durch und brach bei Railway ab. Die Oberfläche
// bindet shared/taxonomie.json ein, das Dockerfile kopierte aber nur client/
// und server/. Auf dem eigenen Rechner liegt das ganze Verzeichnis da, im
// Container nur, was ausdrücklich hineinkopiert wurde. Ein Fehler, den man
// lokal nicht sehen kann, egal wie oft man baut.
//
// Diese Prüfung nimmt den Containerbau vorweg: Sie sucht jeden Import der
// Oberfläche, der aus client/ herausführt, und verlangt, dass das Dockerfile
// das betroffene Verzeichnis kopiert, und zwar vor dem Client-Build.
//
// Dazu die doppelten Übersetzungsschlüssel, die derselbe Lauf gemeldet hat.
// In JavaScript gewinnt der letzte, der frühere ist wirkungslos: Man ändert
// ihn und nichts passiert.
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');

let fail = 0;
const ok = (n, c) => { console.log((c ? '✓' : '✗ FEHLER') + ' ' + n); if (!c) fail++; };

const wurzel = path.join(__dirname, '..', '..');
const dockerfile = fs.readFileSync(path.join(wurzel, 'Dockerfile'), 'utf8');

function dateien(verzeichnis, treffer = []) {
  for (const e of fs.readdirSync(verzeichnis, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === 'dist') continue;
    const p = path.join(verzeichnis, e.name);
    if (e.isDirectory()) dateien(p, treffer);
    else if (/\.(jsx?|css|json)$/.test(e.name)) treffer.push(p);
  }
  return treffer;
}

// ── Welche Verzeichnisse ausserhalb von client/ braucht der Client-Build? ──
const clientWurzel = path.join(wurzel, 'client', 'src');
const gebraucht = new Map();   // Verzeichnis → Beispieldatei

for (const datei of dateien(clientWurzel)) {
  const inhalt = fs.readFileSync(datei, 'utf8');
  for (const m of inhalt.matchAll(/(?:from|import)\s*\(?\s*['"](\.\.[^'"]*)['"]/g)) {
    const ziel = path.resolve(path.dirname(datei), m[1]);
    if (ziel.startsWith(path.join(wurzel, 'client'))) continue;   // bleibt im Client
    const rel = path.relative(wurzel, ziel);
    const oberstes = rel.split(path.sep)[0];
    if (oberstes && !oberstes.startsWith('.')) {
      gebraucht.set(oberstes, path.relative(wurzel, datei));
    }
  }
}

ok(`die Oberfläche greift auf ${gebraucht.size} Verzeichnis(se) ausserhalb von client/ zu`
  + (gebraucht.size ? `: ${[...gebraucht.keys()].join(', ')}` : ''), true);

// ── Kopiert das Dockerfile sie, und rechtzeitig? ──────────────────────────
const zeilen = dockerfile.split('\n');
const clientBau = zeilen.findIndex((z) => /RUN .*client.*npm run build/.test(z));
ok('das Dockerfile baut den Client', clientBau > -1);

const fehlend = [];
const zuSpaet = [];
for (const [verzeichnis, beispiel] of gebraucht) {
  const kopie = zeilen.findIndex((z) => new RegExp(`^COPY\\s+${verzeichnis}/`).test(z.trim()));
  if (kopie === -1) fehlend.push(`${verzeichnis} (gebraucht von ${beispiel})`);
  else if (clientBau > -1 && kopie > clientBau) zuSpaet.push(verzeichnis);
}
ok('jedes davon wird im Dockerfile kopiert' + (fehlend.length ? `  (fehlt: ${fehlend.join(', ')})` : ''),
  fehlend.length === 0);
ok('und zwar vor dem Client-Build' + (zuSpaet.length ? `  (zu spät: ${zuSpaet.join(', ')})` : ''),
  zuSpaet.length === 0);

// Der Server liest dieselbe Datei, sein Verzeichnis muss also auch mit.
const serverNutztShared = fs.readFileSync(path.join(wurzel, 'server', 'utils', 'taxonomie.js'), 'utf8');
ok('der Server liest die gemeinsame Datei', /shared\/taxonomie\.json/.test(serverNutztShared));
ok('shared/ steht im Dockerfile', /^COPY\s+shared\//m.test(dockerfile));

// ── Was liest der Server zur Laufzeit ausserhalb von server/? ────────────
// Derselbe Fehler wie beim Client, eine Ebene tiefer: Die Versionsroute las
// die package.json im Wurzelverzeichnis, und die kopiert das Dockerfile nicht
// hinein. Der Commit stand da, die Version fehlte.
const serverDateien = dateien(path.join(wurzel, 'server'))
  .filter((d) => !d.includes(`${path.sep}tests${path.sep}`));   // Tests laufen nie im Container
const kopiert = (verzeichnis) => new RegExp(`^COPY\\s+${verzeichnis}/`, 'm').test(dockerfile);
const heikel = [];
for (const datei of serverDateien) {
  const inhalt = fs.readFileSync(datei, 'utf8');
  // Zwei Ebenen hoch ab server/<irgendwas>/ ist das Wurzelverzeichnis.
  for (const m of inhalt.matchAll(/__dirname,\s*'\.\.',\s*'\.\.',\s*'([^']+)'/g)) {
    const oberstes = m[1].replace(/^\.\//, '').split('/')[0];
    if (!oberstes.endsWith('.json') && !oberstes.endsWith('.js') && !kopiert(oberstes)) {
      heikel.push(`${path.relative(wurzel, datei)} liest ${m[1]}`);
    }
  }
}
ok('kein Serverzugriff auf ein Verzeichnis, das nicht im Image liegt'
  + (heikel.length ? `  (${heikel.join(', ')})` : ''), heikel.length === 0);

// ── Keine doppelten Übersetzungsschlüssel ─────────────────────────────────
const i18n = fs.readFileSync(path.join(clientWurzel, 'i18n', 'index.jsx'), 'utf8');
const gesehen = new Map();
const doppelt = [];
for (const m of i18n.matchAll(/^\s*'([a-z][a-z0-9_.]*)':/gm)) {
  if (gesehen.has(m[1])) doppelt.push(m[1]);
  else gesehen.set(m[1], true);
}
ok(`keine doppelten Schlüssel unter ${gesehen.size}` + (doppelt.length ? `  (${doppelt.join(', ')})` : ''),
  doppelt.length === 0);

// ── Der Server startet aus dem Dockerfile heraus ──────────────────────────
ok('das Dockerfile startet den Server', /CMD \[.*server\/index\.js.*\]/.test(dockerfile));
ok('server/ wird kopiert', /^COPY\s+server\//m.test(dockerfile));

process.exit(fail ? 1 : 0);
