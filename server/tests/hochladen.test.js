// ─────────────────────────────────────────────────────────────────────────────
// Uploads scheitern verständlich.
//
// Anlass: „Upload-Fehler: Load failed" beim Hochladen eines Exposés. Das ist
// keine Meldung der Anwendung, sondern Safaris Art zu sagen, dass die
// Verbindung abgerissen ist. Der Nutzer erfährt also nicht, was er falsch
// gemacht hat, und wir erfahren es auch nicht.
//
// Nachgemessen, bevor gebaut wurde: An einer Größengrenze liegt es nicht.
// 7 MB Inhalt gehen bei Railway sauber durch, und Railway dokumentiert keine
// Grenze für den Anfragekörper. Ursache ist, dass multer mitten im Upload
// abweist und niemand diesen Fehler auffängt.
// ─────────────────────────────────────────────────────────────────────────────
const multer = require('multer');
const { mitFehlermeldung, meldung, inMb } = require('../utils/hochladen');

let fail = 0;
const ok = (n, c) => { console.log((c ? '✓' : '✗ FEHLER') + ' ' + n); if (!c) fail++; };

// ── Die Texte ─────────────────────────────────────────────────────────────
const zuGross = Object.assign(new multer.MulterError('LIMIT_FILE_SIZE'), {});
ok('zu groß wird im Klartext erklärt', /zu groß/.test(meldung(zuGross, 50 * 1024 * 1024)));
ok('und nennt die Grenze in MB', /50 MB/.test(meldung(zuGross, 50 * 1024 * 1024)));
ok('keine Byte-Zahlen in der Meldung', !/52428800/.test(meldung(zuGross, 50 * 1024 * 1024)));
ok('der Filtertext wird durchgereicht',
  meldung(new Error('Nur PDF-Dateien erlaubt')) === 'Nur PDF-Dateien erlaubt');
ok('ohne Text gibt es trotzdem einen Satz', /fehlgeschlagen/.test(meldung(null)));
ok('MB werden gerundet', inMb(52428800) === '50 MB' && inMb(6291456) === '6 MB');

// ── Das Verhalten: erst zu Ende lesen, dann antworten ─────────────────────
// Der entscheidende Punkt. Antwortet man, während der Browser noch sendet,
// wird die Verbindung zurückgesetzt und die Antwort geht verloren: genau das
// erzeugt „Load failed".
function nachbau({ fertig, fehler }) {
  const zuhoerer = {};
  const req = {
    readableEnded: fertig, complete: fertig,
    on: (e, f) => { zuhoerer[e] = f; },
    resume: () => { req.gelesen = true; if (zuhoerer.end) zuhoerer.end(); },
    gelesen: false,
  };
  const res = { headersSent: false, code: null, koerper: null,
    status(c) { this.code = c; return this; },
    json(o) { this.koerper = o; this.headersSent = true; return this; } };
  const mw = (_q, _s, next) => next(fehler);
  mitFehlermeldung(mw, 50 * 1024 * 1024)(req, res, () => { res.weiter = true; });
  return { req, res };
}

const a = nachbau({ fertig: false, fehler: zuGross });
ok('der Rest der Anfrage wird weggelesen', a.req.gelesen === true);
ok('erst danach wird geantwortet', a.res.headersSent === true);
ok('zu groß ergibt HTTP 413', a.res.code === 413);
ok('die Antwort nennt den Grund', /zu groß/.test(a.res.koerper.error));
ok('die Antwort ist als Fehler gekennzeichnet', a.res.koerper.success === false);

const b = nachbau({ fertig: false, fehler: new Error('Nur PDF-Dateien erlaubt') });
ok('ein falscher Dateityp ergibt HTTP 400', b.res.code === 400);
ok('und nennt den Dateityp als Grund', b.res.koerper.error === 'Nur PDF-Dateien erlaubt');

const c = nachbau({ fertig: true, fehler: zuGross });
ok('bei bereits gelesener Anfrage wird sofort geantwortet', c.res.headersSent === true);

const d = nachbau({ fertig: false, fehler: null });
ok('ohne Fehler läuft die Anfrage normal weiter', d.res.weiter === true && d.res.headersSent === false);

// ── Alle Uploadwege sind eingepackt ───────────────────────────────────────
const fs = require('fs');
const path = require('path');
const routen = path.join(__dirname, '..', 'routes');
const offen = [];
for (const datei of fs.readdirSync(routen).filter((f) => f.endsWith('.js'))) {
  const inhalt = fs.readFileSync(path.join(routen, datei), 'utf8');
  for (const m of inhalt.matchAll(/^(?!.*mitFehlermeldung).*\b\w*[Uu]pload\.(single|array)\(/gm)) {
    // projects.js ruft multer von Hand mit eigenem Rückruf auf, das ist in
    // Ordnung: dort wird der Fehler schon behandelt.
    if (datei === 'projects.js') continue;
    offen.push(`${datei}: ${m[0].trim().slice(0, 60)}`);
  }
}
ok('jeder Uploadweg hat eine Fehlermeldung' + (offen.length ? `\n     ${offen.join('\n     ')}` : ''),
  offen.length === 0);

// ── Der Browser prüft vorab ───────────────────────────────────────────────
const editor = fs.readFileSync(
  path.join(__dirname, '..', '..', 'client', 'src', 'pages', 'ExposeEditor.jsx'), 'utf8');
ok('die Oberfläche prüft den Dateityp vor dem Senden', /istPdf/.test(editor));
ok('und die Größe', /PDF_GRENZE/.test(editor));
const client = fs.readFileSync(
  path.join(__dirname, '..', '..', 'client', 'src', 'api', 'client.js'), 'utf8');
ok('ein Verbindungsabbruch wird übersetzt', /abgerissen/.test(client));

process.exit(fail ? 1 : 0);
