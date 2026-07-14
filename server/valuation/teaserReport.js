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
    const stampStr = new Date(date).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

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
    doc.y += 24; doc.x = L;
    // Sichtbarer Audit-Stempel: wann und für wen erzeugt
    if (recipient) {
      doc.font('Helvetica').fontSize(7).fillColor(GRAY)
        .text(`Erstellt am ${stampStr} Uhr · heruntergeladen von ${recipient.name || 'k. A.'}${recipient.email ? ' (' + recipient.email + ')' : ''}`, L, doc.y, { width: PAGE_W, align: 'center' });
      doc.y += 12;
    }
    doc.x = L;

    // Titel
    doc.font('Helvetica-Bold').fontSize(19).fillColor(NAVY).text(project.codename || 'Mandat', L, doc.y);
    doc.moveDown(0.2);
    doc.font('Helvetica').fontSize(9.5).fillColor(GRAY)
      .text([isStartup ? 'Startup-Finanzierung' : 'M&A / Nachfolge', project.industry, project.region].filter(Boolean).join('  ·  '), L, doc.y, { width: PAGE_W });
    doc.moveDown(0.7);

    // ── Eckdaten-Grid: DYNAMISCH vermessen (Label über Wert) ───────────────
    // Feste Zeilenhöhen führten bei langen Werten (z. B. „Ø EBITDA-Marge 9,5 %
    // (2021–24)") zu Überlappungen. Jede Zelle wird jetzt gemessen.
    const nb = (t) => String(t == null ? '' : t).replace(/(\d)\s+(%|€|Mio\.|Mrd\.)/g, '$1 $2');
    const facts = isStartup
      ? [['Branche', project.industry], ['Region', project.region], ['Runde', project.investment_needed], ['Investoren-Stake', project.equity_stake], ['Post-Money', project.post_money_valuation], ['Deal-Typ', project.deal_type]]
      : [['Branche', project.industry], ['Region', project.region], ['Umsatzband', project.revenue_band], ['Operatives Ergebnis', project.ebitda_band], ['Deal-Typ', project.deal_type], ['Standort', project.location_city || project.region]];
    const shown = facts.filter(([, v]) => v != null && String(v).trim() !== '');

    const GAP = 16, PAD = 7;
    const colW = (PAGE_W - GAP) / 2;
    const innerW = colW - PAD * 2;
    const labelH = (l) => { doc.font('Helvetica').fontSize(7.2); return doc.heightOfString(String(l).toUpperCase(), { width: innerW }); };
    const valueH = (v) => { doc.font('Helvetica-Bold').fontSize(9); return doc.heightOfString(nb(v), { width: innerW, lineGap: 1 }); };
    const cellH = (f) => (f ? PAD + labelH(f[0]) + 2 + valueH(f[1]) + PAD : 0);

    for (let i = 0; i < shown.length; i += 2) {
      const pair = [shown[i], shown[i + 1]];
      const rowH = Math.max(24, cellH(pair[0]), cellH(pair[1]));
      const rowY = doc.y;
      pair.forEach((f, c) => {
        if (!f) return;
        const x = L + c * (colW + GAP);
        doc.rect(x, rowY, colW, rowH).fillAndStroke(LIGHT, '#DDE8F3');
        const lh = labelH(f[0]);
        doc.font('Helvetica').fontSize(7.2).fillColor(GRAY).text(String(f[0]).toUpperCase(), x + PAD, rowY + PAD, { width: innerW });
        doc.font('Helvetica-Bold').fontSize(9).fillColor(NAVY).text(nb(f[1]), x + PAD, rowY + PAD + lh + 2, { width: innerW, lineGap: 1 });
      });
      doc.y = rowY + rowH + 5; doc.x = L;
    }
    doc.moveDown(0.3);

    // ── One-Pager-Budget: was noch auf die Seite passt ──────────────────────
    // Unterkante minus Platz für die CTA-Box (60) und etwas Luft.
    const CTA_H = 58;
    const bottomLimit = doc.page.height - 104 - CTA_H - 14;
    const fits = (h) => doc.y + h <= bottomLimit;

    // Kurzbeschreibung (bei Bedarf sauber am Satzende gekürzt)
    if (project.short_description) {
      doc.font('Helvetica-Bold').fontSize(10.5).fillColor(NAVY).text('Kurzbeschreibung', L, doc.y);
      doc.moveDown(0.25);
      let text = String(project.short_description).trim();
      doc.font('Helvetica').fontSize(9.2);
      const avail = bottomLimit - doc.y - 8;
      if (doc.heightOfString(text, { width: PAGE_W, lineGap: 2.5 }) > avail) {
        // schrittweise am Satzende kürzen, statt mitten im Wort abzuschneiden
        const sentences = text.split(/(?<=\.)\s+/);
        let acc = '';
        for (const s of sentences) {
          const next = acc ? `${acc} ${s}` : s;
          if (doc.heightOfString(next, { width: PAGE_W, lineGap: 2.5 }) > avail) break;
          acc = next;
        }
        text = acc || text.slice(0, 400) + '…';
      }
      doc.fillColor(BLACK).text(text, L, doc.y, { width: PAGE_W, align: 'justify', lineGap: 2.5 });
      doc.moveDown(0.45);
    }

    // Highlights: nur so viele, wie auf die Seite passen (max. 6)
    const highlights = (Array.isArray(project.highlights) ? project.highlights : []).slice(0, 6);
    if (highlights.length && fits(30)) {
      doc.font('Helvetica-Bold').fontSize(10.5).fillColor(NAVY).text('Investment-Highlights', L, doc.y);
      doc.moveDown(0.25);
      for (const h of highlights) {
        doc.font('Helvetica').fontSize(9.2);
        const hh = doc.heightOfString(nb(h), { width: PAGE_W - 14, lineGap: 1.5 });
        if (!fits(hh + 4)) break;                 // Rest weglassen → One-Pager bleibt gewahrt
        const yy = doc.y;
        doc.circle(L + 3, yy + 5, 2).fill(STEEL);
        doc.font('Helvetica').fontSize(9.2).fillColor(BLACK).text(nb(h), L + 14, yy, { width: PAGE_W - 14, lineGap: 1.5 });
        doc.y = yy + hh + 3; doc.x = L;
      }
      doc.moveDown(0.3);
    }

    // CTA-Box immer an den unteren Rand setzen → sauberer One-Pager
    doc.y = Math.max(doc.y, bottomLimit);

    // Kontakt-/CTA-Box
    doc.x = L;
    const ctaY = doc.y, ctaH = CTA_H;
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
