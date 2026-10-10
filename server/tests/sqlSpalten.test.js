// ─────────────────────────────────────────────────────────────────────────────
// Spaltennamen gegen das Schema prüfen (v0.407).
//
// Anlass: Die Datenpflege zeigte „0 Firmen insgesamt", obwohl Hunderte da sind.
// Die Abfrage filterte auf crm_companies.is_deleted, eine Spalte, die es nicht
// gibt. Der Fehler wurde von einem catch verschluckt und kam als leere Liste
// zurück. Eine leere Liste sieht aus wie ein Ergebnis, ein Fehler nicht.
//
// Dieser Test liest die Spalten aus den Migrationen und prüft die Abfragen der
// neuen Module dagegen. Ohne Datenbank, deshalb auch im Sandkasten lauffähig.
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const migrationen = path.join(__dirname, '..', 'db', 'migrations');
const routen = path.join(__dirname, '..', 'routes');

let fail = 0;
const ok = (n, c) => { console.log((c ? '✓' : '✗ FEHLER') + ' ' + n); if (!c) fail++; };

const wurzel = path.join(__dirname, '..');
const dateien = fs.readdirSync(path.join(wurzel, 'db/migrations'))
  .filter((f) => f.endsWith('.js')).sort()
  .map((f) => fs.readFileSync(path.join(wurzel, 'db/migrations', f), 'utf8'));

/**
 * Welche Spalten hat eine Tabelle?
 *
 * Gelesen wird je Migrationsdatei, damit eine Spalte nicht versehentlich der
 * falschen Tabelle zugeschlagen wird:
 *   createTable/alterTable mit t.text('x'), t.integer('x'), t.increments('x')
 *   hasColumn('tabelle', 'x')
 *   ALTER TABLE tabelle ADD COLUMN x
 */
function spaltenVon(tabelle) {
  const namen = new Set(['id', 'created_at', 'updated_at']);
  for (const inhalt of dateien) {
    if (!inhalt.includes(`'${tabelle}'`)) continue;

    for (const b of inhalt.matchAll(
      new RegExp(`(?:createTable|alterTable)\\(\\s*'${tabelle}'[\\s\\S]*?\\n  \\}\\)`, 'g'))) {
      for (const m of b[0].matchAll(/t\.\w+\(\s*'([a-z0-9_]+)'/g)) namen.add(m[1]);
    }
    for (const m of inhalt.matchAll(
      new RegExp(`hasColumn\\(\\s*'${tabelle}',\\s*'([a-z0-9_]+)'`, 'g'))) namen.add(m[1]);
    // Hilfsfunktionen wie addCol('users', 'x', …) und Schleifen über mehrere
    // Tabellen mit hasColumn(table, 'x'). Beides kommt vor, und ohne das
    // fehlten Spalten, die es sehr wohl gibt.
    for (const m of inhalt.matchAll(
      new RegExp(`\\w+\\(\\s*'${tabelle}',\\s*'([a-z0-9_]+)'`, 'g'))) namen.add(m[1]);
    for (const m of inhalt.matchAll(/hasColumn\(\s*[a-z]\w*,\s*'([a-z0-9_]+)'/g)) namen.add(m[1]);
    for (const m of inhalt.matchAll(
      new RegExp(`ALTER TABLE ${tabelle} ADD COLUMN(?: IF NOT EXISTS)? ([a-z0-9_]+)`, 'gi'))) namen.add(m[1]);
  }
  return namen;
}

const firmenSpalten = spaltenVon('crm_companies');
const kontaktSpalten = spaltenVon('crm_contacts');

ok('crm_companies wurde im Schema gefunden', firmenSpalten.size > 10);
ok('crm_contacts wurde im Schema gefunden', kontaktSpalten.size > 10);
ok('crm_companies kennt sektor (Migration v0.405)', firmenSpalten.has('sektor'));
ok('crm_companies kennt schwerpunkt', firmenSpalten.has('schwerpunkt'));
ok('crm_companies kennt rollen_json', firmenSpalten.has('rollen_json'));

// Der eigentliche Punkt: Es gibt kein Loeschkennzeichen an diesen Tabellen.
ok('crm_companies hat kein is_deleted, darf also nicht danach gefiltert werden', !firmenSpalten.has('is_deleted'));
ok('crm_contacts hat kein is_deleted', !kontaktSpalten.has('is_deleted'));
ok('crm_contacts kennt stattdessen anonymized_at', kontaktSpalten.has('anonymized_at'));

// Die Module, die seit v0.405 auf diesen Tabellen arbeiten.
const geprueft = ['routes/stammdaten.js', 'utils/pflegeMailing.js', 'utils/vollstaendigkeit.js', 'routes/crm.js'];
for (const datei of geprueft) {
  const inhalt = fs.readFileSync(path.join(wurzel, datei), 'utf8');
  const treffer = [...inhalt.matchAll(/\b(?:c|k)\.is_deleted\b/g)];
  ok(`${datei} filtert nicht auf ein nicht vorhandenes is_deleted`, treffer.length === 0);
}

// Kein stilles catch um die beiden Abfragen, die die ganze Seite tragen.
const stamm = fs.readFileSync(path.join(wurzel, 'routes/stammdaten.js'), 'utf8');
const uebersicht = (stamm.match(/pflege\/uebersicht[\s\S]*?^\}\)\);/m) || [''])[0];
ok('die Uebersicht verschluckt keinen Datenbankfehler mehr',
  !/FROM crm_companies[\s\S]*?\.catch\(\(\) => \[\]\)/.test(uebersicht));

// Die Rolle der Ansprechperson steht mal am Kontakt, mal an der Verknuepfung.
const mail = fs.readFileSync(path.join(wurzel, 'utils/pflegeMailing.js'), 'utf8');
ok('die Uebersicht wertet beide Stellen der Rolle aus', /COALESCE\(cc\.position, k\.responsibility\)/.test(stamm));
ok('das Mailing wertet beide Stellen der Rolle aus', /COALESCE\(cc\.position, k\.responsibility\)/.test(mail));

console.log(fail ? `\n${fail} Fehler` : '\nAlle Prüfungen bestanden');

// ── Jede abgefragte Tabelle gibt es auch ──────────────────────────────────
// Beim Bau der Klarnamen-Prüfung habe ich drei Namen erfunden: `questions`
// statt `qa_threads`, dazu Spalten `projects.is_deleted` und
// `projects.seller_user_id`, die es nicht gibt. Weil die Abfragen in einem
// .catch hingen, kam ein leeres Ergebnis zurück, und leer sieht bei einer
// Prüfung auf Personendaten aus wie „alles sauber". Das ist die gefährlichste
// Art, falsch zu liegen.
const tabellen = new Set();
for (const datei of fs.readdirSync(migrationen)) {
  const inhalt = fs.readFileSync(path.join(migrationen, datei), 'utf8');
  for (const m of inhalt.matchAll(/createTable\('(\w+)'/g)) tabellen.add(m[1]);
}
ok(`${tabellen.size} Tabellen im Schema gefunden`, tabellen.size > 40);

const erfunden = [];
for (const datei of fs.readdirSync(routen).filter((f) => f.endsWith('.js'))) {
  // Kommentare raus: dort steht deutscher Fliesstext, und „Update erhalten"
  // ist kein SQL.
  const inhalt = fs.readFileSync(path.join(routen, datei), 'utf8')
    .replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
  const SCHLUESSELWORT = new Set(['select', 'values', 'set', 'where', 'on', 'as', 'lateral',
    'now', 'unnest', 'generate_series', 'information_schema', 'pg_catalog', 'only']);
  for (const m of inhalt.matchAll(/\b(?:FROM|JOIN|INTO|UPDATE)\s+([a-z_]{3,})\b/g)) {
    const t = m[1].toLowerCase();
    if (SCHLUESSELWORT.has(t)) continue;
    if (!tabellen.has(t)) erfunden.push(`${datei}: ${m[0].trim()}`);
  }
}
ok('keine Abfrage auf eine Tabelle, die es nicht gibt'
  + (erfunden.length ? `\n     ${[...new Set(erfunden)].slice(0, 8).join('\n     ')}` : ''),
  erfunden.length === 0);

// ── Und jede abgefragte Spalte von users auch (v0.458) ───────────────────
//
// Anlass: `users.last_login` wurde an vier Stellen gelesen und war nie
// angelegt worden. Postgres antwortete mit „column last_login does not
// exist", und weil überall ein catch stand, wurde daraus dreierlei: „kein
// Plattform-Konto" in der Kontaktakte, eine leere Personenliste in „Ansicht
// prüfen" und eine leere Spalte im Konten-Bericht. Drei Symptome, eine
// Ursache, und keines davon sah nach einem Fehler aus.
//
// Geprüft wird die Tabelle users, weil an ihr fast jede Ansicht hängt.
{
  const userSpalten = spaltenVon('users');
  ok('users wurde im Schema gefunden', userSpalten.size > 15);
  ok('users kennt last_login (Migration v0.458)', userSpalten.has('last_login'));

  const quellen = [];
  for (const ordner of ['routes', 'utils', 'sync']) {
    const p = path.join(wurzel, ordner);
    if (!fs.existsSync(p)) continue;
    for (const f of fs.readdirSync(p).filter((x) => x.endsWith('.js'))) quellen.push(path.join(p, f));
  }

  const unbekannt = [];
  for (const datei of quellen) {
    const inhalt = fs.readFileSync(datei, 'utf8')
      .replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');

    // a) SELECT <liste> FROM users. Die Liste wird vom FROM aus rückwärts bis
    // zum nächsten SELECT gelesen. Vorwärts gesucht erwischte man die Liste
    // einer äusseren Abfrage und hielt deren Spalten für Spalten von users.
    for (const m of inhalt.matchAll(/\bFROM\s+users\b/gi)) {
      const davor = inhalt.slice(0, m.index);
      // Nicht über toUpperCase suchen: Ein „ß" wird dabei zu „SS", und alle
      // Stellen danach verschieben sich um ein Zeichen. Das ergab Spalten wie
      // „ole" statt „role", also erfundene Fehler, und ein Test, der sich
      // selbst widerlegt, ist schlimmer als keiner.
      let start = -1;
      for (const s of davor.matchAll(/\bSELECT\b/gi)) start = s.index + s[0].length;
      if (start < 0) continue;
      const liste = davor.slice(start);
      // Liegt dazwischen noch ein FROM, gehört die Liste nicht zu users.
      if (/\bFROM\b/i.test(liste)) continue;
      for (const roh of liste.split(',')) {
        const teil = roh.trim();
        // Funktionen, Sternchen, Unterabfragen und Aliase überspringen: Hier
        // geht es um die einfachen Fälle, und die sind es, die durchrutschen.
        if (!/^[a-z_][a-z0-9_]*$/i.test(teil)) continue;
        if (!userSpalten.has(teil.toLowerCase())) unbekannt.push(`${path.basename(datei)}: users.${teil}`);
      }
    }
    // b) UPDATE users SET <spalte> =
    for (const m of inhalt.matchAll(/UPDATE\s+users\s+(?:\w+\s+)?SET\s+([a-z_][a-z0-9_]*)\s*=/gi)) {
      if (!userSpalten.has(m[1].toLowerCase())) unbekannt.push(`${path.basename(datei)}: UPDATE users.${m[1]}`);
    }
  }
  ok('keine Abfrage auf eine Spalte von users, die es nicht gibt'
    + (unbekannt.length ? `\n     ${[...new Set(unbekannt)].slice(0, 10).join('\n     ')}` : ''),
    unbekannt.length === 0);
}

process.exit(fail ? 1 : 0);
