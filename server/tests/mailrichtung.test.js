// ─────────────────────────────────────────────────────────────────────────────
// Mailverlauf in beide Richtungen (v0.462)
//
// Bis hierher kannte die Historie nur die eingehende Seite. Man sah, was ein
// Interessent wollte, und nicht, was ihm zugesagt wurde. Bei mehreren Beratern
// an einem Mandat ist das der Punkt, an dem zwei Leute dasselbe zweimal
// beantworten, und zwar verschieden.
//
// Geprüft wird gegen vollständige Beispielmails mit Signatur, Zitat und
// Weiterleitungskopf. Eine Kurzfassung prüft genau das nicht, woran es in der
// Praxis scheitert.
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');

let fail = 0;
const ok = (n, c) => { console.log((c ? '✓' : '✗ FEHLER') + ' ' + n); if (!c) fail++; };

const wurzel = path.join(__dirname, '..', '..');
const lies = (...p) => fs.readFileSync(path.join(wurzel, ...p), 'utf8');

// Das Modul fasst beim Laden die Datenbank nicht an, die Funktionen hier sind
// rein. Was die Datenbank braucht, wird über den Quelltext geprüft.
const inb = require('../utils/inbound');
const route = lies('server', 'routes', 'inbound.js');
const modul = lies('server', 'utils', 'inbound.js');
const migration = lies('server', 'db', 'migrations', '20260901001980_mailverlauf_beide_richtungen.js');

// ── 1. Eigene Adressen ────────────────────────────────────────────────────
console.log('\n── Wer sind wir selbst ──');
const vorher = process.env.EIGENE_DOMAINS;
process.env.EIGENE_DOMAINS = '';
ok('ohne gesetzte Variable gilt niemand als eigen', !inb.istEigeneAdresse('christian.neusser@phalanx.de'));
ok('und damit bleibt alles eingehend wie bisher', inb.eigeneDomains().length === 0);

process.env.EIGENE_DOMAINS = 'phalanx.de, capitalmatch.de';
ok('die eigene Adresse wird erkannt', inb.istEigeneAdresse('Christian Neusser <christian.neusser@phalanx.de>'));
ok('auch in Grossschreibung', inb.istEigeneAdresse('Christian.Neusser@PHALANX.DE'));
ok('Unterdomänen zählen mit', inb.istEigeneAdresse('noreply@mail.phalanx.de'));
ok('die zweite Domain ebenfalls', inb.istEigeneAdresse('info@capitalmatch.de'));
ok('eine fremde nicht', !inb.istEigeneAdresse('maximilian.heufelder@foscari.de'));
ok('und eine, die nur ähnlich endet, auch nicht', !inb.istEigeneAdresse('info@nichtphalanx.de'));
ok('Unsinn ergibt keine eigene Adresse', !inb.istEigeneAdresse('') && !inb.istEigeneAdresse('kein-at-zeichen'));
if (vorher === undefined) delete process.env.EIGENE_DOMAINS; else process.env.EIGENE_DOMAINS = vorher;

// ── 2. Antwortbezug aus echten Kopfzeilen ─────────────────────────────────
console.log('\n── Antwortbezug ──');
const refs = '<CAF=1@mail.gmail.com> <AM0PR04MB12345@eurprd04.prod.outlook.com>';
ok('References werden zerlegt', inb.bezugsIds(null, refs).length === 2);
ok('In-Reply-To steht vorn', inb.bezugsIds('<zuerst@phalanx.de>', refs)[0] === '<zuerst@phalanx.de>');
ok('Doppelte werden zusammengefasst',
  inb.bezugsIds('<a@b.de>', '<a@b.de> <c@d.de>').length === 2);
ok('ohne Kopfzeilen bleibt die Liste leer', inb.bezugsIds(null, null).length === 0);
ok('Freitext ohne spitze Klammern ergibt nichts', inb.bezugsIds('kein kopf', 'auch nicht').length === 0);

// ── 3. Die Reihenfolge der Mandatszuordnung ───────────────────────────────
//
// Nicht über den Betreff allein. Betreffzeilen werden gekürzt, übersetzt und
// mit „Aw:" versehen; eine Zuordnung, die daran hängt, ist nach dem dritten
// Hin und Her falsch.
console.log('\n── Mandat zuordnen ──');
const zuordnung = modul.slice(modul.indexOf('async function mandatFinden'), modul.indexOf('async function ingestMail'));
ok('zuerst der Antwortbezug', zuordnung.indexOf("weg: 'Antwortbezug'") < zuordnung.indexOf("weg: 'Codename im Betreff'"));
ok('dann der Codename', zuordnung.indexOf("weg: 'Codename im Betreff'") < zuordnung.indexOf('einziges laufendes Mandat'));
ok('ein einziges laufendes Mandat zählt', /laufende\.length === 1/.test(zuordnung));
ok('bei mehreren wird KEINES geraten', /mehrere laufende Mandate, deshalb keines/.test(zuordnung));
ok('ausgestiegene Beteiligte zählen nicht mit', /party_status <> 'dropped'/.test(zuordnung));
ok('auch die eingehende Seite nutzt diese Reihenfolge', /mandatFinden\(\{ contact, subject, inReplyTo, references \}\)\)\.projekt/.test(modul));

// ── 4. Ausgehende Mails ───────────────────────────────────────────────────
console.log('\n── Die ausgehende Seite ──');
const aus = modul.slice(modul.indexOf('async function ingestMail'), modul.indexOf('module.exports = {'));
ok('der Kontakt kommt vom Empfänger, nicht vom Absender', /const contact = await matchContact\(adresse\)/.test(aus));
ok('je Empfänger ein eigener Eintrag', /for \(const adresse of empfaenger\)/.test(aus));
ok('interne Kopien landen in keiner Akte', /if \(istEigeneAdresse\(adresse\)\) continue/.test(aus));
ok('die Richtung steht als out in der Zeile', /direction[\s\S]{0,200}'out'/.test(aus));
ok('ein unbekannter Empfänger legt keinen Kontakt an',
  /Kein Kontakt zu dieser Empfängeradresse/.test(aus) && !/INSERT INTO crm_contacts/.test(aus));
ok('und wird protokolliert', /OUTBOUND_UNMATCHED/.test(aus));
ok('eine ausgehende Mail setzt NICHT replied', !/replied = 1/.test(aus));
ok('und hebt die Funnel-Stufe nicht an', !/funnel_stage = GREATEST/.test(aus));
ok('sie erzeugt auch keine Wiedervorlage', !/crm_tasks/.test(aus));
ok('der letzte Kontakt wird nachgezogen', /last_contact = CURRENT_DATE/.test(aus));

// ── 5. Dieselbe Mail zweimal ──────────────────────────────────────────────
console.log('\n── Doppelte ──');
ok('die Eindeutigkeit liegt in der Datenbank, nicht im Code',
  /CREATE UNIQUE INDEX IF NOT EXISTS crm_messages_msgid_idx/.test(migration));
ok('sie gilt je Mandant und Kontakt, nicht je message_id allein',
  /\(tenant_id, contact_id, message_id\)/.test(migration));
ok('Zeilen ohne message_id bleiben aussen vor', /WHERE message_id IS NOT NULL AND message_id <> ''/.test(migration));
ok('vorhandene Dubletten werden vorher entfernt', /DELETE FROM crm_messages a USING crm_messages b/.test(migration));
ok('und nur die jüngere davon', /a\.id > b\.id/.test(migration));
ok('eingehend wird nicht eingefügt, wenn schon da', /ON CONFLICT DO NOTHING/.test(modul));
ok('eine abgewiesene Dublette erzeugt keine zweite Wiedervorlage',
  /if \(!msgId\) \{\s*\n\s*return \{ matched: true, doppelt: true/.test(modul));

// ── 6. Die Schnittstelle ──────────────────────────────────────────────────
console.log('\n── Die Schnittstelle ──');
ok('alle Empfänger werden gelesen, nicht nur der erste', /const alle = \(v\) =>/.test(route));
ok('Kopien zählen mit', /b\.Cc \?\? b\.cc/.test(route));
ok('In-Reply-To wird übernommen', /in-reply-to/.test(route));
ok('References ebenfalls', /references: b\.References/.test(route));
ok('die Route entscheidet nicht selbst über die Richtung', /ingestMail\(\{/.test(route) && !/direction/.test(route));
ok('ohne INBOUND_SECRET bleibt die Schnittstelle zu', /Inbound ist nicht konfiguriert/.test(route));

// ── 7. Eine vollständige Beispielmail, nicht eine erfundene Kurzfassung ──
console.log('\n── Eine echte Mail ──');
const echteMail = [
  'Sehr geehrter Herr Neusser,',
  '',
  'vielen Dank für die Unterlagen zu FARADAY. Zwei Punkte sind uns aufgefallen:',
  'die Normalisierungen in der EBITDA-Überleitung und die unfertigen Leistungen.',
  '',
  'Mit freundlichen Grüßen',
  'Maximilian Heufelder',
  'Foscari Partners GmbH, Maximilianstraße 13, 80539 München',
  'T +49 156 7981 1699 · maximilian.heufelder@foscari.de',
  '',
  'Am 14.10.2026 schrieb Christian Neusser <christian.neusser@phalanx.de>:',
  '> anbei die Unterlagen zu FARADAY.',
  '> Beste Grüße, Christian Neusser',
].join('\n');
const gekuerzt = inb.cleanBody(echteMail);
ok('das Zitat der eigenen Mail wird abgeschnitten', !gekuerzt.includes('anbei die Unterlagen'));
ok('die Antwort selbst bleibt vollständig', gekuerzt.includes('unfertigen Leistungen'));
ok('die Signatur bleibt erhalten, sie trägt die Rufnummer', gekuerzt.includes('7981 1699'));

const weitergeleitet = [
  'FYI, bitte in die Akte.',
  '',
  '---------- Weitergeleitete Nachricht ----------',
  'Von: Maximilian Heufelder <maximilian.heufelder@foscari.de>',
  'Datum: Mi., 14. Okt. 2026 um 09:12',
  'Betreff: Rückfragen FARADAY',
  'An: Christian Neusser <christian.neusser@phalanx.de>',
  '',
  'Sehr geehrter Herr Neusser, anbei unsere Rückfragen.',
].join('\n');
ok('bei einer Weiterleitung wird der echte Absender gelesen',
  inb.urspruenglicherAbsender(weitergeleitet) === 'maximilian.heufelder@foscari.de');
ok('eine gewöhnliche Mail ohne Weiterleitungskopf ergibt keinen',
  inb.urspruenglicherAbsender('Guten Tag, hier ist unser Angebot. Viele Grüße') === null);

console.log(fail ? `\n${fail} Fehler` : '\nAlles grün');
process.exit(fail ? 1 : 0);
