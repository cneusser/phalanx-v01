// ─────────────────────────────────────────────────────────────────────────────
// Wer darf das Q&A sehen? (v0.442)
//
// Drei Fragen standen im Raum, und alle drei hatten eine Antwort im Code:
//
//   1. „Warum sehe ich als Admin nichts?" Weil die Mandatsseite die Fragen nur
//      im Zweig für Interessenten lud, und dort erst ab freigegebenem
//      Datenraum. Für Verwaltende wurden sie nie geholt. Im Verwaltungsbereich
//      standen dieselben Fragen, deshalb sah es nach einem Rechteproblem aus.
//   2. „Nur sichtbar nach NDA." Das Gate stand auf dataroom_granted, also eine
//      Stufe zu hoch, und die Leseroute hatte überhaupt keines.
//   3. „Geht die Antwort an den Frager?" Ja, seit jeher per E-Mail, und seit
//      v0.437 auf dem Weg über das Nachrichtenfenster als Nachricht.
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const { stageAllows } = require('../utils/dealStateMachine');

let fail = 0;
const ok = (n, c) => { console.log((c ? '✓' : '✗ FEHLER') + ' ' + n); if (!c) fail++; };

const wurzel = path.join(__dirname, '..', '..');
const projekte = fs.readFileSync(path.join(wurzel, 'server', 'routes', 'projects.js'), 'utf8');
const admin = fs.readFileSync(path.join(wurzel, 'server', 'routes', 'admin.js'), 'utf8');
const seite = fs.readFileSync(path.join(wurzel, 'client', 'src', 'pages', 'ProjectDetail.jsx'), 'utf8');

// ── Das Gate liegt beim NDA ─────────────────────────────────────────────────
ok('ohne Stufe kein Q&A', stageAllows(null, 'qa') === false);
ok('angefragt genügt nicht', stageAllows('requested', 'qa') === false);
ok('ab unterschriebenem NDA ja', stageAllows('nda_signed', 'qa') === true);
ok('mit Datenraum erst recht', stageAllows('dataroom_granted', 'qa') === true);
ok('und in der Absichtserklärung auch', stageAllows('loi', 'qa') === true);

// Das IM bleibt an derselben Stufe wie bisher: Q&A zu lockern heisst nicht,
// die Unterlagen zu lockern.
ok('das IM hängt weiterhin am NDA', stageAllows('nda_signed', 'im') === true);
ok('der Datenraum weiterhin an der Freigabe', stageAllows('nda_signed', 'dataroom') === false);

// ── Die Leseroute prüft es auch ─────────────────────────────────────────────
const lese = projekte.slice(projekte.indexOf("router.get('/:id/questions'"), projekte.indexOf("router.get('/:id'", projekte.indexOf("router.get('/:id/questions'")));
ok('die Leseroute kennt ein Gate', /stageAllows\(stage, 'qa'\)/.test(lese));
ok('Pflegende sind davon ausgenommen', /canManageProject\(req\.user, req\.params\.id\)/.test(lese));
ok('und die Absage erklärt sich', /Vertraulichkeitsvereinbarung unterschrieben/.test(lese));

// ── Die Mandatsseite lädt die Fragen für Verwaltende ────────────────────────
const adminZweig = seite.slice(seite.indexOf('if (isAdmin) {'), seite.indexOf('const ndaData'));
ok('der Verwaltungszweig lädt die Fragen', /questions/.test(adminZweig));
ok('Interessenten ab unterschriebenem NDA', /\['signed', 'approved'\]\.includes\(ndaData\.status\)/.test(seite));
ok('ohne NDA steht dort der Grund statt eines Eingabefelds', /const darfFragen = isAdmin/.test(seite));

// ── Die Antwort erreicht den Fragesteller ───────────────────────────────────
const antwort = admin.slice(admin.indexOf("router.put('/questions/:id/answer'"), admin.indexOf("router.put('/questions/:id/answer'") + 2500);
ok('die Antwort geht standardmäßig hinaus', /notify = req\.body\.notify !== false/.test(antwort));
ok('an die Adresse des Fragestellers', /SELECT email, first_name FROM users WHERE id = \?/.test(antwort));
ok('und es wird protokolliert, ob sie zugestellt wurde', /per E-Mail zugestellt/.test(antwort));

process.exit(fail ? 1 : 0);
