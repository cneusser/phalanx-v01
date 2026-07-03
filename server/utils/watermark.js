// ─────────────────────────────────────────────────────────────────────────────
// Sprint 4 — Dynamisches Wasserzeichen für Datenraum-Downloads.
// Stempelt jede PDF-Seite diagonal mit Nutzer + Datum + Vertraulichkeitshinweis.
// Nicht-PDF-Dateien werden unverändert ausgeliefert (Zugriff wird geloggt).
// ─────────────────────────────────────────────────────────────────────────────
const { PDFDocument, rgb, StandardFonts, degrees } = require('pdf-lib');

/**
 * @param {Buffer} pdfBuffer  Original-PDF
 * @param {object} opts       { name, email, date }
 * @returns {Promise<Buffer>} PDF mit Wasserzeichen
 */
async function addWatermark(pdfBuffer, { name, email, date = new Date() }) {
  const doc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
  const font = await doc.embedFont(StandardFonts.HelveticaBold);
  const small = await doc.embedFont(StandardFonts.Helvetica);

  const dateStr = date.toLocaleString('de-DE', { timeZone: 'Europe/Berlin', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const mainText = `VERTRAULICH — ${name}`;
  const subText = `${email} · ${dateStr} · CapitalMatch Datenraum`;

  for (const page of doc.getPages()) {
    const { width, height } = page.getSize();
    // Diagonales Haupt-Wasserzeichen in der Seitenmitte
    const size = Math.min(width, height) / 22;
    page.drawText(mainText, {
      x: width * 0.12,
      y: height * 0.45,
      size,
      font,
      color: rgb(0.72, 0.75, 0.8),
      opacity: 0.35,
      rotate: degrees(35),
    });
    page.drawText(subText, {
      x: width * 0.14,
      y: height * 0.41,
      size: size * 0.55,
      font: small,
      color: rgb(0.72, 0.75, 0.8),
      opacity: 0.35,
      rotate: degrees(35),
    });
    // Fußzeilen-Stempel (immer lesbar)
    page.drawText(`Vertraulich · bereitgestellt für ${name} (${email}) am ${dateStr}`, {
      x: 24,
      y: 12,
      size: 7,
      font: small,
      color: rgb(0.45, 0.5, 0.55),
      opacity: 0.9,
    });
  }

  return Buffer.from(await doc.save());
}

module.exports = { addWatermark };
