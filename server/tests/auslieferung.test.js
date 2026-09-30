// ─────────────────────────────────────────────────────────────────────────────
// Bekommt der Browser nach einem Deploy wirklich den neuen Stand? (v0.432)
//
// Anlass: Dreimal hintereinander eine Korrektur veröffentlicht, dreimal die
// Rückmeldung „geht noch immer nicht". Dabei war nicht zu unterscheiden, ob die
// Korrektur nicht wirkt oder ob der Browser noch die alte Fassung ausführt. So
// eine Ungewissheit kostet mehr als der Fehler selbst, denn sie macht jede
// Messung wertlos.
//
// Zwei Zusagen werden hier gemessen, an einem echten Server:
//   1. index.html kommt nie aus dem Zwischenspeicher.
//   2. Die Dateien unter /assets dürfen dort für immer bleiben. Ihr Name trägt
//      eine Prüfsumme, ein anderer Inhalt bekommt einen anderen Namen.
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const http = require('http');
const express = require('express');

let fail = 0;
const ok = (n, c) => { console.log((c ? '✓' : '✗ FEHLER') + ' ' + n); if (!c) fail++; };

const wurzel = path.join(__dirname, '..', '..');
const quelle = fs.readFileSync(path.join(wurzel, 'server', 'index.js'), 'utf8');

ok('index.html wird ohne Zwischenspeicher ausgeliefert', /no-store/.test(quelle));
ok('die Dateien unter /assets dürfen liegenbleiben', /immutable:\s*true/.test(quelle));
ok('express.static liefert index.html nicht selbst aus', /index:\s*false/.test(quelle));

// Und dasselbe an einem laufenden Server nachmessen, denn eine Zeichenkette im
// Quelltext ist noch keine Kopfzeile auf der Leitung.
(async () => {
  const dist = fs.mkdtempSync(path.join(require('os').tmpdir(), 'dist-'));
  fs.mkdirSync(path.join(dist, 'assets'));
  fs.writeFileSync(path.join(dist, 'index.html'), '<!doctype html><title>x</title>');
  fs.writeFileSync(path.join(dist, 'assets', 'haupt-abc123.js'), 'console.log(1)');

  const app = express();
  app.use('/assets', express.static(path.join(dist, 'assets'), { immutable: true, maxAge: '1y' }));
  app.use(express.static(dist, { index: false, etag: true, maxAge: 0 }));
  app.get('*', (req, res) => {
    res.set('Cache-Control', 'no-store, must-revalidate');
    res.sendFile(path.join(dist, 'index.html'));
  });

  const s = http.createServer(app);
  const port = await new Promise((r) => s.listen(0, '127.0.0.1', () => r(s.address().port)));
  const hole = (pfad) => new Promise((r) => http.get({ host: '127.0.0.1', port, path: pfad }, (a) => {
    a.resume(); a.on('end', () => r(a.headers));
  }));

  const seite = await hole('/projekte/7');
  const brocken = await hole('/assets/haupt-abc123.js');
  s.close();
  fs.rmSync(dist, { recursive: true, force: true });

  ok('die Seite trägt no-store', /no-store/.test(seite['cache-control'] || ''));
  ok('der Brocken darf ein Jahr bleiben', /max-age=31536000/.test(brocken['cache-control'] || ''));
  ok('und ist als unveränderlich gekennzeichnet', /immutable/.test(brocken['cache-control'] || ''));

  // ── Die Spur, die jeder Upload hinterlässt ─────────────────────────────────
  const hoch = fs.readFileSync(path.join(wurzel, 'server', 'utils', 'hochladen.js'), 'utf8');
  ok('Uploads werden protokolliert', /function spurLegen/.test(hoch));
  ok('der Abbruch nennt die angekommenen Bytes', /Upload abgebrochen/.test(hoch) && /menge\(\)/.test(hoch));
  ok('keine Dateinamen im Protokoll', !/originalname/.test(hoch));
  ok('die Spur hängt im Server', /spurLegen/.test(quelle));

  // ── Die Fassung im Startbanner ────────────────────────────────────────────
  // Dort stand fest verdrahtet v0.2.0. Ein Protokoll, das die falsche Fassung
  // nennt, führt bei der Fehlersuche in die Irre.
  ok('das Startbanner nennt die echte Fassung', !/Platform v0\.2\.0/.test(quelle));

  process.exit(fail ? 1 : 0);
})();
