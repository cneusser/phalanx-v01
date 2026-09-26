// ─────────────────────────────────────────────────────────────────────────────
// Vollständigkeit der Übersetzung (v0.411).
//
// Diese Prüfung läuft ohne Browser und ohne Datenbank und hält fest, was sonst
// nur auffällt, wenn ein englischer Besucher auf einer halb deutschen Seite
// steht: ein Schlüssel ohne englische Fassung, oder ein t() in einer Datei, die
// die Übersetzung gar nicht eingebunden hat. Letzteres ist kein Schönheits-
// fehler, sondern ein Absturz der Seite.
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');

let fail = 0;
const ok = (n, c) => { console.log((c ? '✓' : '✗ FEHLER') + ' ' + n); if (!c) fail++; };

const client = path.join(__dirname, '..', '..', 'client', 'src');

function dateien(verzeichnis, treffer = []) {
  for (const e of fs.readdirSync(verzeichnis, { withFileTypes: true })) {
    const p = path.join(verzeichnis, e.name);
    if (e.isDirectory()) dateien(p, treffer);
    else if (e.name.endsWith('.jsx') || e.name.endsWith('.js')) treffer.push(p);
  }
  return treffer;
}

const alle = dateien(client);
const i18n = fs.readFileSync(path.join(client, 'i18n', 'index.jsx'), 'utf8');
const vorhanden = new Set([...i18n.matchAll(/^\s*'([^']+)':/gm)].map((m) => m[1]));

// ── Jeder benutzte Schlüssel hat eine englische Fassung ─────────────────────
const benutzt = new Map();
for (const p of alle) {
  const s = fs.readFileSync(p, 'utf8');
  // Vor dem t darf kein Buchstabe und kein Punkt stehen, sonst trifft die
  // Suche auch set(, get( und ähnliche.
  for (const m of s.matchAll(/(?<![\w.])t\(\s*'([a-z][a-z0-9_]*\.[a-z0-9_.]+)'\s*,/g)) {
    benutzt.set(m[1], path.basename(p));
  }
}
const ohneEnglisch = [...benutzt.keys()].filter((k) => !vorhanden.has(k)).sort();
ok(`alle ${benutzt.size} benutzten Schlüssel haben eine englische Fassung`
  + (ohneEnglisch.length ? `  (es fehlen: ${ohneEnglisch.slice(0, 8).join(', ')})` : ''),
  ohneEnglisch.length === 0);

// ── Wer t() benutzt, muss es auch eingebunden haben ─────────────────────────
const ohneEinbindung = [];
for (const p of alle) {
  // Das Wörterbuch selbst definiert t und braucht keine Einbindung.
  if (p.includes(path.join('i18n', 'index.jsx'))) continue;
  const s = fs.readFileSync(p, 'utf8');
  if (!/(?<![\w.])t\(\s*'/.test(s)) continue;
  const hat = /useT\(\)|useI18n\(\)|const\s*\{\s*[^}]*\bt\b[^}]*\}\s*=/.test(s) || /\bt\s*[,)]/.test(s.split('\n')[0]);
  if (!hat) ohneEinbindung.push(path.basename(p));
}
ok(`jede Datei mit t() bindet die Übersetzung ein`
  + (ohneEinbindung.length ? `  (fehlt in: ${ohneEinbindung.join(', ')})` : ''),
  ohneEinbindung.length === 0);

// ── Die Texte der Startseite liegen in beiden Sprachen vor ──────────────────
const texte = fs.readFileSync(path.join(client, 'pages', 'landingTexte.js'), 'utf8');
ok('die Startseite führt einen deutschen und einen englischen Zweig',
  /^\s{2}de:\s*\{/m.test(texte) && /^\s{2}en:\s*\{/m.test(texte));

// Beide Zweige müssen dieselben Abschnitte haben, sonst fehlt in einer
// Sprache ein ganzer Block und die Seite bricht beim Aufbau ab.
const zweig = (name) => {
  const start = texte.indexOf(`\n  ${name}: {`);
  const ende = texte.indexOf('\n  },', start);
  return texte.slice(start, ende);
};
const abschnitte = (s) => [...s.matchAll(/^\s{4}(\w+):/gm)].map((m) => m[1]).sort();
const de = abschnitte(zweig('de'));
const en = abschnitte(zweig('en'));
ok(`beide Sprachen führen dieselben ${de.length} Abschnitte`
  + (JSON.stringify(de) === JSON.stringify(en) ? '' : `  (de: ${de}, en: ${en})`),
  de.length > 5 && JSON.stringify(de) === JSON.stringify(en));

// ── Die Palette ist umgestellt ──────────────────────────────────────────────
// Das Neon-Hellblau war der stärkste Grund, warum die Oberfläche nach
// Baukasten aussah. Es darf nur noch im Logo vorkommen.
const mitNeon = alle.filter((p) => !p.endsWith('CapitalMatchLogo.jsx')
  && /#29ABE2|#1A4D8A|#0D1B36/i.test(fs.readFileSync(p, 'utf8'))).map((p) => path.basename(p));
ok('die alte Palette kommt nur noch im Logo vor'
  + (mitNeon.length ? `  (noch in: ${mitNeon.slice(0, 6).join(', ')})` : ''),
  mitNeon.length === 0);

console.log(fail ? `\n${fail} Fehler` : '\nAlle Prüfungen bestanden');
process.exit(fail ? 1 : 0);
