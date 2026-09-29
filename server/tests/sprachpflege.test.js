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


// ── t() am Modulrand stürzt die ganze Anwendung ab ─────────────────────────
// Ein t('…') ausserhalb jeder Funktion läuft beim Laden des Moduls, also lange
// bevor es eine gewählte Sprache gibt. Die Folge ist kein falscher Text,
// sondern eine weisse Seite mit "t is not defined", und zwar auf jeder Seite,
// weil App.jsx alle Seiten fest einbindet.
//
// Die erste Fassung dieser Prüfung suchte nach Zeilenmustern und hat eine
// Tabelle übersehen, die über mehrere Zeilen ging. Deshalb zählt sie jetzt
// echte Klammertiefe: Tiefe 0 heisst, das läuft beim Laden.
function modulrandTreffer(quelle) {
  const treffer = [];
  let tiefe = 0, zeile = 1;
  for (let i = 0; i < quelle.length; i++) {
    const c = quelle[i];
    if (c === '\n') { zeile++; continue; }
    if (c === '/' && quelle[i + 1] === '/') { while (i < quelle.length && quelle[i] !== '\n') i++; zeile++; continue; }
    if (c === '/' && quelle[i + 1] === '*') {
      i += 2;
      while (i + 1 < quelle.length && !(quelle[i] === '*' && quelle[i + 1] === '/')) { if (quelle[i] === '\n') zeile++; i++; }
      i++; continue;
    }
    if (c === "'" || c === '"' || c === '`') {
      // Vor dem Überspringen prüfen: steht hier ein Aufruf auf Modulebene?
      i++;
      while (i < quelle.length && quelle[i] !== c) { if (quelle[i] === '\\') i++; else if (quelle[i] === '\n') zeile++; i++; }
      continue;
    }
    if (c === '{') { tiefe++; continue; }
    if (c === '}') { tiefe--; continue; }
    if (tiefe === 0 && /[a-z]/.test(c)) {
      const rest = quelle.slice(i, i + 24);
      const m = rest.match(/^(t|uebersetze)\('[a-z][a-z0-9_]*\./);
      const davor = i === 0 ? '' : quelle[i - 1];
      if (m && !/[\w.$]/.test(davor)) treffer.push(zeile);
    }
  }
  return treffer;
}

const amModulrand = [];
for (const p of alle) {
  if (p.includes(path.join('i18n', 'index.jsx'))) continue;
  for (const z of modulrandTreffer(fs.readFileSync(p, 'utf8'))) {
    amModulrand.push(`${path.basename(p)}:${z}`);
  }
}
ok(`kein t() ausserhalb einer Funktion`
  + (amModulrand.length ? `  (${amModulrand.join(', ')})` : ''),
  amModulrand.length === 0);


// ── Jede Komponente muss ihre Übersetzung selbst holen ────────────────────
// Die härteste Lektion dieser Reihe. Bis v0.424 prüfte diese Datei nur, ob
// eine DATEI die Übersetzung einbindet. Das genügt nicht: In Dashboard.jsx
// stand `const t = useT()` in der Hauptkomponente, die Unterkomponente
// DealCard daneben benutzte t() ohne eigenen Bezug. Eine Unterkomponente erbt
// nichts vom Elternteil.
//
// Der Ausfall war nicht zufällig verteilt: Er traf jeden Nutzer, der einen
// Deal hatte, und nur den. Wer keinen hatte, sah nie einen Fehler. Deshalb
// fiel es intern niemandem auf, und ein Interessent im FARADAY-Datenraum hing
// vier Tage auf einer Fehlerseite. Dasselbe in ProjectDetail: der Platzhalter
// für gesperrte Bereiche stürzte ab, also genau die Ansicht, die einem
// Interessenten OHNE Freigabe gezeigt wird.
function bloeckeVon(quelle) {
  const zeilen = quelle.split('\n');
  const raus = [];
  let tiefe = 0, start = null, name = null;
  zeilen.forEach((z, i) => {
    if (start === null) {
      const m = z.match(/^(?:export default |export )?(?:async )?function (\w+)/)
        || z.match(/^(?:export default |export )?const (\w+)\s*=\s*(?:\(|function|\w+\s*=>)/);
      if (m) { start = i; name = m[1]; tiefe = 0; }
    }
    if (start !== null) {
      tiefe += (z.match(/\{/g) || []).length - (z.match(/\}/g) || []).length;
      if (tiefe <= 0 && i > start) { raus.push({ name, a: start, b: i, zeilen }); start = null; }
    }
  });
  return raus;
}

const ohneBezug = [];
for (const p of alle) {
  if (p.includes(path.join('i18n', 'index.jsx'))) continue;
  const quelle = fs.readFileSync(p, 'utf8');
  for (const bl of bloeckeVon(quelle)) {
    const koerper = bl.zeilen.slice(bl.a, bl.b + 1).join('\n');
    if (!/(?<![\w.])t\('/.test(koerper)) continue;
    // Gültig ist: eigener Hook, t aus useI18n destrukturiert, oder t als
    // Parameter hereingereicht.
    const hatBezug = /useT\(\)/.test(koerper)
      || /=\s*useI18n\(\)/.test(koerper) && /\bt\b/.test(koerper.split('useI18n()')[0].split('\n').pop() || '')
      || /\{[^}]*\bt\b[^}]*\}\s*=\s*useI18n\(\)/.test(koerper)
      || new RegExp(`function ${bl.name}\\([^)]*\\bt\\b`).test(koerper)
      || /\(\{[^}]*\bt\b[^}]*\}\)/.test(bl.zeilen[bl.a]);
    if (!hatBezug) {
      const versatz = koerper.split('\n').findIndex((x) => /(?<![\w.])t\('/.test(x));
      ohneBezug.push(`${path.basename(p)}:${bl.a + 1 + versatz} (${bl.name})`);
    }
  }
}
ok('jede Komponente holt ihre Übersetzung selbst'
  + (ohneBezug.length ? `  (${ohneBezug.join(', ')})` : ''), ohneBezug.length === 0);

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
