// ─────────────────────────────────────────────────────────────────────────────
// Hochgeladene Tabellen lesen, ohne xlsx (v0.475)
//
// Warum der Wechsel. `xlsx` von SheetJS trägt zwei offene Schwachstellen,
// Prototype Pollution und eine Textsuche, die sich zum Stillstand bringen
// lässt. Beides ist nicht behoben, und es wird über npm auch nicht mehr
// behoben: SheetJS liefert seit Jahren nur noch über eine eigene Quelle aus.
// Eine Abhängigkeit, die in unserem Bestand nicht mehr gepflegt wird und die
// fremde Dateien liest, ist genau die falsche Stelle zum Abwarten.
//
// `exceljs` liegt ohnehin im Projekt. Benutzt wurde von `xlsx` nur das Lesen
// der ersten Tabelle einer hochgeladenen Datei, und das kann exceljs auch.
//
// Ein Unterschied, der im Aufruf sichtbar wird: exceljs liest asynchron.
// Deshalb geben beide Funktionen hier ein Versprechen zurück, und die beiden
// Aufrufstellen warten darauf. Das ist der ganze Eingriff.
//
// CSV bleibt, wie es war. Die Trennzeichenerkennung stand schon vorher hier
// und hat mit xlsx nie etwas zu tun gehabt.
// ─────────────────────────────────────────────────────────────────────────────

/** Eine CSV-Datei in Zeilen aus Zellen zerlegen. */
function ausCsv(buffer) {
  const text = buffer.toString('utf8').replace(/^﻿/, '');
  const erste = text.split(/\r?\n/)[0] || '';
  // Deutsche Tabellenprogramme schreiben Semikolon, englische Komma. Gezählt
  // wird in der Kopfzeile, denn dort stehen am wenigsten Werte mit Komma.
  const trenner = (erste.match(/;/g) || []).length >= (erste.match(/,/g) || []).length ? ';' : ',';
  return text.split(/\r?\n/).map((z) => z.split(trenner).map((c) => c.replace(/^"(.*)"$/, '$1')));
}

/** Ist das eine CSV-Datei? Nach Dateiname oder gemeldeter Art. */
function istCsv(file) {
  const name = String(file.originalname || '').toLowerCase();
  return name.endsWith('.csv') || String(file.mimetype || '').includes('csv');
}

/** Den Wert einer Zelle als Zeichenkette, egal was exceljs daraus gemacht hat. */
function zelle(wert) {
  if (wert == null) return '';
  if (typeof wert === 'object') {
    // Formeln, Verweise und Rich Text kommen als Objekt. Gesucht ist immer
    // das, was im Blatt zu sehen wäre.
    if (wert.text != null) return String(wert.text);
    if (wert.result != null) return String(wert.result);
    if (Array.isArray(wert.richText)) return wert.richText.map((t) => t.text).join('');
    if (wert.hyperlink) return String(wert.hyperlink);
    if (wert instanceof Date) return wert.toISOString().slice(0, 10);
    return '';
  }
  return String(wert);
}

/**
 * Die erste Tabelle als Zeilen aus Zellen, so wie sie dasteht.
 * Entspricht dem früheren `sheet_to_json(ws, { header: 1, defval: '' })`.
 *
 * @returns {Promise<string[][]>}
 */
async function zeilen(file) {
  if (istCsv(file)) return ausCsv(file.buffer);
  const ExcelJS = require('exceljs');
  const mappe = new ExcelJS.Workbook();
  await mappe.xlsx.load(file.buffer);
  const blatt = mappe.worksheets[0];
  if (!blatt) return [];
  const raus = [];
  // `values` ist bei exceljs eins-basiert, der erste Eintrag ist leer.
  blatt.eachRow({ includeEmpty: true }, (zeile) => {
    const werte = Array.isArray(zeile.values) ? zeile.values.slice(1) : [];
    raus.push(werte.map(zelle));
  });
  // Leere Zeilen am Ende weglassen, sonst zählt der Aufrufer Luft mit.
  while (raus.length && raus[raus.length - 1].every((c) => !c)) raus.pop();
  return raus;
}

/**
 * Die erste Tabelle als Datensätze, Spaltenköpfe als Schlüssel.
 * Entspricht dem früheren `sheet_to_json(ws, { defval: '' })`.
 *
 * @returns {Promise<Array<Record<string, string>>>}
 */
async function objekte(file) {
  const alle = await zeilen(file);
  if (!alle.length) return [];
  const kopf = alle[0].map((h, i) => (String(h || '').trim() || `Spalte ${i + 1}`));
  return alle.slice(1)
    .filter((z) => z.some((c) => String(c || '').trim()))
    .map((z) => {
      const satz = {};
      kopf.forEach((h, i) => { satz[h] = z[i] == null ? '' : z[i]; });
      return satz;
    });
}

module.exports = { zeilen, objekte, istCsv, zelle };
