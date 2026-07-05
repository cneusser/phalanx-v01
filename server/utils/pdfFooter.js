// ─────────────────────────────────────────────────────────────────────────────
// Gemeinsamer Phalanx-Briefbogen-Footer für alle PDFs (NDA, Bewertungen, Exposé).
// Entspricht dem offiziellen Firmen-Briefpapier der Phalanx GmbH.
// ─────────────────────────────────────────────────────────────────────────────
const STEEL = '#5B8FC9';
const GRAY = '#6B6B6B';
const RULE = '#C9D6E5';

const PHALANX = {
  tagline: 'Die Veränderungsexperten – Werte sichern. Wachstum finanzieren. Weitblick etablieren.',
  web: 'www.phalanx.de',
  cols: [
    ['Phalanx GmbH', 'Helene-Lange-Straße 28', 'D-91056 Erlangen'],
    ['Tel  +49 9131-9 20 60 75', 'Fax  +49 9131-9 20 60 76', 'info@phalanx.de'],
    ['Geschäftsführer: Christian Neusser', 'Registergericht Fürth HRB 14306', 'USt-IdNr. DE 273 832 962'],
    ['Sparkasse Nürnberg', 'IBAN DE58 7605 0101 0010 8207 28', 'BIC SSKNDE77XXX'],
  ],
};

const FOOTER_HEIGHT = 60; // Platzbedarf am Seitenfuß (Seitenränder entsprechend wählen)

/**
 * Zeichnet den Briefbogen-Footer am unteren Rand der AKTUELL aktiven Seite.
 * Aufruf innerhalb der bufferedPageRange-Schleife (nach margins.bottom = 0).
 * @param {PDFDocument} doc
 * @param {object} opts { L, pageWidth, note }
 *   note: kleine Zeile ganz unten (z. B. "Vertraulich · … · Seite x/y")
 */
function drawCompanyFooter(doc, { L = 64, pageWidth, note = '' } = {}) {
  const PAGE_W = pageWidth != null ? pageWidth : (doc.page.width - 2 * L);
  const y0 = doc.page.height - FOOTER_HEIGHT - 6;

  doc.moveTo(L, y0).lineTo(L + PAGE_W, y0).strokeColor(RULE).lineWidth(0.8).stroke();

  // Tagline links + Web rechts
  doc.font('Helvetica-Bold').fontSize(6.8).fillColor(STEEL)
    .text(PHALANX.tagline, L, y0 + 5, { width: PAGE_W - 80, lineBreak: false });
  doc.font('Helvetica-Bold').fontSize(6.8).fillColor(STEEL)
    .text(PHALANX.web, L, y0 + 5, { width: PAGE_W, align: 'right', lineBreak: false });

  // 4 Spalten Firmendaten
  const colW = PAGE_W / 4;
  const cy = y0 + 16;
  PHALANX.cols.forEach((lines, c) => {
    const x = L + c * colW;
    lines.forEach((ln, r) => {
      doc.font('Helvetica').fontSize(5.9).fillColor(GRAY).text(ln, x, cy + r * 7.6, { width: colW - 6, lineBreak: false });
    });
  });

  // Notiz-/Seitenzeile ganz unten
  if (note) {
    doc.font('Helvetica').fontSize(6).fillColor('#9AA6B2')
      .text(note, L, cy + 25, { width: PAGE_W, align: 'center', lineBreak: false });
  }
}

module.exports = { drawCompanyFooter, PHALANX, FOOTER_HEIGHT };
