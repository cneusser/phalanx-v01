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
process.exit(fail ? 1 : 0);
