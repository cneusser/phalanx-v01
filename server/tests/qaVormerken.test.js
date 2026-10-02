// ─────────────────────────────────────────────────────────────────────────────
// Zitieren, kopieren, für das Q&A vormerken (v0.443).
//
// Zwei Wünsche, ein gemeinsamer Kern: Was im Gespräch entsteht, soll sich
// weiterverwenden lassen, ohne es abzutippen.
//
// Die heikle Stelle ist das Veröffentlichen. Eine Frage im Wortlaut eines
// Interessenten kann Namen, Orte und Zahlen enthalten, und veröffentlicht sieht
// sie jeder freigegebene Interessent. Deshalb sind Vormerken und
// Veröffentlichen zwei getrennte Schritte, und dazwischen steht eine Prüfung
// auf Namen. Die Prüfung ändert nichts, sie meldet nur: Umschreibungen erkennt
// sie nicht, und eine Automatik, die Text stillschweigend verändert, wäre hier
// gefährlicher als keine.
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');

let fail = 0;
const ok = (n, c) => { console.log((c ? '✓' : '✗ FEHLER') + ' ' + n); if (!c) fail++; };

const wurzel = path.join(__dirname, '..', '..');
const routen = fs.readFileSync(path.join(wurzel, 'server', 'routes', 'messages.js'), 'utf8');
const seite = fs.readFileSync(path.join(wurzel, 'client', 'src', 'pages', 'Messages.jsx'), 'utf8');
const wanderung = fs.readFileSync(path.join(wurzel, 'server', 'db', 'migrations', '20260901001730_nachricht_fuer_qa_vormerken.js'), 'utf8');

// ── Die Wanderung ───────────────────────────────────────────────────────────
ok('die Spalten werden nur angelegt, wenn sie fehlen', /hasColumn\('messages', name\)/.test(wanderung));
ok('qa_thread_id haelt fest, was daraus wurde', /qa_thread_id/.test(wanderung));

// ── Vormerken ──────────────────────────────────────────────────────────────
const vor = routen.slice(routen.indexOf("'/:id/qa-vormerken'"), routen.indexOf("'/qa/vorgemerkt'"));
ok('nur Beteiligte duerfen vormerken', /sender_id, m\.recipient_id/.test(vor));
ok('das Vormerken laesst sich zuruecknehmen', /qa_markiert_am = NULL/.test(vor));
ok('und wird protokolliert', /QA_VORGEMERKT/.test(vor));

// ── Die Namenspruefung vor dem Veroeffentlichen ────────────────────────────
const pruef = routen.slice(routen.indexOf("'/qa/pruefen'"), routen.indexOf("'/:id/qa-veroeffentlichen'"));
ok('vor dem Veroeffentlichen wird auf Namen geprueft', /pruefeText/.test(pruef));
ok('Frage und Antwort werden beide geprueft', /feld: 'Frage'/.test(pruef) && /feld: 'Antwort'/.test(pruef));
ok('bekannte Namen des Mandats kommen aus dem Bestand', /crm_deal_parties/.test(pruef));
ok('die Pruefung aendert nichts am Text', !/UPDATE|replace\(/.test(pruef));

// ── Veroeffentlichen ───────────────────────────────────────────────────────
const ver = routen.slice(routen.indexOf("'/:id/qa-veroeffentlichen'"));
ok('nur fuer Mandate, die man pflegt', /darfMandat\(req, projectId\)/.test(ver.slice(0, 1600)));
ok('ohne Mandat geht nichts', /Bitte wählen Sie das Mandat/.test(ver.slice(0, 1600)));
ok('dieselbe Nachricht wird nicht zweimal veroeffentlicht', /bereits ein Q&A-Eintrag erstellt/.test(ver.slice(0, 2000)));
ok('der Fragesteller bleibt zugeordnet', /m\.sender_id/.test(ver.slice(0, 2600)));
ok('die Vormerkung wird danach geloescht', /qa_thread_id = \?, qa_markiert_am = NULL/.test(ver.slice(0, 2800)));
ok('und der Vorgang steht im Protokoll', /QA_AUS_NACHRICHT/.test(ver.slice(0, 3000)));

// ── Die Oberflaeche ────────────────────────────────────────────────────────
ok('jede Blase laesst sich zitieren', /setZitat\(m\)/.test(seite));
ok('und kopieren', /kopiere\(m\.body\)/.test(seite));
ok('das Zitat steht ueber dem Eingabefeld', /Antwort auf \{zitat\.sender_id/.test(seite));
ok('und geht als eingerueckter Block mit', /`> \$\{String\(zitat\.body/.test(seite));
ok('ein langes Zitat wird gekuerzt', /slice\(0, 220\)/.test(seite));
ok('Vormerken und Aufbereiten sind getrennt', /beginneQa/.test(seite) && /vormerken\(m,/.test(seite));
ok('die Oberflaeche sagt, was Veroeffentlichen bedeutet', /jeder\s*\n?\s*freigegebene Interessent/.test(seite));
ok('und nennt die Grenze der Namenspruefung', /Umschreibungen erkennt die Prüfung nicht/.test(seite));

process.exit(fail ? 1 : 0);
