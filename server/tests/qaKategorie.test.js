// ─────────────────────────────────────────────────────────────────────────────
// Q&A: Kategorie, Verantwortlicher, interne Notiz, vier Stände (v0.460)
//
// Anlass: Elf Fragen eines Interessenten zum Mandat FARADAY, per E-Mail
// eingegangen. Drei Felder der Vorlage gab es nicht, zwei Zustände auch nicht,
// und einen Weg, eine fremde Frage zu erfassen, erst recht nicht.
//
// Die wichtigste Prüfung hier ist die auf die interne Notiz. Sie steht in
// derselben Zeile wie die Frage, und Zeilen holt irgendwann jemand mit einem
// Sternchen. Eine Notiz wie „vor Antwort mit Herrn Knaus abstimmen" beim
// Interessenten anzuzeigen, wäre der teuerste denkbare Fehler dieses Moduls:
// Sie verrät die interne Abstimmung an die Gegenseite einer Verhandlung.
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');

let fail = 0;
const ok = (n, c) => { console.log((c ? '✓' : '✗ FEHLER') + ' ' + n); if (!c) fail++; };

const wurzel = path.join(__dirname, '..', '..');
const lies = (...p) => fs.readFileSync(path.join(wurzel, ...p), 'utf8');

const migration = lies('server', 'db', 'migrations', '20260901001950_qa_kategorie_verantwortung.js');
const admin = lies('server', 'routes', 'admin.js');
const projekte = lies('server', 'routes', 'projects.js');
const nachrichten = lies('server', 'routes', 'messages.js');
const vok = require('../utils/vokabular');
const erfassen = lies('client', 'src', 'components', 'QaErfassen.jsx');
const adminUi = lies('client', 'src', 'pages', 'Admin.jsx');

// ── 1. Die interne Notiz verlässt das Haus nicht ──────────────────────────
console.log('\n── Die interne Notiz bleibt intern ──');
{
  // Die Käuferansicht zählt ihre Felder einzeln auf. Ein Sternchen wäre hier
  // kein Schönheitsfehler, sondern das Leck.
  const kaeufer = projekte.slice(
    projekte.indexOf('Käufer sehen ihre eigenen Fragen'),
    projekte.indexOf('Käufer sehen ihre eigenen Fragen') + 900);
  ok('die Käuferansicht holt keine ganzen Zeilen', !/SELECT \*\s+FROM qa_threads/i.test(kaeufer));
  ok('sie zählt ihre Felder einzeln auf', /SELECT id, question, answer, status, asked_at, answered_at, is_public/.test(kaeufer));
  ok('und die interne Notiz ist nicht dabei', !/interne_notiz/.test(kaeufer));
  ok('auch kein Verantwortlicher', !/verantwortlich_id/.test(kaeufer));
}
ok('im Nachrichtenfenster steht die Notiz ebenfalls nicht', !/interne_notiz/.test(nachrichten));

// ── 2. Die Stände ─────────────────────────────────────────────────────────
console.log('\n── Vier Stände, zwei davon neu ──');
ok('in_bearbeitung ist erlaubt', vok.istQaStand('in_bearbeitung'));
ok('zurueckgestellt ist erlaubt', vok.istQaStand('zurueckgestellt'));
ok('die alten Werte bleiben gültig', vok.istQaStand('open') && vok.istQaStand('answered'));
ok('erfundene Werte nicht', !vok.istQaStand('erledigt') && !vok.istQaStand(''));
ok('die Beschriftung ist deutsch', vok.qaStandLabel('in_bearbeitung') === 'in Bearbeitung');
ok('die Bedingung in der Datenbank kennt alle vier',
  /CHECK \(status IN \(\$\{NEUE_STAENDE/.test(migration) || /in_bearbeitung/.test(migration));
ok('die alte Bedingung wird vorher entfernt', /DROP CONSTRAINT IF EXISTS qa_threads_status_check/.test(migration));
ok('der Rückweg setzt die Zwischenstände zurück, sonst scheitert er',
  /whereIn\('status', \['in_bearbeitung', 'zurueckgestellt'\]\)\.update\(\{ status: 'open' \}\)/.test(migration));

// ── 3. Nichts fällt aus der Zählung ───────────────────────────────────────
//
// Wer „offene Fragen" zählte, fragte nach status = 'open'. Eine Frage in
// Bearbeitung verschwände damit aus jeder Zählung, obwohl sie offener ist als
// je zuvor.
console.log('\n── Die Zähler verlieren nichts ──');
ok('das Dashboard zählt nicht beantwortete statt nur offener',
  !/FILTER \(WHERE status='open'\)::int AS open FROM qa_threads/.test(admin));
ok('und zwar über ungleich beantwortet', /FILTER \(WHERE status <> 'answered'\)::int AS open FROM qa_threads/.test(admin));
ok('die Kennzahlen ebenso', /FROM qa_threads WHERE status <> 'answered'/.test(admin));
ok('das Nachrichtenfenster ebenso', !/WHERE q\.status = 'open'/.test(nachrichten));
ok('die Liste sortiert Unerledigtes nach oben', /ORDER BY \(q\.status <> 'answered'\) DESC/.test(admin));

// ── 4. Erfassen für einen Interessenten ───────────────────────────────────
console.log('\n── Fragen erfassen ──');
// Nur bis zur nächsten Route lesen. Ohne diese Grenze reicht der Ausschnitt
// bis ans Dateiende, und dann findet die Prüfung „es wird nichts versendet"
// natürlich einen Mailversand: irgendeinen, irgendwo weiter unten.
const abschnitt = (quelle, start) => {
  const i = quelle.indexOf(start);
  if (i < 0) return '';
  const rest = quelle.slice(i + start.length);
  const ende = rest.search(/\nrouter\.(get|put|post|delete)\(/);
  return ende < 0 ? rest : rest.slice(0, ende);
};
const route = abschnitt(admin, "router.post('/questions'");
ok('die Route gibt es', route.length > 0);
ok('sie nimmt mehrere Fragen auf einmal', /Array\.isArray\(req\.body\.fragen\)/.test(route));
ok('aber nicht beliebig viele', /Höchstens 50 Fragen/.test(route));
ok('ohne Nutzerkonto kein Fragesteller, und das wird gesagt',
  /kein Nutzerkonto/.test(route) && /nicht am CRM-Kontakt/.test(route));
ok('wer nicht Interessent des Mandats ist, wird gemeldet statt angelegt',
  /nicht als Interessent geführt/.test(route));
ok('beantwortet ohne Antworttext wird abgelehnt',
  /als beantwortet gekennzeichnet, aber ohne Antworttext/.test(route));
ok('alles Erfasste ist zunächst nur für diesen Interessenten sichtbar', /is_public\)\s*\n\s*VALUES[\s\S]{0,200}0\)/.test(route));
ok('es wird nichts versendet', !/send\w*Email|sendCampaign|notify/i.test(route));
ok('und das steht auch in der Antwort', /Es wurde nichts versendet und niemand benachrichtigt/.test(route));
ok('der Vorgang wird protokolliert', /QA_ERFASST/.test(route));
ok('das Eingangsdatum wird geprüft', /Eingangsdatum ist nicht lesbar/.test(route));

// ── 5. Pflegen ────────────────────────────────────────────────────────────
console.log('\n── Pflegen ──');
const pflege = abschnitt(admin, "router.put('/questions/:id'");
ok('Kategorie, Verantwortlicher, Notiz und Stand lassen sich ändern',
  /kategorie = COALESCE/.test(pflege) && /verantwortlich_id = COALESCE/.test(pflege)
  && /interne_notiz = COALESCE/.test(pflege) && /status = COALESCE/.test(pflege));
ok('auf beantwortet kommt man nur über eine Antwort',
  /Ohne Antworttext lässt sich eine Frage nicht auf beantwortet setzen/.test(pflege));
ok('unbekannte Stände werden abgewiesen', /Unbekannter Stand/.test(pflege));

// ── 6. Oberfläche ─────────────────────────────────────────────────────────
console.log('\n── Oberfläche ──');
ok('die Erfassung nimmt mehrere Zeilen', /Weitere Frage/.test(erfassen));
ok('sie sagt vorab, dass nichts versendet wird', /Es wird nichts versendet und niemand/.test(erfassen));
ok('der Knopf sagt es nochmal', /Erfassen, ohne zu senden/.test(erfassen));
ok('die interne Notiz ist als intern beschriftet', /nie der Interessent/.test(erfassen));
ok('der Antworttext erscheint nur bei beantwortet', /z\.status === 'answered' &&/.test(erfassen));
ok('ohne Interessenten am Mandat wird der Grund genannt', /nicht als Interessent geführt|niemand als Interessent geführt/.test(erfassen));
ok('die Kategorien kommen aus dem gemeinsamen Vokabular', /qa_kategorien/.test(erfassen));
ok('der Q&A-Reiter bindet die Erfassung ein', /<QaErfassen/.test(adminUi));
ok('die interne Notiz wird dort als intern gekennzeichnet',
  /Intern, nie für den Interessenten sichtbar/.test(adminUi));
ok('die Karte kennt alle vier Stände',
  ['open', 'in_bearbeitung', 'zurueckgestellt', 'answered'].every((s) => adminUi.includes(`value="${s}"`)));
ok('beantwortet lässt sich ohne Antwort nicht wählen', /disabled=\{!q\.answer\}/.test(adminUi));

console.log(fail ? `\n${fail} Fehler` : '\nAlles grün');
process.exit(fail ? 1 : 0);
