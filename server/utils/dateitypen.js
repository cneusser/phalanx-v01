// ─────────────────────────────────────────────────────────────────────────────
// Welche Dateien hereindürfen, und wie sie wieder hinausgehen (v0.495)
//
// Der Datenraum nahm bis hierher jede Datei an: multer ohne `fileFilter`, der
// vom Absender behauptete Mimetype wurde gespeichert und bei Vorschau und
// Download unverändert als Content-Type zurückgegeben, bei der Vorschau immer
// mit `inline`. Eine Datei mit „text/html" oder „image/svg+xml" wurde damit im
// Ursprung der Plattform geöffnet, also in derselben Herkunft wie die
// Anwendung selbst. Was ein solches Dokument anrichten kann, hing allein an
// der Inhaltsrichtlinie, und die lässt sich über CSP_DISABLED abschalten.
//
// Dieselbe Prüfung gab es in routes/documents.js längst und richtig. Beide
// Wege schreiben inzwischen in denselben Baum, die strenge Tür stand also
// neben einer offenen. Deshalb liegt die Liste jetzt hier, an einer Stelle,
// und beide benutzen sie.
//
// Zwei Festlegungen:
//
//   1. Mimetype UND Endung müssen passen. Den Mimetype bestimmt der Absender
//      frei; mit ODER genügte die Behauptung „application/pdf".
//   2. Ausgeliefert wird mit dem Typ, der sich aus der Endung ergibt, nicht
//      mit dem gespeicherten. Und `inline` gibt es nur für die wenigen Typen,
//      bei denen ein Browser nichts ausführen kann.
// ─────────────────────────────────────────────────────────────────────────────

const path = require('path');

/** Mimetype zu Endung. Was hier nicht steht, kommt nicht herein. */
const ERLAUBT = {
  '.pdf': ['application/pdf'],
  '.pptx': ['application/vnd.openxmlformats-officedocument.presentationml.presentation'],
  '.ppt': ['application/vnd.ms-powerpoint'],
  '.xlsx': ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  '.xls': ['application/vnd.ms-excel'],
  '.docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  '.doc': ['application/msword'],
  '.csv': ['text/csv', 'application/csv', 'application/vnd.ms-excel'],
  '.txt': ['text/plain'],
  '.jpg': ['image/jpeg'],
  '.jpeg': ['image/jpeg'],
  '.png': ['image/png'],
  '.webp': ['image/webp'],
  '.gif': ['image/gif'],
  '.zip': ['application/zip', 'application/x-zip-compressed'],
};

/**
 * Nur diese Typen dürfen im Browser geöffnet werden.
 *
 * PDF steht hier, weil die Vorschau mit Wasserzeichen sonst nicht ginge, und
 * weil moderne Browser PDFs in einer eigenen, abgeschotteten Anzeige öffnen.
 * Bilder stehen hier ohne SVG: SVG ist ein Dokument mit Skriptfähigkeit, kein
 * Bild im harmlosen Sinn. Alles andere wird heruntergeladen.
 */
const INLINE_ERLAUBT = new Set([
  'application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/gif',
]);

const ALLE_MIMES = new Set(Object.values(ERLAUBT).flat());
const ALLE_ENDUNGEN = new Set(Object.keys(ERLAUBT));

/** Die Endung, klein geschrieben. */
function endungVon(name) {
  return path.extname(String(name || '')).toLowerCase();
}

/**
 * Darf diese Datei herein?
 *
 * @returns {{ok: boolean, grund?: string, mime?: string}} mime ist der Typ,
 *          der gespeichert werden soll: aus der Endung abgeleitet, nicht die
 *          Behauptung des Absenders.
 */
function pruefen(name, mimetype) {
  const ext = endungVon(name);
  if (!ext) return { ok: false, grund: 'Datei ohne Endung' };
  const erlaubteMimes = ERLAUBT[ext];
  if (!erlaubteMimes) return { ok: false, grund: `Dateityp nicht erlaubt: ${ext}` };
  const roh = String(mimetype || '').split(';')[0].trim().toLowerCase();
  // Manche Browser schicken gar keinen oder einen allgemeinen Typ. Das ist
  // kein Grund zur Abweisung, solange die Endung stimmt und wir den Typ
  // ohnehin selbst setzen.
  const unbestimmt = !roh || roh === 'application/octet-stream' || roh === 'binary/octet-stream';
  if (!unbestimmt && !erlaubteMimes.includes(roh)) {
    return { ok: false, grund: `Dateityp passt nicht zur Endung: ${roh} als ${ext}` };
  }
  return { ok: true, mime: erlaubteMimes[0] };
}

/** Ein multer-Filter aus derselben Prüfung. */
function multerFilter(_req, file, cb) {
  const r = pruefen(file.originalname, file.mimetype);
  if (r.ok) { file.geprueftMime = r.mime; return cb(null, true); }
  return cb(new Error(r.grund), false);
}

/**
 * Wie die Datei hinausgeht.
 *
 * @param gewuenschtInline  was die Route möchte
 * @returns {{mime: string, disposition: 'inline'|'attachment'}}
 */
function auslieferung(name, gespeicherterMime, gewuenschtInline) {
  const ext = endungVon(name);
  const ausEndung = (ERLAUBT[ext] || [])[0];
  // Der Typ aus der Endung schlägt den gespeicherten. Altbestand, der vor
  // dieser Fassung ohne Prüfung hereinkam, wird damit nachträglich entschärft.
  const mime = ausEndung || 'application/octet-stream';
  const inline = !!gewuenschtInline && INLINE_ERLAUBT.has(mime);
  return { mime, disposition: inline ? 'inline' : 'attachment' };
}

/** Die Kopfzeilen, die zu jeder Auslieferung gehören. */
function kopfzeilen(res, name, gespeicherterMime, gewuenschtInline) {
  const { mime, disposition } = auslieferung(name, gespeicherterMime, gewuenschtInline);
  res.setHeader('Content-Type', mime);
  res.setHeader('Content-Disposition', `${disposition}; filename="${encodeURIComponent(name || 'datei')}"`);
  // Kein Raten am Typ vorbei, und keine Einbettung in fremde Seiten.
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; sandbox");
  return { mime, disposition };
}

module.exports = {
  ERLAUBT, INLINE_ERLAUBT, ALLE_MIMES, ALLE_ENDUNGEN,
  endungVon, pruefen, multerFilter, auslieferung, kopfzeilen,
};
