// ─────────────────────────────────────────────────────────────────────────────
// Q&A im Nachrichtenfenster und Verweise auf Dokumente (v0.437).
//
// Zwei Zusagen stehen hier im Mittelpunkt, weil beide teuer wären, wenn sie
// brechen:
//
//   1. Ein Berater darf nur Fragen zu Mandaten sehen und beantworten, die er
//      pflegt. Ohne diese Prüfung läge die Frage eines Interessenten samt Namen
//      in fremden Gesprächen.
//   2. Ein Verweis auf ein Dokument ist keine Freigabe. Die Pfad-Route
//      unterliegt denselben Grenzen wie der Datenraum, und schon der Name einer
//      Datei bleibt verdeckt, wenn sie nicht freigegeben ist.
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');

let fail = 0;
const ok = (n, c) => { console.log((c ? '✓' : '✗ FEHLER') + ' ' + n); if (!c) fail++; };

const wurzel = path.join(__dirname, '..', '..');
const nachrichten = fs.readFileSync(path.join(wurzel, 'server', 'routes', 'messages.js'), 'utf8');
const safe = fs.readFileSync(path.join(wurzel, 'server', 'routes', 'safe.js'), 'utf8');
const seite = fs.readFileSync(path.join(wurzel, 'client', 'src', 'pages', 'Messages.jsx'), 'utf8');
const raum = fs.readFileSync(path.join(wurzel, 'client', 'src', 'components', 'SafeDataRoom.jsx'), 'utf8');
const detail = fs.readFileSync(path.join(wurzel, 'client', 'src', 'pages', 'ProjectDetail.jsx'), 'utf8');

// ── Rechte ──────────────────────────────────────────────────────────────────
const offen = nachrichten.slice(nachrichten.indexOf("'/qa/offen/:userId'"), nachrichten.indexOf("'/qa/:id/antwort'"));
ok('offene Fragen werden je Mandat auf Pflegerechte geprüft', /darfMandat\(req, r\.project_id\)/.test(offen));
ok('das Ergebnis je Mandat wird nur einmal ermittelt', /geprueft\.has/.test(offen));
ok('nur offene Fragen', /status = 'open'/.test(offen));

const antwort = nachrichten.slice(nachrichten.indexOf("'/qa/:id/antwort'"), nachrichten.indexOf("'/qa/dokumente/:projectId'"));
ok('das Beantworten verlangt Pflegerechte', /darfMandat\(req, frage\.project_id\)/.test(antwort));
ok('die Nachricht wird vor dem Q&A-Eintrag geschrieben',
  antwort.indexOf('INSERT INTO messages') < antwort.indexOf('UPDATE qa_threads'));
ok('die Frage wird als beantwortet geführt', /status = 'answered'/.test(antwort));
ok('mit Zeitpunkt und Urheber', /answered_at = now\(\)/.test(antwort) && /answered_by = \?/.test(antwort));
ok('das Zustellfenster gilt auch hier', /zustellung_ab/.test(antwort) && /fensterMinuten\(\)/.test(antwort));
ok('beides wird protokolliert', /QA_ANSWERED/.test(antwort) && /MESSAGE_SENT/.test(antwort));

const dok = nachrichten.slice(nachrichten.indexOf("'/qa/dokumente/:projectId'"));
ok('die Dokumentliste verlangt Pflegerechte', /darfMandat\(req, projectId\)/.test(dok.slice(0, 900)));

// ── Der Weg zum Dokument ────────────────────────────────────────────────────
const pfad = safe.slice(safe.indexOf("/item/:id/pfad"), safe.indexOf("In einen anderen Ordner verschieben"));
ok('die Pfad-Route gilt den Leserechten des Datenraums', /guardRead\(req, res\)/.test(pfad));
ok('ein nicht freigegebenes Dokument wird nicht genannt', /darfObjekt\(req, item\.id, 'view'\)/.test(pfad));
ok('und die Absage erklärt sich', /nicht freigegeben/.test(pfad));
ok('auch gesperrte Ordner oberhalb brechen die Kette ab', /darfObjekt\(req, oben\.id, 'view'\)/.test(pfad));
ok('die Schleife nach oben ist gegen Endlosläufe gesichert', /gesehen\.has/.test(pfad));
ok('der Aufruf steht im Zugriffsprotokoll', /logSafeAccess\(req, projectId, item\.id, 'view'\)/.test(pfad));

// ── Oberfläche ──────────────────────────────────────────────────────────────
ok('offene Fragen erscheinen im Gespräch', /offene Fragen aus dem Q&A/.test(seite));
ok('die Antwort läuft über die Q&A-Route', /messages\/qa\/\$\{antwortAuf\.id\}\/antwort/.test(seite));
ok('auch das Tastenkürzel antwortet auf die Frage', /if \(antwortAuf\) beantworte\(\); else send\(\)/.test(seite));
ok('der Verweis zeigt auf den Datenraum', /projekte\/\$\{dokWahl\.projectId\}\?dok=/.test(seite));
ok('und die Oberfläche sagt, dass ein Verweis keine Freigabe ist', /keine Freigabe/.test(seite));
ok('der Datenraum hebt das verwiesene Dokument hervor', /safe-zeile-/.test(raum) && /setHervor/.test(raum));
ok('ohne Freigabe steht dort der Grund', /verweisFehler/.test(raum));
ok('der Verweis öffnet den Dokumente-Tab', /p\.get\('dok'\) \? 'documents'/.test(detail));

process.exit(fail ? 1 : 0);
