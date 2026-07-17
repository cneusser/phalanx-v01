// Prüft den Excel/CSV-Import-Parser an einer Investoren-Rechercheliste.
const { detectHeaderRow, guessMapping, buildContacts } = require('../utils/contactImport');

let fail = 0;
const ok = (n, c) => { console.log((c ? '✓' : '✗ FEHLER') + ' ' + n); if (!c) fail++; };

// Wie die echte Datei: zwei Titelzeilen, dann die Kopfzeile
const rows = [
  ['Kapitalgeber-Priorität', '', '', '', '', '', '', '', ''],
  ['Priorisierung: Eignung', '', '', '', '', '', '', '', ''],
  ['Rang', 'Investor', 'Ort', 'Fit', 'Kontakt-E-Mail', 'Einreichung', 'Deals', 'Begründung / Fokus', 'Quelle'],
  [1, 'UVC Partners', 'Garching', 'Sehr hoch', 'pitch@uvcpartners.com', '', 3, 'B2B/DeepTech', 'uvcpartners.com'],
  [2, 'HTGF', 'Bonn', 'Sehr hoch', 'info@htgf.de', 'Upload', 11, 'Deep Tech', 'htgf.de'],
  ['', '', '', '', '', '', '', '', ''],
];

const h = detectHeaderRow(rows);
ok('Kopfzeile korrekt erkannt (Index 2)', h === 2);

const map = guessMapping(rows[h]);
ok('E-Mail-Spalte gefunden', map.email === 4);
ok('Investor als Firma erkannt', map.company === 1);
ok('Ort erkannt', map.location === 2);
ok('Begründung als Notiz erkannt', map.notes === 7);
ok('Quelle erkannt', map.source === 8);

const c = buildContacts(rows, h, map);
ok('zwei Kontakte gebaut (leere Zeile ignoriert)', c.length === 2);
ok('Fonds ohne Person: Firma dient als Nachname', c[0].last_name === 'UVC Partners' && c[0].company === 'UVC Partners');
ok('E-Mail übernommen und kleingeschrieben', c[0].email === 'pitch@uvcpartners.com');
ok('Ort übernommen', c[0].location === 'Garching');
ok('Notiz übernommen', /DeepTech/.test(c[0].notes));

// Personenliste mit getrennten Namensspalten
const p = [
  ['Vorname', 'Nachname', 'E-Mail', 'Firma', 'Position'],
  ['Anna', 'Berg', 'A.Berg@x.de', 'Berg AG', 'CFO'],
];
const pm = guessMapping(p[0]);
const pc = buildContacts(p, 0, pm);
ok('getrennte Vor-/Nachnamen', pc[0].first_name === 'Anna' && pc[0].last_name === 'Berg');
ok('E-Mail normalisiert', pc[0].email === 'a.berg@x.de');
ok('Position erkannt', pc[0].position === 'CFO');

console.log(fail ? `\n${fail} FEHLER` : '\nAlle Tests grün');
process.exit(fail ? 1 : 0);
