// ─────────────────────────────────────────────────────────────────────────────
// Express 5: die drei Stellen, an denen es bricht (v0.475)
//
// Der Wechsel von Express 4 auf 5 ist hier klein, aber nicht folgenlos. Drei
// Dinge ändern sich, und alle drei fallen nicht beim Start auf, sondern erst,
// wenn jemand die Seite benutzt:
//
//   1. Die Pfadsyntax. Aus ':projectId?' wird '{/:projectId}', aus '*' wird
//      '{*rest}'. Eine alte Schreibweise wirft beim Registrieren, das merkt
//      man noch. Eine falsch übersetzte neue trifft einfach nicht mehr, und
//      das merkt man erst beim Aufruf.
//   2. `req.body` ist bei einer Anfrage ohne Inhalt nicht mehr `{}`, sondern
//      undefiniert. Im Bestand lesen rund 330 Stellen `req.body` direkt aus.
//      Jede davon würde mit einem Serverfehler enden statt mit einer
//      Meldung, welches Feld fehlt.
//   3. Fehler aus asynchronen Routen gehen jetzt von selbst an die
//      Fehlerbehandlung. Das ist die gute Nachricht, denn `wrap` tat das
//      schon; beides zusammen darf aber nicht doppelt antworten.
//
// Diese Datei startet einen echten Server mit derselben Reihenfolge an
// Mittelstücken wie `index.js` und ruft ihn auf. Ohne Datenbank, denn
// geprüft wird Express und nicht Postgres.
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const http = require('http');
const express = require('express');

let fail = 0;
const ok = (n, c) => { console.log((c ? '✓' : '✗ FEHLER') + ' ' + n); if (!c) fail++; };

const wurzel = path.join(__dirname, '..', '..');
const lies = (...p) => fs.readFileSync(path.join(wurzel, ...p), 'utf8');

console.log('\n── Die Fassung ──');
ok('Express 5 ist installiert', require('express/package.json').version.startsWith('5.'));
{
  const pj = JSON.parse(lies('server', 'package.json'));
  ok('und steht auch so in den Abhängigkeiten', /^\^?5\./.test(pj.dependencies.express));
  ok('xlsx ist draussen', !pj.dependencies.xlsx);
  ok('exceljs ist drin, es liest die Tabellen jetzt', !!pj.dependencies.exceljs);
}

console.log('\n── Die alten Schreibweisen sind weg ──');
{
  const index = lies('server', 'index.js');
  const admin = lies('server', 'routes', 'admin.js');
  ok('kein nackter Stern mehr', !/app\.get\('\*'/.test(index));
  ok('der Platzhalter hat einen Namen', /app\.get\('\{\*rest\}'/.test(index));
  // Nur Routenangaben zaehlen, nicht die Erklaerung darueber.
  const routenzeilen = admin.split('\n').filter((z) => /^router\.(get|post|put|patch|delete)\(/.test(z));
  ok('keine Fragezeichen-Parameter mehr in den Routen',
    !routenzeilen.some((z) => /:[a-zA-Z]+\?'/.test(z)));
  ok('der wahlfreie Parameter in neuer Schreibweise', /klarnamen\{\/:projectId\}/.test(admin));
  ok('der leere Rumpf wird wieder zum leeren Objekt', /if \(req\.body === undefined\) req\.body = \{\};/.test(index));
}

// ── Ein echter Server, gleiche Reihenfolge wie index.js ────────────────────
const app = express();
app.use(express.json({ limit: '8mb' }));
app.use(express.urlencoded({ extended: true, limit: '8mb' }));
app.use((req, _res, next) => { if (req.body === undefined) req.body = {}; next(); });

const wrap = require('../utils/asyncHandler');

app.post('/api/rumpf', (req, res) => res.json({ typ: typeof req.body, schluessel: Object.keys(req.body).length }));
app.get('/api/bericht{/:projectId}', (req, res) => res.json({ id: req.params.projectId || null }));
app.get('/api/fehler', wrap(async () => { throw new Error('geplatzt'); }));
app.get('{*rest}', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.json({ ausgeliefert: 'index.html', pfad: req.path });
});
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => res.status(500).json({ fehler: 'Interner Serverfehler' }));

const server = http.createServer(app);

function ruf(methode, pfad, { body, typ } = {}) {
  return new Promise((fertig) => {
    const kopf = typ ? { 'Content-Type': typ } : {};
    const r = http.request({ host: '127.0.0.1', port: server.address().port, method: methode, path: pfad, headers: kopf }, (res) => {
      let t = '';
      res.on('data', (c) => { t += c; });
      res.on('end', () => fertig({ status: res.statusCode, text: t }));
    });
    if (body !== undefined) r.write(body);
    r.end();
  });
}

server.listen(0, '127.0.0.1', async () => {
  console.log('\n── Der leere Rumpf ──');
  {
    const a = await ruf('POST', '/api/rumpf');
    ok('ohne Inhaltstyp antwortet die Route statt zu platzen', a.status === 200);
    ok('und req.body ist ein Objekt', JSON.parse(a.text).typ === 'object');
    const b = await ruf('POST', '/api/rumpf', { body: '{"a":1}', typ: 'application/json' });
    ok('mit Inhalt kommt der Inhalt an', JSON.parse(b.text).schluessel === 1);
  }

  console.log('\n── Der wahlfreie Parameter ──');
  {
    const mit = await ruf('GET', '/api/bericht/7');
    ok('mit Mandat trifft die Route', mit.status === 200 && JSON.parse(mit.text).id === '7');
    const ohne = await ruf('GET', '/api/bericht');
    ok('ohne Mandat ebenso', ohne.status === 200 && JSON.parse(ohne.text).id === null);
  }

  console.log('\n── Der Platzhalter am Ende ──');
  {
    const seite = await ruf('GET', '/projekte/4');
    ok('eine Unterseite bekommt die Oberfläche', seite.status === 200 && /index\.html/.test(seite.text));
    const api = await ruf('GET', '/api/gibtsnicht');
    ok('ein unbekannter API-Pfad faellt durch, nicht auf die Oberfläche',
      api.status === 404 && !/index\.html/.test(api.text));
  }

  console.log('\n── Fehler aus asynchronen Routen ──');
  {
    const f = await ruf('GET', '/api/fehler');
    ok('sie landen in der Fehlerbehandlung', f.status === 500);
    ok('und nennen nach aussen nichts Internes', !/geplatzt/.test(f.text));
  }

  server.close();
  console.log(fail ? `\n${fail} Fehler` : '\nAlles grün');
  process.exit(fail ? 1 : 0);
});
