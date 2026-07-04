// ─────────────────────────────────────────────────────────────────────────────
// Sprint 6 — Bewertungs-PDF-Report in Phalanx-CI (indikativer Werte-Korridor).
// Briefbogen-Anmutung: Phalanx-Logo, 1,5-Zeilenabstand & Blocksatz im Fließtext,
// werblicher Abschluss-Block. Quelle der Multiples: DUB KMU-Multiples.
// ─────────────────────────────────────────────────────────────────────────────
const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');

const NAVY = '#0D2A4A';   // Phalanx-Navy (Wortmarke)
const ACCENT = '#1D4E89';
const STEEL = '#5B8FC9';  // Tagline-Blau
const GRAY = '#555555';
const BLACK = '#1A1A1A';
const LIGHT = '#EDF4FA';

const LOGO = path.join(__dirname, '..', 'assets', 'phalanx-mark.png');

const eur = (n) => {
  const v = Math.round(Number(n) || 0);
  return v.toLocaleString('de-DE') + ' €';
};
// Multiple mit deutschem Dezimalkomma (z. B. 7,8)
const mx = (n) => Number(n).toLocaleString('de-DE', { maximumFractionDigits: 2 });

/**
 * @param {object} opts { result, input, industryLabel, company, name, date }
 * @returns {Promise<Buffer>}
 */
function generateValuationReport(opts) {
  const { result, industryLabel, company, name, date = new Date() } = opts;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4', bufferPages: true,
      margins: { top: 56, bottom: 64, left: 64, right: 64 },
      info: { Title: 'Indikative Unternehmensbewertung', Author: 'Phalanx GmbH', Creator: 'CapitalMatch' },
    });
    const buffers = [];
    doc.on('data', (b) => buffers.push(b));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    const L = 64;                          // linke Kante
    const PAGE_W = doc.page.width - 128;    // Textbreite
    const R = L + PAGE_W;                   // rechte Kante
    const dateStr = new Date(date).toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' });
    // Blocksatz + 1,5-zeilig für Fließtext
    const PROSE = (size) => ({ width: PAGE_W, align: 'justify', lineGap: Math.round(size * 0.55) });

    // ── Briefkopf: Logo links, Dokumententyp rechts ──────────────────────────
    let logoBottom = 56;
    if (fs.existsSync(LOGO)) {
      const lw = 80;
      doc.image(LOGO, L, 46, { width: lw });
      logoBottom = 46 + lw * (545 / 648);
    }
    doc.font('Helvetica-Bold').fontSize(12).fillColor(NAVY)
      .text('CapitalMatch', L, 52, { width: PAGE_W, align: 'right' });
    doc.font('Helvetica').fontSize(9).fillColor(GRAY)
      .text('Indikative Unternehmensbewertung', L, 70, { width: PAGE_W, align: 'right' });
    doc.font('Helvetica').fontSize(9).fillColor(GRAY)
      .text(dateStr, L, 84, { width: PAGE_W, align: 'right' });
    // Tagline unter dem Logo
    doc.font('Helvetica-Oblique').fontSize(8).fillColor(STEEL)
      .text('Werte sichern. Wachstum finanzieren. Weitblick etablieren.', L, logoBottom + 4, { width: PAGE_W });

    let y = Math.max(logoBottom + 14, 118);
    doc.moveTo(L, y).lineTo(R, y).strokeColor(NAVY).lineWidth(1.4).stroke();
    doc.y = y + 14;

    // ── Titel + werblicher Einstieg (Blocksatz, 1,5-zeilig) ──────────────────
    doc.font('Helvetica-Bold').fontSize(16).fillColor(NAVY).text('Ihr indikativer Unternehmenswert', L, doc.y);
    doc.moveDown(0.25);
    doc.font('Helvetica').fontSize(9.5).fillColor(GRAY)
      .text([company ? `Unternehmen: ${company}` : null, name ? `Erstellt für: ${name}` : null, `Branche: ${industryLabel || '—'}`].filter(Boolean).join('   ·   '), L, doc.y, { width: PAGE_W });
    doc.moveDown(0.55);
    doc.font('Helvetica').fontSize(9.5).fillColor(BLACK).text(
      `vielen Dank für Ihr Interesse. Auf Basis Ihrer Angaben haben wir einen indikativen Werte-Korridor für Ihr Unternehmen ermittelt. Er verbindet das marktübliche EBIT-Multiplikatorverfahren mit dem vereinfachten Ertragswertverfahren und dient als erste, fundierte Orientierung — der ideale Ausgangspunkt für ein persönliches Gespräch über Verkauf, Nachfolge oder Wachstumsfinanzierung.`,
      L, doc.y, PROSE(9.5));
    doc.moveDown(0.6);

    // ── Werte-Korridor (Kernaussage) ─────────────────────────────────────────
    doc.font('Helvetica-Bold').fontSize(11.5).fillColor(NAVY).text('Werte-Korridor (Enterprise Value, indikativ)', L, doc.y);
    doc.moveDown(0.45);

    const c = result.corridor;
    const boxW = (PAGE_W - 20) / 3;
    const boxes = [
      ['Konservativ', c.conservative, '#EDF4FA', NAVY],
      ['Basis', c.base, NAVY, '#fff'],
      ['Optimistisch', c.optimistic, '#EDF4FA', NAVY],
    ];
    const y0 = doc.y;
    boxes.forEach(([label, val, bg, fg], i) => {
      const x = L + i * (boxW + 10);
      doc.rect(x, y0, boxW, 56).fillAndStroke(bg, '#DDE8F3');
      doc.fillColor(fg === '#fff' ? 'rgba(255,255,255,0.75)' : GRAY).font('Helvetica-Bold').fontSize(8.5)
        .text(label.toUpperCase(), x, y0 + 9, { width: boxW, align: 'center' });
      doc.fillColor(fg).font('Helvetica-Bold').fontSize(15)
        .text(result.positive ? eur(val) : 'n. b.', x, y0 + 25, { width: boxW, align: 'center' });
    });
    doc.x = L; doc.y = y0 + 56 + 10;

    // Größenklasse + Equity-Hinweis
    if (result.sizeBand) {
      doc.font('Helvetica').fontSize(8.5).fillColor(GRAY)
        .text(`Größenklasse (nach Ø-Umsatz): ${result.sizeBand.label}.`, L, doc.y, { width: PAGE_W });
      doc.moveDown(0.25);
    }
    if (result.equityHint) {
      doc.font('Helvetica').fontSize(8.5).fillColor(GRAY)
        .text(`Nach Abzug der Netto-Finanzschulden (Equity Value, indikativ): ca. ${eur(result.equityHint.base)} (Basis).`, L, doc.y, { width: PAGE_W });
      doc.moveDown(0.35);
    }
    if (!result.positive) {
      doc.font('Helvetica').fontSize(9).fillColor('#92400e')
        .text('Hinweis: Das bereinigte nachhaltige Ergebnis ist nicht positiv. Ertragsorientierte Verfahren liefern hier keinen sinnvollen Wert — bitte sprechen Sie uns für eine individuelle Einschätzung an.', L, doc.y, PROSE(9));
      doc.moveDown(0.35);
    }

    // ── Rechengrundlagen ─────────────────────────────────────────────────────
    doc.moveDown(0.25);
    doc.font('Helvetica-Bold').fontSize(11.5).fillColor(NAVY).text('Rechengrundlagen', L, doc.y);
    doc.moveDown(0.3);
    const s = result.inputsSummary;
    const rows = [
      ['Ø Umsatz (letzte Jahre)', eur(s.avgRevenue)],
      ['Ø EBIT (letzte Jahre)', eur(s.rawAvgEbit)],
      ['– kalkulatorisches GF-Gehalt', eur(s.ownerSalaryAdjustment)],
      ['– Einmaleffekte', eur(s.oneOffs)],
      ['= Bereinigtes nachhaltiges EBIT', eur(s.adjustedEbit)],
    ];
    rows.forEach(([k, v], i) => {
      const yy = doc.y;
      const last = i === rows.length - 1;
      doc.font(last ? 'Helvetica-Bold' : 'Helvetica').fontSize(9.5).fillColor(last ? NAVY : BLACK);
      doc.text(k, L, yy, { width: PAGE_W - 130 });
      doc.text(v, L + PAGE_W - 130, yy, { width: 130, align: 'right' });
      doc.moveDown(0.12);
    });

    // ── Methoden (Blocksatz, 1,5-zeilig) ─────────────────────────────────────
    doc.moveDown(0.45);
    doc.font('Helvetica-Bold').fontSize(11.5).fillColor(NAVY).text('Angewandte Verfahren', L, doc.y);
    doc.moveDown(0.35);
    const m = result.methods;
    doc.font('Helvetica-Bold').fontSize(9.5).fillColor(ACCENT).text('1. Multiplikatorverfahren (EBIT)', L, doc.y);
    doc.font('Helvetica').fontSize(9).fillColor(BLACK).text(
      `Branchen-Multiple ${mx(m.multiple.band.min)}–${mx(m.multiple.band.max)}× für ${m.multiple.sizeBandLabel || 'die gewählte Größenklasse'} (angesetzt: ${mx(m.multiple.chosenMultiple)}× nach Qualitätsbewertung). Wertspanne: ${eur(m.multiple.valueLow)} – ${eur(m.multiple.valueHigh)}.`,
      L, doc.y, PROSE(9));
    doc.moveDown(0.25);
    doc.font('Helvetica-Bold').fontSize(9.5).fillColor(ACCENT).text('2. Umsatz-Multiple (Plausibilität)', L, doc.y);
    doc.font('Helvetica').fontSize(9).fillColor(BLACK).text(
      `Umsatz-Multiple ${mx(m.revenueMultiple.band.min)}–${mx(m.revenueMultiple.band.max)}×. Wertspanne: ${eur(m.revenueMultiple.valueLow)} – ${eur(m.revenueMultiple.valueHigh)}.`,
      L, doc.y, PROSE(9));
    doc.moveDown(0.25);
    doc.font('Helvetica-Bold').fontSize(9.5).fillColor(ACCENT).text('3. Vereinfachtes Ertragswertverfahren (§199 BewG)', L, doc.y);
    doc.font('Helvetica').fontSize(9).fillColor(BLACK).text(
      `Kapitalisierungsfaktor ${mx(m.simplifiedIncome.factor)}: ${eur(m.simplifiedIncome.value)}. ${m.simplifiedIncome.note}`,
      L, doc.y, PROSE(9));

    // ── Werblicher Abschluss-Block: „Ihr nächster Schritt" ───────────────────
    doc.moveDown(0.6);
    doc.x = L;
    const ctaY = doc.y;
    const ctaH = 82;
    doc.rect(L, ctaY, PAGE_W, ctaH).fillAndStroke(NAVY, NAVY);
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#fff').text('Ihr nächster Schritt: eine belastbare Bewertung', L + 16, ctaY + 11, { width: PAGE_W - 32 });
    doc.font('Helvetica').fontSize(8.7).fillColor('rgba(255,255,255,0.88)').text(
      'Dieser Quick-Check ist der Anfang. Für einen am Markt durchsetzbaren Preis ermitteln wir mit Ihnen eine fundierte Bewertung, bereiten Zahlen und Equity-Story professionell auf und begleiten Sie diskret bis zum Abschluss. Sprechen Sie uns unverbindlich an — wir stehen Ihnen gern persönlich zur Verfügung.',
      L + 16, ctaY + 28, { width: PAGE_W - 32, align: 'justify', lineGap: 2.5 });
    doc.font('Helvetica-Bold').fontSize(8.3).fillColor(STEEL).text(
      'Phalanx GmbH  ·  Helene-Lange-Straße 28, 91056 Erlangen  ·  neusser@phalanx.de  ·  www.capitalmatch.de',
      L + 16, ctaY + ctaH - 15, { width: PAGE_W - 32 });
    doc.x = L; doc.y = ctaY + ctaH + 10;

    // ── Disclaimer (mit DUB-Quelle) ──────────────────────────────────────────
    const dBoxY = doc.y;
    const dText = `${result.disclaimer} Quelle der Branchen-Multiples: ${result.multipleSource}. Der Kapitalisierungsfaktor 13,75 (§199 BewG) liefert lediglich einen steuerlichen Vergleichswert. Für eine belastbare Bewertung (z. B. nach IDW S1) und die Ermittlung eines am Markt durchsetzbaren Preises sprechen Sie uns gern an.`;
    doc.font('Helvetica').fontSize(8);
    const dTextH = doc.heightOfString(dText, { width: PAGE_W - 24, lineGap: 1.5 });
    const dBoxH = dTextH + 26;
    doc.rect(L, dBoxY, PAGE_W, dBoxH).fillAndStroke(LIGHT, '#bfdbfe');
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor(NAVY).text('Wichtiger Hinweis', L + 12, dBoxY + 8);
    doc.font('Helvetica').fontSize(8).fillColor(GRAY).text(dText, L + 12, dBoxY + 20, { width: PAGE_W - 24, align: 'justify', lineGap: 1.5 });

    // ── Footer je Seite ──────────────────────────────────────────────────────
    const range = doc.bufferedPageRange();
    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(range.start + i);
      const old = doc.page.margins.bottom; doc.page.margins.bottom = 0;
      const pb = doc.page.height - 34;
      doc.rect(0, pb, doc.page.width, 34).fill(NAVY);
      doc.font('Helvetica').fontSize(7.5).fillColor('rgba(255,255,255,0.65)')
        .text(`CapitalMatch · eine Marke der Phalanx GmbH · Indikative Bewertung · ${dateStr} · Seite ${i + 1}/${range.count}`, L, pb + 12, { width: PAGE_W, align: 'center', lineBreak: false });
      doc.page.margins.bottom = old;
    }
    doc.end();
  });
}

module.exports = { generateValuationReport };
