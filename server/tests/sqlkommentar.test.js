// ─────────────────────────────────────────────────────────────────────────────
// Kein Fragezeichen in einem SQL-Kommentar (v0.504)
//
// Anlass: In der Mandatsliste des Kontakts stand ein erklärender Kommentar,
// der auf ein Fragezeichen endete. Für Knex ist jedes Fragezeichen in einer
// Abfrage ein Platzhalter, auch eines hinter zwei Bindestrichen. Also vier
// Platzhalter bei drei Werten, Abbruch der Abfrage, und weil ein stummes
// `catch` darunter stand, kam eine leere Liste zurück: „Dieser Kontakt ist
// noch keinem Mandat zugeordnet."
//
// Der Fehler ist unsichtbar, solange man den Kommentar liest wie Prosa. Er
// taucht in keinem Lint auf, in keinem Typsystem, und die Abfrage sieht
// richtig aus. Deshalb diese Prüfung: Sie liest den Quelltext und nicht die
// Absicht.
//
// Geprüft werden Kommentarzeilen innerhalb von Zeichenketten, die nach SQL
// aussehen. Erlaubt bleibt ein Fragezeichen überall sonst.
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');

const WURZEL = path.join(__dirname, '..');
const ORDNER = ['routes', 'utils', 'db', 'scripts', 'sync', 'providers', 'middleware'];

let fail = 0;
const ok = (name, bedingung, zusatz = '') => {
  console.log(`${bedingung ? '✓' : '✗ FEHLER'} ${name}${zusatz ? `  [${zusatz}]` : ''}`);
  if (!bedingung) fail += 1;
};

function dateien(ordner) {
  const voll = path.join(WURZEL, ordner);
  if (!fs.existsSync(voll)) return [];
  return fs.readdirSync(voll, { withFileTypes: true }).flatMap((e) => {
    if (e.isDirectory()) return dateien(path.join(ordner, e.name));
    return e.name.endsWith('.js') ? [path.join(ordner, e.name)] : [];
  });
}

const treffer = [];
for (const rel of ORDNER.flatMap(dateien)) {
  const inhalt = fs.readFileSync(path.join(WURZEL, rel), 'utf8');
  // Zeichenketten in Backticks, die nach SQL aussehen.
  for (const m of inhalt.matchAll(/`([^`]*)`/g)) {
    const text = m[1];
    if (!/\b(SELECT|INSERT\s+INTO|UPDATE|DELETE\s+FROM)\b/i.test(text)) continue;
    if (!text.includes('?')) continue;
    text.split('\n').forEach((zeile) => {
      const kommentar = zeile.match(/--(.*)$/);
      if (kommentar && kommentar[1].includes('?')) {
        treffer.push(`${rel}: ${zeile.trim().slice(0, 90)}`);
      }
    });
  }
}

console.log('\n══ Fragezeichen in SQL-Kommentaren ══');
ok('keine Abfrage traegt ein Fragezeichen in einem Kommentar',
  treffer.length === 0, treffer.slice(0, 5).join(' | '));

console.log('\n══ Die Stelle, an der es passiert ist, ist entschaerft ══');
{
  const crm = fs.readFileSync(path.join(WURZEL, 'routes', 'crm.js'), 'utf8');
  ok('die Mandatsliste zaehlt die hinterlegten NDA-Dateien', /AS nda_dateien/.test(crm));
  ok('und ihr Fehler wird nicht mehr stumm verschluckt',
    /Mandatsliste fehlgeschlagen/.test(crm));
}

console.log(fail ? `\n${fail} Fehler` : '\nAlles grün');
process.exit(fail ? 1 : 0);
