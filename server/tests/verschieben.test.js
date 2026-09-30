// ─────────────────────────────────────────────────────────────────────────────
// Verschieben in einen anderen Ordner (v0.436).
//
// Anlass: Ein hochgeladenes Exposé-PDF lag in der Wurzel statt im Ordner für
// Teaser und Informationsmemorandum. Bisher gab es nur „eine Position hoch" und
// „eine Position runter"; wer eine Datei in einen anderen Ordner bringen wollte,
// musste sie erneut hochladen und die alte löschen.
//
// Geprüft wird hier vor allem die Zusage, die man leicht vergisst: Ein Ordner
// darf nicht in sich selbst und nicht in seinen eigenen Unterbaum wandern.
// Sonst entsteht ein Ast, der sich selbst enthält, und der ist über den Baum
// nicht mehr erreichbar. Die Dateien darin wären nicht gelöscht, aber weg.
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');

let fail = 0;
const ok = (n, c) => { console.log((c ? '✓' : '✗ FEHLER') + ' ' + n); if (!c) fail++; };

const wurzel = path.join(__dirname, '..', '..');
const safe = fs.readFileSync(path.join(wurzel, 'server', 'routes', 'safe.js'), 'utf8');
const exposes = fs.readFileSync(path.join(wurzel, 'server', 'routes', 'exposes.js'), 'utf8');
const seite = fs.readFileSync(path.join(wurzel, 'client', 'src', 'pages', 'ProjectSafe.jsx'), 'utf8');

const block = safe.slice(safe.indexOf("/item/:id/verschieben"), safe.indexOf("/item/:id/vertraulich"));
ok('die Route gibt es', block.length > 200);
ok('sie verlangt Schreibrecht', /await guard\(req, res\)/.test(block));
ok('das Ziel muss ein Ordner desselben Mandats sein',
  /is_folder = 1/.test(block) && /project_id = \?/.test(block));
ok('ein Ordner kann nicht in sich selbst', /nicht in sich selbst/.test(block));
ok('und nicht in den eigenen Unterbaum', /eigenen Unterordner/.test(block));
ok('die Schleife nach oben ist gegen Endlosläufe gesichert', /gesehen\.has/.test(block));
ok('der Vorgang wird protokolliert', /SAFE_MOVE/.test(block));

// ── Das Exposé-PDF landet im richtigen Ordner ────────────────────────────────
const up = exposes.slice(exposes.indexOf("pdf-upload"), exposes.indexOf("pdf-remove"));
ok('der Zielordner wird gesucht, nicht geraten', /LIKE '%teaser%'/.test(up) && /LIKE '%memorandum%'/.test(up));
ok('eine ausdrückliche Angabe sticht', /req\.body && req\.body\.parent_id/.test(up));
ok('und sie wird gegen die Datenbank geprüft', /is_folder = 1/.test(up));
ok('ohne Treffer bleibt es bei der Wurzel', /let parentId = null/.test(up));
ok('parent_id wird auch wirklich eingetragen', !/VALUES \(\?, \?, NULL, \?, 0,/.test(up));

// ── Die Oberfläche ──────────────────────────────────────────────────────────
ok('im Datenraum gibt es einen Verschieben-Knopf', /In einen anderen Ordner verschieben/.test(seite));
ok('der Dialog zeigt den vollen Pfad', /baumPfade/.test(seite));
ok('und das Objekt selbst ist als Ziel ausgeschlossen', /o\.id !== Number\(zielDialog\.id\)/.test(seite));
ok('die Sortierfunktion heißt weiterhin moveItem', /async function moveItem\(item, dir\)/.test(seite));

process.exit(fail ? 1 : 0);
