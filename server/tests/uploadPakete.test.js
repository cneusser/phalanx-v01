// ─────────────────────────────────────────────────────────────────────────────
// Upload in Paketen.
//
// Anlass: „Fehler: Load failed" beim Hochladen in den FARADAY-Datenraum. Der
// Browser sagt damit nur, dass die Verbindung weg ist, nicht warum. Bisher ging
// alles in einer einzigen Anfrage hoch: 86 Dateien, 96 MB. Railway trennt eine
// Anfrage nach fünfzehn Minuten und nach fünf Minuten ohne Datenfluss, und der
// Server hält währenddessen alle Dateien im Arbeitsspeicher.
//
// Die wichtigste Eigenschaft der neuen Fassung: Was durch ist, bleibt oben.
// Vorher war ein Abbruch am Ende gleichbedeutend mit „nichts angekommen".
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');

let fail = 0;
const ok = (n, c) => { console.log((c ? '✓' : '✗ FEHLER') + ' ' + n); if (!c) fail++; };

// Das Modul ist ESM für den Browser, hier ohne Bundler laden.
const quelle = fs.readFileSync(
  path.join(__dirname, '..', '..', 'client', 'src', 'utils', 'hochladen.js'), 'utf8');
const { pakete, fehlertext } = (new Function(
  `${quelle.replace(/export (async function|const|function)/g, '$1')}
   return { pakete, fehlertext, ladeAlles, sendePaket };`))();

const datei = (name, mb) => ({ file: { size: Math.round(mb * 1024 * 1024), name }, path: name });

// ── Aufteilung ────────────────────────────────────────────────────────────
ok('keine Dateien ergeben kein Paket', pakete([]).length === 0);
ok('eine Datei ergibt ein Paket', pakete([datei('a.pdf', 1)]).length === 1);

const kleine = Array.from({ length: 86 }, (_, i) => datei(`d${i}.pdf`, 1.1));
const g = pakete(kleine);
ok('86 Dateien werden aufgeteilt', g.length > 1);
ok('kein Paket hat mehr als 20 Dateien', g.every((p) => p.length <= 20));
ok('jede Datei kommt genau einmal vor',
  g.flat().length === 86 && new Set(g.flat().map((x) => x.path)).size === 86);
ok('die Reihenfolge bleibt erhalten', g.flat()[0].path === 'd0.pdf' && g.flat()[85].path === 'd85.pdf');

// Eine Datei über der Paketgrenze darf nicht verschwinden.
const riesig = pakete([datei('klein.pdf', 1), datei('riesig.pdf', 90), datei('klein2.pdf', 1)]);
ok('eine übergroße Datei bekommt ihr eigenes Paket',
  riesig.some((p) => p.length === 1 && p[0].path === 'riesig.pdf'));
ok('und keine Datei geht dabei verloren', riesig.flat().length === 3);

// ── Fehlertexte ───────────────────────────────────────────────────────────
const abriss = fehlertext({ status: 0, responseText: '' }, 3 * 60 * 1000);
ok('ein Abriss wird erklärt', /abgerissen/.test(abriss));
ok('und nennt die Dauer', /3 Minuten/.test(abriss));
ok('kein "Load failed" mehr', !/Load failed/i.test(abriss));

ok('eine Servermeldung wird durchgereicht',
  fehlertext({ status: 400, responseText: '{"error":"Nur PDF-Dateien erlaubt"}' }, 10)
    === 'Nur PDF-Dateien erlaubt');
ok('413 wird erklärt, auch ohne Text', /zu groß/.test(fehlertext({ status: 413, responseText: '' }, 10)));
ok('401 nennt die fehlende Berechtigung', /Berechtigung/.test(fehlertext({ status: 401, responseText: '' }, 10)));
ok('ein unbekannter Code nennt wenigstens die Zahl',
  /HTTP 500/.test(fehlertext({ status: 500, responseText: 'kaputt' }, 10)));

// ── Die Oberfläche nutzt es auch ──────────────────────────────────────────
const seite = fs.readFileSync(
  path.join(__dirname, '..', '..', 'client', 'src', 'pages', 'ProjectSafe.jsx'), 'utf8');
ok('der Datenraum lädt in Paketen', /ladeAlles\(/.test(seite));
ok('er zeigt den Fortschritt', /stand\.prozent/.test(seite));
ok('und sagt bei Abbruch, was schon oben ist', /bleiben es/.test(seite));
ok('kein rohes fetch mehr für den Upload',
  !/fetch\(`\/api\/safe\/\$\{pid\}\/upload`/.test(seite));



// ── Eine leere Liste ist kein Erfolg (v0.430) ────────────────────────────────
//
// Anlass: Der Datenraum meldete „20 Datei(en) hochgeladen", und es lag keine
// einzige da. Die Ursache war eine Zeile in meinem eigenen Code:
//   angekommen += (d && d.created && d.created.length) || gruppe.length;
// Bei einer leeren Liste ist created.length gleich 0, also falsch, also griff
// der Ersatzwert: die Paketgröße. Damit sah ein vollständiger Ausfall aus wie
// ein vollständiger Erfolg. Das ist schlimmer als ein Fehler, denn es nimmt
// dem Nutzer den Anlass, nachzusehen.
{
  const quelle = fs.readFileSync(path.join(__dirname, '..', '..', 'client', 'src', 'utils', 'hochladen.js'), 'utf8');
  // Kommentarzeilen ausnehmen: der Fehler wird dort erklärt, nicht begangen.
  const code = quelle.split('\n').filter((z) => !/^\s*(\/\/|\*|\/\*)/.test(z)).join('\n');
  ok('kein Ersatzwert gruppe.length beim Zählen', !/\|\|\s*gruppe\.length/.test(code));
  ok('gezählt wird die bestätigte Liste', /created\.length\s*:\s*null/.test(quelle));
  ok('unklare Antworten werden gesammelt', /unklar\.push/.test(quelle));
  ok('bestätigte Namen werden gesammelt', /namen\.push/.test(quelle));

  const seite = fs.readFileSync(path.join(__dirname, '..', '..', 'client', 'src', 'pages', 'ProjectSafe.jsx'), 'utf8');
  ok('null angelegte Dateien werden als solche gemeldet',
    /e\.angekommen === 0/.test(seite) && /keine Datei abgelegt/.test(seite));
  ok('die Meldung nennt die angelegten Namen', /belegt\(e\.namen\)/.test(seite));
}

// ── Erst lesen, dann senden (v0.433) ─────────────────────────────────────────
//
// Gemessen im Serverprotokoll: „0 MB von 1 MB nach 0.6s, Körper vollständig:
// nein, Antwort gesendet: nein". Die Anfrage kommt an, der Körper nicht, und
// der Server hat nichts gesagt. Es bricht also die sendende Seite ab.
//
// Ein File aus einem Dateiauswahlfeld ist nur ein Verweis; gelesen wird erst
// beim Senden. Liegt dort ein Platzhalter statt einer Datei, bricht der Browser
// mittendrin ab. Also zuerst lesen, dann senden, und beim Scheitern den Namen
// der Datei nennen statt eines Abrisses.
{
  const q = fs.readFileSync(path.join(__dirname, '..', '..', 'client', 'src', 'utils', 'hochladen.js'), 'utf8');
  ok('die Datei wird vor dem Senden gelesen', /await file\.arrayBuffer\(\)/.test(q));
  ok('die gelesene Länge wird geprüft', /byteLength !== file\.size/.test(q));
  ok('die Meldung nennt den Dateinamen', /lässt sich auf diesem Rechner nicht lesen/.test(q));
  ok('und erklärt den Cloud-Platzhalter', /nur in der Cloud/.test(q));

  const srv = fs.readFileSync(path.join(__dirname, '..', 'utils', 'hochladen.js'), 'utf8');
  ok('das Protokoll misst über den Socket, nicht über einen data-Horcher',
    /socket\.bytesRead/.test(srv) && !/req\.on\('data'/.test(srv));
}

process.exit(fail ? 1 : 0);
