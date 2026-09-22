// Bearbeitungsfenster für Nachrichten (v0.399): Wer darf wann noch ändern,
// und ab wann gilt eine Nachricht als zugestellt? Die Regel entscheidet
// darüber, ob ein Text beim Empfänger nachträglich verschwinden kann, deshalb
// wird sie hier eng geprüft.
const versand = require('../utils/nachrichtVersand');

let fail = 0;
const ok = (n, c) => { console.log((c ? '✓' : '✗ FEHLER') + ' ' + n); if (!c) fail++; };

const JETZT = new Date('2026-09-22T10:00:00.000Z');
const inMin = (m) => new Date(JETZT.getTime() + m * 60 * 1000);

// ── Länge des Fensters ──────────────────────────────────────────────────────
const alterWert = process.env.NACHRICHT_FENSTER_MIN;

delete process.env.NACHRICHT_FENSTER_MIN;
ok('ohne Einstellung gilt der Standard von zehn Minuten', versand.fensterMinuten() === 10);

process.env.NACHRICHT_FENSTER_MIN = '3';
ok('Einstellung wird übernommen', versand.fensterMinuten() === 3);

process.env.NACHRICHT_FENSTER_MIN = '0';
ok('Null schaltet die Verzögerung ab', versand.fensterMinuten() === 0);

process.env.NACHRICHT_FENSTER_MIN = '999';
ok('unsinnig lange Fenster werden auf zwei Stunden begrenzt', versand.fensterMinuten() === 120);

process.env.NACHRICHT_FENSTER_MIN = 'abc';
ok('unlesbare Angabe faellt auf den Standard zurueck', versand.fensterMinuten() === 10);

process.env.NACHRICHT_FENSTER_MIN = '-5';
ok('negative Angabe faellt auf den Standard zurueck', versand.fensterMinuten() === 10);

process.env.NACHRICHT_FENSTER_MIN = '10';
const ab = versand.zustellungAb(JETZT);
ok('Zustellzeitpunkt liegt zehn Minuten in der Zukunft', ab.getTime() === inMin(10).getTime());

// ── Restzeit und Änderbarkeit ───────────────────────────────────────────────
ok('frisch abgeschickt: rund zehn Minuten Zeit',
  versand.restsekunden({ zustellung_ab: inMin(10) }, JETZT) === 600);

ok('kurz vor Ablauf: noch eine Minute',
  versand.restsekunden({ zustellung_ab: inMin(1) }, JETZT) === 60);

ok('Fenster abgelaufen: keine Restzeit',
  versand.restsekunden({ zustellung_ab: inMin(-1) }, JETZT) === 0);

ok('bereits benachrichtigt: keine Restzeit trotz Zukunftsdatum',
  versand.restsekunden({ zustellung_ab: inMin(5), benachrichtigt_am: JETZT }, JETZT) === 0);

ok('zurueckgezogen: keine Restzeit',
  versand.restsekunden({ zustellung_ab: inMin(5), zurueckgezogen_am: JETZT }, JETZT) === 0);

ok('Bestandszeile ohne Zustellzeitpunkt gilt als zugestellt',
  versand.restsekunden({ zustellung_ab: null }, JETZT) === 0);

ok('aenderbar genau solange Restzeit bleibt',
  versand.aenderbar({ zustellung_ab: inMin(2) }, JETZT) === true);

ok('nach Ablauf nicht mehr aenderbar',
  versand.aenderbar({ zustellung_ab: inMin(-0.1) }, JETZT) === false);

ok('zugestellte Nachricht ist nicht mehr aenderbar',
  versand.aenderbar({ zustellung_ab: inMin(5), benachrichtigt_am: JETZT }, JETZT) === false);

ok('ohne Nachricht keine Aenderung', versand.aenderbar(null, JETZT) === false);

// ── Zeilenumbrüche in der Mail ──────────────────────────────────────────────
const html = versand.alsHtml('Erste Zeile\nZweite Zeile');
ok('Zeilenumbruch wird zu einem Umbruch im HTML', html === 'Erste Zeile<br/>Zweite Zeile');

const boese = versand.alsHtml('<script>alert(1)</script>\nzweite');
ok('HTML im Text wird entschaerft', !boese.includes('<script>') && boese.includes('<br/>'));

ok('Windows-Umbruch wird ebenso umgesetzt',
  versand.alsHtml('a\r\nb') === 'a<br/>b');

if (alterWert === undefined) delete process.env.NACHRICHT_FENSTER_MIN;
else process.env.NACHRICHT_FENSTER_MIN = alterWert;

console.log(fail ? `\n${fail} Fehler` : '\nAlle Prüfungen bestanden');
process.exit(fail ? 1 : 0);
