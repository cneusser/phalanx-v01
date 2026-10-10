// ─────────────────────────────────────────────────────────────────────────────
// Kontakt zum Mandat: suchen statt aus einer Liste wählen (v0.453).
//
// Anlass: „Ohne Suchfunktion finde ich den richtigen Kontakt gar nicht."
// Beim Nachsehen kam ein zweites, ernsteres Problem heraus, nach dem niemand
// gefragt hatte: Die Liste holte /crm/contacts, und diese Abfrage endet auf
// LIMIT 500. Bei mehr Kontakten fehlten die übrigen im Auswahlfeld, ohne
// jeden Hinweis. Wer dort suchte, musste annehmen, es gebe den Kontakt nicht.
//
// Das ist dieselbe stille Lücke wie bei der Freitextsuche in v0.445: Die
// Oberfläche sagt nicht „weiss nicht", sondern „gibt es nicht". Deshalb wird
// jetzt auf dem Server gesucht und nicht im Browser gefiltert.
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');

let fail = 0;
const ok = (n, c) => { console.log((c ? '✓' : '✗ FEHLER') + ' ' + n); if (!c) fail++; };

const wurzel = path.join(__dirname, '..', '..');
const board = fs.readFileSync(path.join(wurzel, 'client', 'src', 'components', 'DealFunnelBoard.jsx'), 'utf8');
const crm = fs.readFileSync(path.join(wurzel, 'server', 'routes', 'crm.js'), 'utf8');

// ── Gesucht wird auf dem Server ────────────────────────────────────────────
ok('die Suche fragt den Server', /crm\/contacts\?q=\$\{encodeURIComponent\(q\)\}/.test(board));
ok('und nicht mehr die ganze Liste im Browser', !/allContacts/.test(board));
ok('ab drei Zeichen', /q\.length < 3/.test(board));
ok('vorher steht dort, wie viele noch fehlen', /Noch \{3 - suche\.trim\(\)\.length\} Zeichen/.test(board));
ok('getippt wird nicht bei jedem Anschlag gesucht', /setTimeout\([\s\S]{0,200}?, 250\)/.test(board));
ok('und eine überholte Suche wird abgeräumt', /clearTimeout\(uhr\)/.test(board));

// ── Die Trefferliste ───────────────────────────────────────────────────────
ok('ein Treffer zeigt Firma und Adresse', /\[k\.companies, k\.email\]/.test(board));
ok('wer schon im Mandat ist, wird als solcher gezeigt', /schon im Mandat/.test(board));
ok('und lässt sich nicht noch einmal wählen', /disabled=\{schonDabei\}/.test(board));
ok('bei vielen Treffern wird zum Eingrenzen aufgefordert', /weitere\. Bitte genauer eingrenzen/.test(board));
ok('kein Treffer erklärt, wonach gesucht wurde', /Vorname, Nachname, E-Mail, Telefon und Ort/.test(board));
ok('die Auswahl lässt sich aufheben', /Auswahl aufheben/.test(board));
ok('nach dem Hinzufügen ist das Feld wieder leer', /setGewaehlt\(null\); setSuche\(''\)/.test(board));

// ── Die Suche selbst ist die wortweise aus v0.445 ─────────────────────────
{
  const liste = crm.slice(crm.indexOf("router.get('/contacts'"), crm.indexOf("router.post('/contacts/:id/send-message'"));
  ok('die Kontaktliste sucht wortweise', /suchBedingung\(q, \['k\.last_name'/.test(liste));
  ok('"Bauer Daniel" trifft also dasselbe wie "Daniel Bauer"', /k\.first_name/.test(liste));
  // Die Begrenzung bleibt, sie ist jetzt nur nicht mehr gefaehrlich: Wer
  // sucht, grenzt ein, und die Oberflaeche sagt, wenn es mehr gibt.
  ok('die Abfrage bleibt begrenzt', /LIMIT 500/.test(liste));
}

process.exit(fail ? 1 : 0);
