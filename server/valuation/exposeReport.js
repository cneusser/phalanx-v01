// ─────────────────────────────────────────────────────────────────────────────
// Sprint 9 — Exposé-PDF (Phalanx-CI). Keyfacts-Grid + aktive Sektionen +
// optionaler Bewertungskorridor + Hero-Bild + Empfänger-Wasserzeichen.
// ─────────────────────────────────────────────────────────────────────────────
const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');
const { drawCompanyFooter } = require('../utils/pdfFooter');

const NAVY = '#0D2A4A', ACCENT = '#1D4E89', STEEL = '#5B8FC9', GRAY = '#555555', BLACK = '#1A1A1A', LIGHT = '#EDF4FA';
const LOGO = path.join(__dirname, '..', 'assets', 'phalanx-mark.png');

const eur = (n) => (Math.round(Number(n) || 0)).toLocaleString('de-DE') + ' €';

// Reihenfolge + Labels des DUB-Keyfacts-Rasters
const KEYFACT_ORDER = [
  ['country', 'Land'], ['region', 'Region'], ['industries', 'Branche(n)'],
  ['founding_year', 'Gründungsjahr'], ['legal_form', 'Rechtsform'], ['employees', 'Mitarbeiter'],
  ['locations', 'Standorte'], ['revenue_band', 'Umsatzband'], ['ebit_band', 'Operatives Ergebnis'],
  ['gf_availability', 'GF-Verfügbarkeit'], ['stake_offered', 'Abzugebender Anteil'],
  ['participation_type', 'Beteiligungsart'], ['price_band', 'Preisvorstellung'], ['purchase_modalities', 'Kaufpreismodalitäten'],
];

function generateExposeReport(opts) {
  const { project, keyfacts = {}, sections = [], recipient, corridor, heroBuffer, date = new Date() } = opts;
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', bufferPages: true,
      margins: { top: 56, bottom: 96, left: 64, right: 64 },
      info: { Title: `Exposé ${project?.codename || ''}`, Author: 'Phalanx GmbH', Creator: 'CapitalMatch' } });
    const buffers = [];
    doc.on('data', b => buffers.push(b));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    const L = 64, PAGE_W = doc.page.width - 128, R = L + PAGE_W;
    const pageBottom = doc.page.height - 104;
    const dateStr = new Date(date).toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' });
    const stampStr = new Date(date).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    const PROSE = (s) => ({ width: PAGE_W, align: 'justify', lineGap: Math.round(s * 0.5) });
    // Typografie: Zahl und Einheit nicht trennen (verhindert „60 \n %")
    const nb = (t) => String(t == null ? '' : t)
      .replace(/(\d)\s+(%|€|Mio\.|Mrd\.|Tsd\.|T€|k)/g, '$1 $2')
      .replace(/€\s+(\d)/g, '€ $1')
      .replace(/(\d)\s+(p\.\s?a\.)/g, '$1 $2');

    function letterhead() {
      let lb = 56;
      if (fs.existsSync(LOGO)) { const lw = 80; doc.image(LOGO, L, 46, { width: lw }); lb = 46 + lw * (545 / 648); }
      doc.font('Helvetica-Bold').fontSize(12).fillColor(NAVY).text('CapitalMatch', L, 52, { width: PAGE_W, align: 'right' });
      doc.font('Helvetica').fontSize(9).fillColor(GRAY).text('Vertrauliches Unternehmens-Exposé', L, 70, { width: PAGE_W, align: 'right' });
      doc.font('Helvetica').fontSize(9).fillColor(GRAY).text(dateStr, L, 84, { width: PAGE_W, align: 'right' });
      doc.font('Helvetica-Oblique').fontSize(8).fillColor(STEEL).text('Werte sichern. Wachstum finanzieren. Weitblick etablieren.', L, lb + 4, { width: PAGE_W });
      const y = Math.max(lb + 14, 118);
      doc.moveTo(L, y).lineTo(R, y).strokeColor(NAVY).lineWidth(1.4).stroke();
      doc.y = y + 14;
    }
    function ensure(h) { if (doc.y + h > pageBottom) { doc.addPage(); doc.y = 64; } doc.x = L; }
    // Überschrift nie allein am Seitenende: Platz für Titel + erste Zeilen sichern
    function section(title) { ensure(58); doc.font('Helvetica-Bold').fontSize(12.5).fillColor(NAVY).text(title, L, doc.y, { width: PAGE_W }); doc.moveDown(0.35); doc.x = L; }

    letterhead();
    // Titel
    doc.font('Helvetica-Bold').fontSize(18).fillColor(NAVY).text(project?.codename || 'Unternehmens-Exposé', L, doc.y);
    doc.moveDown(0.2);
    doc.font('Helvetica').fontSize(9.5).fillColor(GRAY).text('Anonymes Verkaufs-Exposé · vertraulich · nur für berechtigte Kaufinteressenten', L, doc.y, { width: PAGE_W });
    if (recipient) {
      doc.moveDown(0.2);
      doc.font('Helvetica').fontSize(7.5).fillColor(GRAY).text(`Erstellt am ${stampStr} Uhr · heruntergeladen von ${recipient.name || '—'}${recipient.email ? ' (' + recipient.email + ')' : ''}`, L, doc.y, { width: PAGE_W });
    }
    doc.moveDown(0.6);

    // Hero-Bild (optional)
    if (heroBuffer) {
      try { const h = 150; doc.image(heroBuffer, L, doc.y, { fit: [PAGE_W, h], align: 'center' }); doc.y += h + 12; doc.x = L; } catch {}
    }

    // ── Keyfacts-Grid (2 Spalten) — VOLLSTÄNDIG DYNAMISCH ────────────────────
    // Jede Zelle wird vor dem Zeichnen vermessen (heightOfString). Die Zeilenhöhe
    // ist das Maximum beider Spalten, Label und Wert stehen übereinander. Damit
    // brechen beliebig lange Werte sauber um, statt in die nächste Zeile zu laufen.
    section('Eckdaten');
    const facts = KEYFACT_ORDER.filter(([k]) => keyfacts[k] != null && String(keyfacts[k]).trim() !== '');
    const GAP = 16, PAD = 8, ROW_GAP = 6;
    const colW = (PAGE_W - GAP) / 2;
    const innerW = colW - PAD * 2;

    const labelH = (label) => {
      doc.font('Helvetica').fontSize(7.5);
      return doc.heightOfString(String(label).toUpperCase(), { width: innerW, characterSpacing: 0.3 });
    };
    const valueH = (value) => {
      doc.font('Helvetica-Bold').fontSize(9);
      return doc.heightOfString(nb(value), { width: innerW, lineGap: 1.5 });
    };
    const cellH = (f) => (f ? PAD + labelH(f[1]) + 3 + valueH(keyfacts[f[0]]) + PAD : 0);

    for (let i = 0; i < facts.length; i += 2) {
      const pair = [facts[i], facts[i + 1]];
      const rowH = Math.max(26, cellH(pair[0]), cellH(pair[1]));
      ensure(rowH + ROW_GAP);
      const rowY = doc.y;

      pair.forEach((f, c) => {
        if (!f) return;
        const x = L + c * (colW + GAP);
        // Beide Karten in identischer (gemessener) Zeilenhöhe → saubere Grundlinie
        doc.rect(x, rowY, colW, rowH).fillAndStroke(LIGHT, '#DDE8F3');
        const lh = labelH(f[1]);
        doc.font('Helvetica').fontSize(7.5).fillColor(GRAY)
          .text(String(f[1]).toUpperCase(), x + PAD, rowY + PAD, { width: innerW, characterSpacing: 0.3 });
        doc.font('Helvetica-Bold').fontSize(9).fillColor(NAVY)
          .text(nb(keyfacts[f[0]]), x + PAD, rowY + PAD + lh + 3, { width: innerW, lineGap: 1.5 });
      });

      doc.y = rowY + rowH + ROW_GAP; doc.x = L;
    }
    doc.moveDown(0.4);

    // Optionaler Bewertungskorridor
    if (corridor && corridor.base) {
      section('Indikative Kaufpreisvorstellung');
      doc.font('Helvetica').fontSize(9).fillColor(BLACK).text(
        `Auf Basis einer indikativen Bewertung liegt der Werte-Korridor (Enterprise Value) bei rund ${eur(corridor.conservative)} bis ${eur(corridor.optimistic)} (Basis: ${eur(corridor.base)}). Indikativ, kein IDW-S1-Gutachten; der endgültige Preis wird im Prozess verhandelt.`,
        L, doc.y, PROSE(9));
      doc.moveDown(0.5);
    }

    // Sektionen — pdfkit umbricht und paginiert den Fließtext automatisch
    for (const s of sections) {
      if (!s.enabled || !String(s.body || '').trim()) continue;
      section(s.title);
      doc.font('Helvetica').fontSize(9.5).fillColor(BLACK).text(nb(String(s.body).trim()), L, doc.y, PROSE(9.5));
      doc.moveDown(0.6);
    }

    // Disclaimer — Höhe messen, damit der Kasten nie über den Seitenrand läuft
    const dText = 'Dieses Exposé ist vertraulich und ausschließlich für den benannten Empfänger bestimmt. Eine Weitergabe an Dritte ist ohne schriftliche Zustimmung untersagt. Die Angaben beruhen auf Informationen des Mandanten; keine Gewähr für Vollständigkeit und Richtigkeit. Keine Anlage-, Rechts- oder Steuerberatung.';
    doc.font('Helvetica').fontSize(8);
    const dH = doc.heightOfString(dText, { width: PAGE_W - 24, lineGap: 1.5 }) + 30;
    ensure(dH + 8);
    const dY = doc.y;
    doc.rect(L, dY, PAGE_W, dH).fillAndStroke(LIGHT, '#bfdbfe');
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor(NAVY).text('Vertraulichkeitshinweis', L + 12, dY + 8);
    doc.font('Helvetica').fontSize(8).fillColor(GRAY).text(dText, L + 12, dY + 20, { width: PAGE_W - 24, align: 'justify', lineGap: 1.5 });

    // Footer je Seite — mit Empfänger-Wasserzeichen
    const rTag = recipient ? `Vertraulich · ${recipient.name || ''}${recipient.email ? ' · ' + recipient.email : ''}` : 'Vertraulich';
    const range = doc.bufferedPageRange();
    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(range.start + i);
      // dezentes diagonales Wasserzeichen
      if (recipient && (recipient.name || recipient.email)) {
        doc.save(); doc.rotate(-30, { origin: [doc.page.width / 2, doc.page.height / 2] });
        doc.font('Helvetica-Bold').fontSize(30).fillColor('#0D2A4A').opacity(0.05)
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

module.exports = { generateExposeReport, KEYFACT_ORDER };
