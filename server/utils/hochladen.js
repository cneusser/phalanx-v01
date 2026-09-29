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

module.exports = { mitFehlermeldung, meldung, inMb };
