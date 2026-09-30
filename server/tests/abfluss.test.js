// ─────────────────────────────────────────────────────────────────────────────
// Warum aus „Sitzung abgelaufen" ein „Load failed" wurde (v0.431).
//
// Diese Prüfung ist eine Messung, keine Behauptung. Sie startet zwei echte
// Server, schickt an beide einen mehrere Megabyte großen Upload und lässt beide
// noch während des Sendens mit 401 antworten, genau wie authenticate es tut,
// wenn das Token abgelaufen ist.
//
//   Server A antwortet sofort.          Erwartung: die Verbindung bricht ab.
//   Server B benutzt mitAbfluss.        Erwartung: die 401 kommt an, mit Text.
//
// Der Unterschied ist die ganze Ursache: Wer auf eine noch laufende Anfrage
// antwortet, bringt Node dazu, die Verbindung zurückzusetzen. Die richtige
// Auskunft war da und ging unterwegs verloren.
// ─────────────────────────────────────────────────────────────────────────────
const http = require('http');
const express = require('express');
const { mitAbfluss } = require('../utils/hochladen');

let fail = 0;
const ok = (n, c) => { console.log((c ? '✓' : '✗ FEHLER') + ' ' + n); if (!c) fail++; };

/** Ein Server, der jeden Upload mit 401 abweist, wahlweise mit Abfluss. */
function server(mitKorrektur) {
  const app = express();
  if (mitKorrektur) app.use(mitAbfluss);
  app.post('/upload', (req, res) => {
    // Genau das tut authenticate: Kopf prüfen, sofort antworten, Körper ignorieren.
    res.status(401).json({ success: false, error: 'Sitzung abgelaufen, bitte erneut anmelden.' });
  });
  return http.createServer(app);
}

/** Einen mehrere Megabyte großen Multipart-Körper senden und sehen, was ankommt. */
function sende(port, bytes) {
  return new Promise((erfuellen) => {
    const grenze = '----pxlgrenze';
    const kopf = Buffer.from(
      `--${grenze}\r\nContent-Disposition: form-data; name="files"; filename="gross.bin"\r\n`
      + 'Content-Type: application/octet-stream\r\n\r\n');
    const fuss = Buffer.from(`\r\n--${grenze}--\r\n`);
    const nutz = Buffer.alloc(bytes, 0x41);

    const anfrage = http.request({
      host: '127.0.0.1', port, path: '/upload', method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${grenze}`,
        'Content-Length': kopf.length + nutz.length + fuss.length,
      },
    }, (antwort) => {
      let text = '';
      antwort.on('data', (d) => { text += d; });
      antwort.on('end', () => erfuellen({ status: antwort.statusCode, text }));
    });
    anfrage.on('error', (e) => erfuellen({ status: 0, fehler: e.code || e.message }));

    // In Häppchen senden, damit die Antwort mitten im Senden eintreffen kann.
    anfrage.write(kopf);
    let gesendet = 0;
    const stueck = 64 * 1024;
    (function weiter() {
      if (gesendet >= nutz.length) { anfrage.end(fuss); return; }
      const bis = Math.min(gesendet + stueck, nutz.length);
      anfrage.write(nutz.slice(gesendet, bis));
      gesendet = bis;
      setTimeout(weiter, 1);
    })();
  });
}

function starte(s) { return new Promise((r) => s.listen(0, '127.0.0.1', () => r(s.address().port))); }

(async () => {
  const BYTES = 4 * 1024 * 1024;

  const ohne = server(false);
  const mit = server(true);
  const portOhne = await starte(ohne);
  const portMit = await starte(mit);

  const a = await sende(portOhne, BYTES);
  const b = await sende(portMit, BYTES);

  ohne.close(); mit.close();

  // A belegt die Ursache. Entweder die Verbindung bricht ab (status 0), oder
  // Node schafft es gerade noch, die Antwort durchzubekommen. Beides kommt vor,
  // je nach Tempo der Maschine, deshalb wird hier nur gemessen und berichtet.
  console.log(`  ohne Abfluss: status ${a.status}${a.fehler ? ' (' + a.fehler + ')' : ''}`);
  console.log(`  mit  Abfluss: status ${b.status}${b.fehler ? ' (' + b.fehler + ')' : ''}`);

  // B ist die Zusage, auf die es ankommt: Die Antwort kommt an, und zwar mit
  // dem Satz, den der Nutzer lesen soll.
  ok('mit Abfluss kommt eine Antwort an', b.status !== 0);
  ok('und es ist die 401 des Servers', b.status === 401);
  ok('und sie trägt den verständlichen Satz', /Sitzung abgelaufen/.test(b.text || ''));

  // Und die Korrektur darf den Normalfall nicht bremsen: Ohne Dateianhang
  // greift sie gar nicht.
  const app = express();
  let durchgereicht = false;
  app.use(mitAbfluss);
  app.use((req, res) => { durchgereicht = true; res.json({ ok: true }); });
  const s3 = http.createServer(app);
  const p3 = await starte(s3);
  await new Promise((r) => http.get({ host: '127.0.0.1', port: p3, path: '/x' }, (x) => { x.resume(); x.on('end', r); }));
  s3.close();
  ok('ohne Dateianhang bleibt alles wie zuvor', durchgereicht);

  process.exit(fail ? 1 : 0);
})();
