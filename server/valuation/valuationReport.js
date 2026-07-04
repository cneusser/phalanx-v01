// ─────────────────────────────────────────────────────────────────────────────
// Sprint 6 — Bewertungs-PDF-Report in Phalanx-CI (indikativer Werte-Korridor).
// ─────────────────────────────────────────────────────────────────────────────
const PDFDocument = require('pdfkit');

const NAVY = '#0D1B36';
const ACCENT = '#1D4E89';
const GRAY = '#555555';
const BLACK = '#1A1A1A';
const LIGHT = '#EDF4FA';

const eur = (n) => {
  const v = Math.round(Number(n) || 0);
  return v.toLocaleString('de-DE') + ' €';
};

/**
 * @param {object} opts { result, input, industryLabel, company, name, date }
 * @returns {Promise<Buffer>}
 */
function generateValuationReport(opts) {
  const { result, industryLabel, company, name, date = new Date() } = opts;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4', bufferPages: true,
      margins: { top: 64, bottom: 60, left: 64, right: 64 },
      info: { Title: 'Indikative Unternehmensbewertung', Author: 'Phalanx GmbH', Creator: 'CapitalMatch' },
    });
    const buffers = [];
    doc.on('data', (b) => buffers.push(b));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    const PAGE_W = doc.page.width - 128;
    const dateStr = new Date(date).toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' });

    // Header
    doc.rect(0, 0, doc.page.width, 54).fill(NAVY);
    doc.fillColor('#fff').font('Helvetica-Bold').fontSize(13).text('CapitalMatch', 64, 16, { continued: true })
      .font('Helvetica').fontSize(10).fillColor('#8AB4D4').text('   Indikative Unternehmensbewertung');
    doc.font('Helvetica').fontSize(8.5).fillColor('rgba(255,255,255,0.7)').text('eine Marke der Phalanx GmbH', 64, 34);
    doc.y = 78;

    doc.font('Helvetica-Bold').fontSize(16).fillColor(NAVY).text('Ihr indikativer Unternehmenswert');
    doc.moveDown(0.2);
    doc.font('Helvetica').fontSize(9.5).fillColor(GRAY)
      .text([company ? `Unternehmen: ${company}` : null, name ? `Erstellt für: ${name}` : null, `Branche: ${industryLabel || '—'}`, `Datum: ${dateStr}`].filter(Boolean).join('  ·  '));
    doc.moveDown(0.6);
    doc.moveTo(64, doc.y).lineTo(64 + PAGE_W, doc.y).strokeColor('#E0DDD6').lineWidth(0.8).stroke();
    doc.moveDown(0.8);

    // ── Werte-Korridor (Kernaussage) ─────────────────────────────────────────
    doc.font('Helvetica-Bold').fontSize(11).fillColor(NAVY).text('Werte-Korridor (Enterprise Value, indikativ)');
    doc.moveDown(0.5);

    const c = result.corridor;
    const boxW = (PAGE_W - 20) / 3;
    const boxes = [
      ['Konservativ', c.conservative, '#EDF4FA', NAVY],
      ['Basis', c.base, NAVY, '#fff'],
      ['Optimistisch', c.optimistic, '#EDF4FA', NAVY],
    ];
    const y0 = doc.y;
    boxes.forEach(([label, val, bg, fg], i) => {
      const x = 64 + i * (boxW + 10);
      doc.rect(x, y0, boxW, 62).fillAndStroke(bg, '#DDE8F3');
      doc.fillColor(fg === '#fff' ? 'rgba(255,255,255,0.75)' : GRAY).font('Helvetica-Bold').fontSize(8.5)
        .text(label.toUpperCase(), x, y0 + 10, { width: boxW, align: 'center' });
      doc.fillColor(fg).font('Helvetica-Bold').fontSize(15)
        .text(result.positive ? eur(val) : 'n. b.', x, y0 + 28, { width: boxW, align: 'center' });
    });
    doc.x = 64; doc.y = y0 + 62 + 12;

    if (result.equityHint) {
      doc.font('Helvetica').fontSize(8.5).fillColor(GRAY)
        .text(`Nach Abzug der Netto-Finanzschulden (Equity Value, indikativ): ca. ${eur(result.equityHint.base)} (Basis).`, 64, doc.y, { width: PAGE_W });
      doc.moveDown(0.4);
    }
    if (!result.positive) {
      doc.font('Helvetica').fontSize(9).fillColor('#92400e')
        .text('Hinweis: Das bereinigte nachhaltige Ergebnis ist nicht positiv. Ertragsorientierte Verfahren liefern hier keinen sinnvollen Wert — bitte sprechen Sie uns für eine individuelle Einschätzung an.', 64, doc.y, { width: PAGE_W });
      doc.moveDown(0.4);
    }

    // ── Rechengrundlagen ─────────────────────────────────────────────────────
    doc.moveDown(0.4);
    doc.font('Helvetica-Bold').fontSize(11).fillColor(NAVY).text('Rechengrundlagen', 64, doc.y);
    doc.moveDown(0.4);
    const s = result.inputsSummary;
    const rows = [
      ['Ø Umsatz (letzte Jahre)', eur(s.avgRevenue)],
      ['Ø EBIT (letzte Jahre)', eur(s.rawAvgEbit)],
      ['− kalkulatorisches GF-Gehalt', eur(s.ownerSalaryAdjustment)],
      ['− Einmaleffekte', eur(s.oneOffs)],
      ['= Bereinigtes nachhaltiges EBIT', eur(s.adjustedEbit)],
    ];
    rows.forEach(([k, v], i) => {
      const yy = doc.y;
      if (i === rows.length - 1) doc.font('Helvetica-Bold'); else doc.font('Helvetica');
      doc.fontSize(9.5).fillColor(i === rows.length - 1 ? NAVY : BLACK);
      doc.text(k, 64, yy, { width: PAGE_W - 130 });
      doc.text(v, 64 + PAGE_W - 130, yy, { width: 130, align: 'right' });
      doc.moveDown(0.15);
    });

    // ── Methoden ─────────────────────────────────────────────────────────────
    doc.moveDown(0.6);
    doc.font('Helvetica-Bold').fontSize(11).fillColor(NAVY).text('Angewandte Verfahren', 64, doc.y);
    doc.moveDown(0.4);
    const m = result.methods;
    doc.font('Helvetica-Bold').fontSize(9.5).fillColor(ACCENT).text('1. Multiplikatorverfahren (EBIT)', 64, doc.y);
    doc.font('Helvetica').fontSize(9).fillColor(BLACK)
      .text(`Branchen-Multiple ${m.multiple.band.min}–${m.multiple.band.max}× (angesetzt: ${m.multiple.chosenMultiple}× nach Qualitätsbewertung). Wertspanne: ${eur(m.multiple.valueLow)} – ${eur(m.multiple.valueHigh)}.`, 64, doc.y, { width: PAGE_W });
    doc.moveDown(0.3);
    doc.font('Helvetica-Bold').fontSize(9.5).fillColor(ACCENT).text('2. Umsatz-Multiple (Plausibilität)', 64, doc.y);
    doc.font('Helvetica').fontSize(9).fillColor(BLACK)
      .text(`Umsatz-Multiple ${m.revenueMultiple.band.min}–${m.revenueMultiple.band.max}×. Wertspanne: ${eur(m.revenueMultiple.valueLow)} – ${eur(m.revenueMultiple.valueHigh)}.`, 64, doc.y, { width: PAGE_W });
    doc.moveDown(0.3);
    doc.font('Helvetica-Bold').fontSize(9.5).fillColor(ACCENT).text('3. Vereinfachtes Ertragswertverfahren (§199 BewG)', 64, doc.y);
    doc.font('Helvetica').fontSize(9).fillColor(BLACK)
      .text(`Kapitalisierungsfaktor ${m.simplifiedIncome.factor}: ${eur(m.simplifiedIncome.value)}. ${m.simplifiedIncome.note}`, 64, doc.y, { width: PAGE_W });

    // ── Disclaimer ───────────────────────────────────────────────────────────
    doc.moveDown(0.8);
    doc.x = 64;
    doc.rect(64, doc.y, PAGE_W, 58).fillAndStroke(LIGHT, '#bfdbfe');
    const dY = doc.y + 9;
    doc.font('Helvetica-Bold').fontSize(9).fillColor(NAVY).text('Wichtiger Hinweis', 76, dY);
    doc.font('Helvetica').fontSize(8.3).fillColor(GRAY)
      .text(`${result.disclaimer} Multiple-Quelle: ${result.multipleSource}. Für eine belastbare Bewertung (z. B. IDW S1) und die Ermittlung eines am Markt durchsetzbaren Preises sprechen Sie uns gern an.`, 76, doc.y + 2, { width: PAGE_W - 24 });

    // Footer
    const range = doc.bufferedPageRange();
    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(range.start + i);
      const old = doc.page.margins.bottom; doc.page.margins.bottom = 0;
      const pb = doc.page.height - 34;
      doc.rect(0, pb, doc.page.width, 34).fill(NAVY);
      doc.font('Helvetica').fontSize(7.5).fillColor('rgba(255,255,255,0.6)')
        .text(`CapitalMatch · Phalanx GmbH · Indikative Bewertung · ${dateStr} · Seite ${i + 1}/${range.count}`, 64, pb + 12, { width: PAGE_W, align: 'center', lineBreak: false });
      doc.page.margins.bottom = old;
    }
    doc.end();
  });
}

module.exports = { generateValuationReport };
