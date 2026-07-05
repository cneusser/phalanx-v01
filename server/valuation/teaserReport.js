// ─────────────────────────────────────────────────────────────────────────────
// Teaser-PDF (anonymes Kurzprofil) in Phalanx-CI, mit Briefbogen-Footer,
// Vertraulichkeits-Markierung und Empfänger-Wasserzeichen (Audit-tauglich).
// ─────────────────────────────────────────────────────────────────────────────
const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');
const { drawCompanyFooter } = require('../utils/pdfFooter');

const NAVY = '#0D2A4A', STEEL = '#5B8FC9', GRAY = '#555555', BLACK = '#1A1A1A', LIGHT = '#EDF4FA';
const LOGO = path.join(__dirname, '..', 'assets', 'phalanx-mark.png');

function generateTeaserReport(opts) {
  const { project = {}, recipient, date = new Date() } = opts;
  const isStartup = project.mandate_type === 'fundraising';
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', bufferPages: true,
      margins: { top: 56, bottom: 96, left: 64, right: 64 },
      info: { Title: `Kurzprofil ${project.codename || ''}`, Author: 'Phalanx GmbH', Creator: 'CapitalMatch' } });
    const buffers = [];
    doc.on('data', b => buffers.push(b));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    const L = 64, PAGE_W = doc.page.width - 128, R = L + PAGE_W;
    const dateStr = new Date(date).toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' });

    // Briefkopf
    let lb = 56;
    if (fs.existsSync(LOGO)) { const lw = 80; doc.image(LOGO, L, 46, { width: lw }); lb = 46 + lw * (545 / 648); }
    doc.font('Helvetica-Bold').fontSize(12).fillColor(NAVY).text('CapitalMatch', L, 52, { width: PAGE_W, align: 'right' });
    doc.font('Helvetica').fontSize(9).fillColor(GRAY).text('Anonymes Kurzprofil (Teaser)', L, 70, { width: PAGE_W, align: 'right' });
    doc.font('Helvetica').fontSize(9).fillColor(GRAY).text(dateStr, L, 84, { width: PAGE_W, align: 'right' });
    doc.font('Helvetica-Oblique').fontSize(8).fillColor(STEEL).text('Werte sichern. Wachstum finanzieren. Weitblick etablieren.', L, lb + 4, { width: PAGE_W });
    const yr = Math.max(lb + 14, 118);
    doc.moveTo(L, yr).lineTo(R, yr).strokeColor(NAVY).lineWidth(1.4).stroke();
    doc.y = yr + 14;

    // Vertraulichkeits-Markierung
    doc.rect(L, doc.y, PAGE_W, 20).fillAndStroke('#FEF3C7', '#FCD34D');
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#92400E')
      .text('ÖFFENTLICHES KURZPROFIL · VERTRAULICH BEHANDELN · KEINE WEITERGABE OHNE ZUSTIMMUNG', L, doc.y + 6, { width: PAGE_W, align: 'center' });
    doc.y += 30; doc.x = L;

    // Titel
    doc.font('Helvetica-Bold').fontSize(19).fillColor(NAVY).text(project.codename || 'Mandat', L, doc.y);
    doc.moveDown(0.2);
    doc.font('Helvetica').fontSize(9.5).fillColor(GRAY)
      .text([isStartup ? 'Startup-Finanzierung' : 'M&A / Nachfolge', project.industry, project.region].filter(Boolean).join('  ·  '), L, doc.y, { width: PAGE_W });
    doc.moveDown(0.7);

    // Eckdaten-Grid
    const facts = isStartup
      ? [['Branche', project.industry], ['Region', project.region], ['Runde', project.investment_needed], ['Investoren-Stake', project.equity_stake], ['Post-Money', project.post_money_valuation], ['Deal-Typ', project.deal_type]]
      : [['Branche', project.industry], ['Region', project.region], ['Umsatzband', project.revenue_band], ['EBITDA-Band', project.ebitda_band], ['Deal-Typ', project.deal_type], ['Standort', project.location_city || project.region]];
    const shown = facts.filter(([, v]) => v != null && String(v).trim() !== '');
    const colW = (PAGE_W - 16) / 2;
    for (let i = 0; i < shown.length; i += 2) {
      const rowY = doc.y;
      [shown[i], shown[i + 1]].forEach((f, c) => {
        if (!f) return;
        const x = L + c * (colW + 16);
        doc.rect(x, rowY, colW, 24).fillAndStroke(LIGHT, '#DDE8F3');
        doc.font('Helvetica').fontSize(7.5).fillColor(GRAY).text(String(f[0]).toUpperCase(), x + 8, rowY + 5, { width: colW - 100 });
        doc.font('Helvetica-Bold').fontSize(9.5).fillColor(NAVY).text(String(f[1]), x + colW - 160, rowY + 7, { width: 152, align: 'right' });
      });
      doc.y = rowY + 30; doc.x = L;
    }
    doc.moveDown(0.4);

    // Kurzbeschreibung
    if (project.short_description) {
      doc.font('Helvetica-Bold').fontSize(11).fillColor(NAVY).text('Kurzbeschreibung', L, doc.y);
      doc.moveDown(0.3);
      doc.font('Helvetica').fontSize(9.5).fillColor(BLACK).text(String(project.short_description), L, doc.y, { width: PAGE_W, align: 'justify', lineGap: 3 });
      doc.moveDown(0.6);
    }

    // Highlights
    const highlights = Array.isArray(project.highlights) ? project.highlights : [];
    if (highlights.length) {
      doc.font('Helvetica-Bold').fontSize(11).fillColor(NAVY).text('Investment-Highlights', L, doc.y);
      doc.moveDown(0.3);
      highlights.forEach(h => {
        const yy = doc.y;
        doc.circle(L + 3, yy + 5, 2).fill(STEEL);
        doc.font('Helvetica').fontSize(9.5).fillColor(BLACK).text(String(h), L + 14, yy, { width: PAGE_W - 14, lineGap: 2 });
        doc.moveDown(0.25); doc.x = L;
      });
      doc.moveDown(0.4);
    }

    // Kontakt-/CTA-Box
    doc.x = L;
    const ctaY = doc.y, ctaH = 60;
    doc.rect(L, ctaY, PAGE_W, ctaH).fillAndStroke(NAVY, NAVY);
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#fff').text('Interesse? Vertrauliche Details nach NDA', L + 16, ctaY + 12, { width: PAGE_W - 32 });
    doc.font('Helvetica').fontSize(8.7).fillColor('rgba(255,255,255,0.88)').text(
      'Vollständige Unterlagen (Informationsmemorandum, Finanzen, Datenraum) stellen wir nach unterzeichneter Vertraulichkeitsvereinbarung bereit. Sprechen Sie uns an.',
      L + 16, ctaY + 30, { width: PAGE_W - 32, lineGap: 2 });
    doc.x = L; doc.y = ctaY + ctaH + 10;

    // Footer je Seite (Briefbogen) mit Empfänger-Markierung + dezentes Wasserzeichen
    const rTag = recipient ? `Erzeugt für ${recipient.name || ''}${recipient.email ? ' · ' + recipient.email : ''}` : 'Vertraulich';
    const range = doc.bufferedPageRange();
    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(range.start + i);
      if (recipient && (recipient.name || recipient.email)) {
        doc.save(); doc.rotate(-30, { origin: [doc.page.width / 2, doc.page.height / 2] });
        doc.font('Helvetica-Bold').fontSize(28).fillColor('#0D2A4A').opacity(0.05)
          .text(recipient.email || recipient.name, 0, doc.page.height / 2 - 20, { width: doc.page.width, align: 'center' });
        doc.opacity(1).restore();
      }
      const old = doc.page.margins.bottom; doc.page.margins.bottom = 0;
      drawCompanyFooter(doc, { L, pageWidth: PAGE_W, note: `${rTag} · CapitalMatch/Phalanx GmbH · ${dateStr} · Seite ${i + 1}/${range.count}` });
      doc.page.margins.bottom = old;
    }
    doc.end();
  });
}

module.exports = { generateTeaserReport };
