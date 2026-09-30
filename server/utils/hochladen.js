// ─────────────────────────────────────────────────────────────────────────────
// Dateiuploads mit verständlicher Fehlermeldung (v0.428).
//
// Anlass: „Upload-Fehler: Load failed" beim Hochladen eines Exposés. Das ist
// keine Meldung der Anwendung, sondern die Art, wie Safari sagt: Die Verbindung
// ist abgerissen, bevor eine Antwort kam.
//
// Warum sie abreisst: multer prüft Dateityp und Größe, während der Browser noch
// sendet. Passt etwas nicht, wirft multer, der Fehler landet im allgemeinen
// Fehlerbehandler, und der antwortet mit 500, obwohl der Browser noch am Senden
// ist. Die Verbindung wird geschlossen, die Antwort kommt nie an, und der
// Nutzer sieht „Load failed" statt „Nur PDF-Dateien erlaubt".
//
// Gemessen: An einer Größengrenze liegt es nicht. Eine Anfrage mit 7 MB Inhalt
// geht bei Railway sauber durch, und Railway dokumentiert keine Grenze für den
// Anfragekörper.
//
// Diese Hülle fängt den Fehler an Ort und Stelle ab, nennt den Grund im
// Klartext und liest den Rest der Anfrage weg, bevor sie antwortet. Ohne das
// Wegräumen schliesst Node die Verbindung, und der Browser sieht wieder nur
// einen Abbruch.
// ─────────────────────────────────────────────────────────────────────────────
const multer = require('multer');

const MB = 1024 * 1024;

/** Die Grenze lesbar machen: 52428800 sagt niemandem etwas. */
const inMb = (bytes) => `${Math.round(bytes / MB)} MB`;

function meldung(err, grenzeBytes) {
  if (err instanceof multer.MulterError) {
    switch (err.code) {
      case 'LIMIT_FILE_SIZE':
        return `Die Datei ist zu groß. Erlaubt sind bis zu ${inMb(grenzeBytes)}.`;
      case 'LIMIT_FILE_COUNT':
        return 'Es wurden zu viele Dateien auf einmal gewählt.';
      case 'LIMIT_UNEXPECTED_FILE':
        return 'Unerwartetes Feld im Upload. Bitte laden Sie die Datei erneut hoch.';
      default:
        return `Der Upload wurde abgewiesen (${err.code}).`;
    }
  }
  // Fehler aus dem fileFilter, zum Beispiel „Nur PDF-Dateien erlaubt".
  return (err && err.message) || 'Der Upload ist fehlgeschlagen.';
}

/**
 * Eine Multer-Middleware so einpacken, dass sie sauber antwortet.
 *
 * @param mw            das Ergebnis von upload.single(...) oder .array(...)
 * @param grenzeBytes   die konfigurierte Größengrenze, nur für den Text
 */
function mitFehlermeldung(mw, grenzeBytes) {
  return (req, res, next) => {
    mw(req, res, (err) => {
      if (!err) return next();

      // Den Rest der Anfrage wegräumen. Antwortet man, während der Browser noch
      // sendet, wird die Verbindung zurückgesetzt und die Antwort geht
      // verloren: genau das erzeugt „Load failed".
      const antworte = () => {
        if (res.headersSent) return;
        const code = (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') ? 413 : 400;
        res.status(code).json({ success: false, error: meldung(err, grenzeBytes) });
      };
      if (req.readableEnded || req.complete) antworte();
      else {
        req.on('end', antworte);
        req.on('error', antworte);
        req.resume();
        // Notbremse: Wenn der Browser nicht zu Ende sendet, antworten wir
        // trotzdem, statt die Verbindung offen zu lassen.
        setTimeout(antworte, 10000).unref?.();
      }
    });
  };
}


// ─────────────────────────────────────────────────────────────────────────────
// Eine Antwort erst senden, wenn der Browser zu Ende gesendet hat (v0.431).
//
// Anlass: „Load failed" beim Hochladen, im Datenraum wie im Exposé-Editor. Zwei
// verschiedene Routen, dasselbe Bild. Was sie teilen, ist die Reihenfolge der
// Middleware:
//
//   authenticate  →  multer  →  Handler
//
// authenticate prüft nur den Kopf der Anfrage und antwortet sofort, wenn das
// Token abgelaufen oder ungültig ist. Zu diesem Zeitpunkt sendet der Browser
// aber noch den Dateikörper. Wer auf eine Anfrage antwortet, die noch läuft,
// bringt Node dazu, die Verbindung zurückzusetzen: Die Antwort wird nie
// zugestellt, und der Browser meldet, was er sieht, nämlich einen Abriss.
//
// Der Nutzer liest also „Load failed", während der Server in Wahrheit „Sitzung
// abgelaufen, bitte erneut anmelden" gesagt hat. Das ist die schlechteste Art
// von Fehler: Die richtige Auskunft war da und ist unterwegs verlorengegangen.
//
// Diese Middleware hält jede Antwort zurück, bis der Körper durchgelaufen ist.
// Sie greift nur bei Anfragen mit Dateianhang und nur, solange der Körper noch
// läuft. Im Normalfall hat multer ihn längst gelesen, dann ändert sie nichts.
// ─────────────────────────────────────────────────────────────────────────────
function mitAbfluss(req, res, next) {
  const art = String(req.headers['content-type'] || '');
  if (!art.startsWith('multipart/form-data')) return next();

  const durch = () => req.complete || req.readableEnded;
  for (const name of ['json', 'send']) {
    const echt = res[name].bind(res);
    res[name] = (...args) => {
      if (durch()) return echt(...args);
      let getan = false;
      const jetzt = () => { if (getan) return; getan = true; echt(...args); };
      req.on('end', jetzt);
      req.on('error', jetzt);
      req.on('aborted', jetzt);
      req.resume();                       // den Rest wegräumen, sonst endet nichts
      // Notbremse: Sendet der Browser nicht zu Ende, antworten wir trotzdem,
      // statt die Verbindung offen zu lassen.
      const uhr = setTimeout(jetzt, 15000);
      if (uhr.unref) uhr.unref();
      return res;
    };
  }
  next();
}


// ─────────────────────────────────────────────────────────────────────────────
// Uploads protokollieren (v0.432).
//
// Anlass: Nach dem dritten erfolglosen Anlauf habe ich die Laufzeitprotokolle
// des Servers gelesen und darin nichts über den fehlgeschlagenen Upload
// gefunden. Nicht, weil nichts passiert wäre, sondern weil dieser Server
// Anfragen überhaupt nicht protokolliert. Ich habe also dreimal geraten, wo ich
// hätte nachsehen können.
//
// Ab hier hinterlässt jeder Upload eine Spur: wann er ankam, wie groß er war,
// wie er endete und wie lange er gedauert hat. Bricht die Verbindung ab, steht
// auch das da, mit der Zahl der Bytes, die bis dahin angekommen waren. Damit
// lässt sich unterscheiden, was bisher nicht zu unterscheiden war:
//
//   • „abgebrochen nach 0.3s, 40 KB von 12 MB"  → die Anfrage stirbt früh,
//     also antwortet etwas davor, etwa die Anmeldung
//   • „abgebrochen nach 300s, 12 MB von 12 MB"  → der Körper war da, der
//     Server oder der Proxy hat danach zugemacht
//   • gar kein Eintrag                          → die Anfrage erreicht die
//     Anwendung nie, es liegt also davor
//
// Dateinamen werden bewusst nicht protokolliert. In einem anonymen
// Verkaufsprozess ist ein Dateiname schon eine Auskunft.
// ─────────────────────────────────────────────────────────────────────────────
function spurLegen(req, res, next) {
  const art = String(req.headers['content-type'] || '');
  if (!art.startsWith('multipart/form-data')) return next();

  const start = Date.now();
  const angekuendigt = Number(req.headers['content-length'] || 0);

  // Gezählt wird über den Zähler des Sockets, nicht über einen data-Horcher.
  // Ein data-Horcher versetzt den Strom sofort in den fließenden Zustand, und
  // dann liest multer einen Körper, dessen Anfang schon vorbeigelaufen ist. Ein
  // Messgerät, das den Messwert verändert, ist keines.
  const gelesen = () => (req.socket && req.socket.bytesRead) || 0;

  const dauer = () => ((Date.now() - start) / 1000).toFixed(1) + 's';
  const genau = (b) => (b >= 1024 * 1024 ? inMb(b) : `${Math.round(b / 1024)} KB`);
  const menge = () => `${genau(gelesen())} von ${genau(angekuendigt)}`;
  console.log(`⬆️  Upload beginnt: ${req.method} ${req.originalUrl}, angekündigt ${genau(angekuendigt)}`);

  let erledigt = false;
  res.on('finish', () => {
    erledigt = true;
    console.log(`⬆️  Upload beendet: ${req.originalUrl} → HTTP ${res.statusCode}, ${menge()} in ${dauer()}`);
  });
  res.on('close', () => {
    if (erledigt) return;
    console.warn(`⚠️  Upload abgebrochen: ${req.originalUrl}, ${menge()} nach ${dauer()}, `
      + `Körper vollständig: ${req.complete ? 'ja' : 'nein'}, Antwort gesendet: ${res.headersSent ? 'ja' : 'nein'}`);
  });
  next();
}

module.exports = { mitFehlermeldung, meldung, inMb, mitAbfluss, spurLegen };
