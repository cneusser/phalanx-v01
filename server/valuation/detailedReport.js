// ─────────────────────────────────────────────────────────────────────────────
// Sprint 7 — Mehrseitiger PDF-Report der ausführlichen Bewertung (Phalanx-CI).
// Nutzt denselben Briefbogen-Stil wie der Quick-Check-Report (Sprint 6).
// ─────────────────────────────────────────────────────────────────────────────
const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');
const { drawCompanyFooter } = require('../utils/pdfFooter');

const NAVY = '#0D2A4A';
const ACCENT = '#1D4E89';
const STEEL = '#5B8FC9';
const GRAY = '#555555';
const BLACK = '#1A1A1A';
const LIGHT = '#EDF4FA';
const LOGO = path.join(__dirname, '..', 'assets', 'phalanx-mark.png');

const eur = (n) => (Math.round(Number(n) || 0)).toLocaleString('de-DE') + ' €';
const mx = (n) => Number(n).toLocaleString('de-DE', { maximumFractionDigits: 2 });
const pct = (n) => Number(n).toLocaleString('de-DE', { maximumFractionDigits: 2 }) + ' %';

const SCORE_LABELS = {
  owner_dependence: 'Inhaberunabhängigkeit',
  customer_concentration: 'Kundenstreuung',
  second_level: 'Zweite Führungsebene / Team',
  market_position: 'Marktposition / Wettbewerb',
  cyclicality: 'Stabilität (geringe Zyklizität)',
  investment_backlog: 'Investitionslage (kein Stau)',
  digitalization: 'Digitalisierung / Prozessreife',
};
const SCORE_WORD = { '-2': 'sehr schwach', '-1': 'schwach', '0': 'neutral', '1': 'gut', '2': 'sehr gut' };

function generateDetailedReport(opts) {
  const { result, input = {}, company, name, date = new Date() } = opts;
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', bufferPages: true,
      margins: { top: 56, bottom: 92, left: 64, right: 64 },
      info: { Title: 'Ausführliche Unternehmensbewertung', Author: 'Phalanx GmbH', Creator: 'CapitalMatch' } });
    const buffers = [];
    doc.on('data', b => buffers.push(b));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    const L = 64, PAGE_W = doc.page.width - 128, R = L + PAGE_W;
    const pageBottom = doc.page.height - 100;
    const dateStr = new Date(date).toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' });
    const PROSE = (s) => ({ width: PAGE_W, align: 'justify', lineGap: Math.round(s * 0.5) });

    function letterhead() {
      let logoBottom = 56;
      if (fs.existsSync(LOGO)) { const lw = 80; doc.image(LOGO, L, 46, { width: lw }); logoBottom = 46 + lw * (545 / 648); }
      doc.font('Helvetica-Bold').fontSize(12).fillColor(NAVY).text('CapitalMatch', L, 52, { width: PAGE_W, align: 'right' });
      doc.font('Helvetica').fontSize(9).fillColor(GRAY).text('Ausführliche Unternehmensbewertung', L, 70, { width: PAGE_W, align: 'right' });
      doc.font('Helvetica').fontSize(9).fillColor(GRAY).text(dateStr, L, 84, { width: PAGE_W, align: 'right' });
      doc.font('Helvetica-Oblique').fontSize(8).fillColor(STEEL).text('Werte sichern. Wachstum finanzieren. Weitblick etablieren.', L, logoBottom + 4, { width: PAGE_W });
      const y = Math.max(logoBottom + 14, 118);
      doc.moveTo(L, y).lineTo(R, y).strokeColor(NAVY).lineWidth(1.4).stroke();
      doc.y = y + 14;
    }
    function ensure(h) { if (doc.y + h > pageBottom) { doc.addPage(); doc.y = 64; } doc.x = L; }
    function section(title) { ensure(46); doc.font('Helvetica-Bold').fontSize(12.5).fillColor(NAVY).text(title, L, doc.y); doc.moveDown(0.4); doc.x = L; }
    function kv(rows, boldLast) {
      rows.forEach(([k, v], i) => {
        const last = boldLast && i === rows.length - 1;
        doc.font(last ? 'Helvetica-Bold' : 'Helvetica').fontSize(9.5).fillColor(last ? NAVY : BLACK);
        const kh = doc.heightOfString(k, { width: PAGE_W - 150 });
        ensure(kh + 4); const yy = doc.y;
        doc.text(k, L, yy, { width: PAGE_W - 150 });
        doc.text(v, L + PAGE_W - 150, yy, { width: 150, align: 'right' });
        doc.y = yy + kh + 3; doc.x = L;   // Zeilenhöhe aus dem (ggf. umbrechenden) Label ableiten
      });
    }

    // ── Kopf + Kernaussage ────────────────────────────────────────────────────
    letterhead();
    doc.font('Helvetica-Bold').fontSize(16).fillColor(NAVY).text('Ausführliche Unternehmensbewertung', L, doc.y);
    doc.moveDown(0.25);
    doc.font('Helvetica').fontSize(9.5).fillColor(GRAY)
      .text([company ? `Unternehmen: ${company}` : null, name ? `Erstellt für: ${name}` : null, `Branche: ${result.industryLabel || '—'}`, result.sizeBand ? result.sizeBand.label : null].filter(Boolean).join('   ·   '), L, doc.y, { width: PAGE_W });
    doc.moveDown(0.55);
    doc.font('Helvetica').fontSize(9.5).fillColor(BLACK).text(
      'Diese indikative Bewertung kombiniert das EBIT-Multiplikatorverfahren (mit branchen-, größen- und qualitätsabhängigem Multiple), das vereinfachte Ertragswertverfahren (§199 BewG), einen ertragswertorientierten Ansatz mit risikogerechtem Kapitalisierungszins sowie einen Kapitaldienstfähigkeits-Check aus Käufersicht. Ergebnis ist ein Werte-Korridor, kein Punktwert.',
      L, doc.y, PROSE(9.5));
    doc.moveDown(0.6);

    // Werte-Korridor
    doc.font('Helvetica-Bold').fontSize(11.5).fillColor(NAVY).text('Werte-Korridor (Enterprise Value, indikativ)', L, doc.y);
    doc.moveDown(0.45);
    const c = result.corridor, boxW = (PAGE_W - 20) / 3;
    const boxes = [['Konservativ', c.conservative, LIGHT, NAVY], ['Basis', c.base, NAVY, '#fff'], ['Optimistisch', c.optimistic, LIGHT, NAVY]];
    const y0 = doc.y;
    boxes.forEach(([lbl, val, bg, fg], i) => {
      const x = L + i * (boxW + 10);
      doc.rect(x, y0, boxW, 56).fillAndStroke(bg, '#DDE8F3');
      doc.fillColor(fg === '#fff' ? 'rgba(255,255,255,0.75)' : GRAY).font('Helvetica-Bold').fontSize(8.5).text(lbl.toUpperCase(), x, y0 + 9, { width: boxW, align: 'center' });
      doc.fillColor(fg).font('Helvetica-Bold').fontSize(15).text(result.positive ? eur(val) : 'n. b.', x, y0 + 25, { width: boxW, align: 'center' });
    });
    doc.x = L; doc.y = y0 + 56 + 10;
    if (result.equity) { doc.font('Helvetica').fontSize(8.5).fillColor(GRAY).text(`Nach Abzug der Netto-Finanzschulden (${eur(result.netDebt)}) ergibt sich ein indikativer Equity Value von ca. ${eur(result.equity.base)} (Basis).`, L, doc.y, { width: PAGE_W }); doc.moveDown(0.3); }
    if (!result.positive) { doc.font('Helvetica').fontSize(9).fillColor('#92400e').text('Das bereinigte nachhaltige Ergebnis ist nicht positiv — ertragsorientierte Verfahren liefern hier keinen sinnvollen Wert. Bitte sprechen Sie uns für eine individuelle Einschätzung an.', L, doc.y, PROSE(9)); doc.moveDown(0.3); }
    doc.moveDown(0.4);

    // ── Bereinigungsrechnung ──────────────────────────────────────────────────
    const s = result.inputsSummary;
    section('1. Bereinigungsrechnung (nachhaltiges EBIT)');
    kv([
      ['Ø Umsatz (erfasste Jahre)', eur(s.avgRevenue)],
      ['Ø EBIT (erfasste Jahre)', eur(s.rawAvgEbit)],
      ['– kalkulatorisches GF-Gehalt', eur(s.ownerSalaryAdjustment)],
      ['– Einmaleffekte', eur(s.oneOffs)],
      ['+ Bereinigung Gesellschafter-Miete', eur(s.shareholderRentAddback)],
      ['= Bereinigtes nachhaltiges EBIT', eur(s.adjustedEbit)],
    ], true);
    doc.moveDown(0.5);

    // ── Scorecard ─────────────────────────────────────────────────────────────
    section('2. Qualitative Scorecard');
    doc.font('Helvetica').fontSize(8.7).fillColor(GRAY).text('Bewertung je Faktor von –2 (sehr schwach) bis +2 (sehr gut). Die Summe verschiebt das EBIT-Multiple und den Risikozuschlag.', L, doc.y, PROSE(8.7));
    doc.moveDown(0.3);
    const sc = input.scorecard || {};
    Object.keys(SCORE_LABELS).forEach(k => {
      ensure(15); const yy = doc.y; const v = Number(sc[k] || 0);
      doc.font('Helvetica').fontSize(9).fillColor(BLACK).text(SCORE_LABELS[k], L, yy, { width: PAGE_W - 130 });
      doc.font('Helvetica-Bold').fontSize(9).fillColor(v > 0 ? '#166534' : v < 0 ? '#991b1b' : GRAY).text(`${v > 0 ? '+' : ''}${v}  (${SCORE_WORD[String(v)]})`, L + PAGE_W - 130, yy, { width: 130, align: 'right' });
      doc.moveDown(0.12); doc.x = L;
    });
    ensure(16); doc.font('Helvetica-Bold').fontSize(9).fillColor(NAVY).text(`Scorecard-Summe: ${s.scorecardSum > 0 ? '+' : ''}${s.scorecardSum}`, L, doc.y, { width: PAGE_W, align: 'right' });
    doc.moveDown(0.5);

    // ── Verfahren ─────────────────────────────────────────────────────────────
    const m = result.methods;
    section('3. Angewandte Verfahren');
    doc.font('Helvetica-Bold').fontSize(9.5).fillColor(ACCENT).text('a) Multiplikatorverfahren (EBIT)', L, doc.y);
    doc.font('Helvetica').fontSize(9).fillColor(BLACK).text(
      `Branchen-Multiple-Band ${mx(m.multiple.band.min)}–${mx(m.multiple.band.max)}× (${result.sizeBand.label}). Scorecard-Anpassung ${m.multiple.scoreDelta >= 0 ? '+' : ''}${mx(m.multiple.scoreDelta)}×${m.multiple.sizeDiscount < 1 ? ', Größenabschlag –10 %' : ''}; angesetztes Multiple ${mx(m.multiple.chosenMultiple)}×. Enterprise Value: ${eur(m.multiple.value)} (Sensitivität ±1 Punkt: ${eur(m.multiple.valueLow)} – ${eur(m.multiple.valueHigh)}).`,
      L, doc.y, PROSE(9));
    doc.moveDown(0.3); ensure(40);
    doc.font('Helvetica-Bold').fontSize(9.5).fillColor(ACCENT).text('b) Ertragswert mit risikogerechtem Zins', L, doc.y);
    doc.font('Helvetica').fontSize(9).fillColor(BLACK).text(
      `Nachhaltiger Reinertrag (nach ~30 % Steuern) ${eur(m.income.netEarnings)}, kapitalisiert mit ${pct(m.income.capRate)} (Basiszins ${pct(m.income.baseRate)} + Marktrisiko ${pct(m.income.marketRisk)} + Risikozuschlag ${pct(m.income.riskPremium)} aus der Scorecard) ergibt einen Ertragswert von ${eur(m.income.value)}.`,
      L, doc.y, PROSE(9));
    doc.moveDown(0.3); ensure(30);
    doc.font('Helvetica-Bold').fontSize(9.5).fillColor(ACCENT).text('c) Vereinfachtes Ertragswertverfahren (§199 BewG)', L, doc.y);
    doc.font('Helvetica').fontSize(9).fillColor(BLACK).text(`Kapitalisierungsfaktor ${mx(m.simplifiedIncome.factor)}: ${eur(m.simplifiedIncome.value)}. ${m.simplifiedIncome.note}`, L, doc.y, PROSE(9));
    if (m.substance.value > 0) {
      doc.moveDown(0.3); ensure(30);
      doc.font('Helvetica-Bold').fontSize(9.5).fillColor(ACCENT).text('d) Substanzwert (Untergrenze)', L, doc.y);
      doc.font('Helvetica').fontSize(9).fillColor(BLACK).text(
        `Verkehrswerte ${eur(m.substance.assetValue)} abzüglich zugeordneter Schulden ${eur(m.substance.assetDebt)} = ${eur(m.substance.value)}.${m.substance.exceedsBase ? ' Hinweis: Der Substanzwert liegt über dem ertragsorientierten Basiswert — bei substanzstarken Unternehmen bildet er die realistische Untergrenze.' : ''}`,
        L, doc.y, PROSE(9));
    }
    doc.moveDown(0.5);

    // ── Kapitaldienstfähigkeit ────────────────────────────────────────────────
    const a = result.affordability;
    section('4. Kapitaldienstfähigkeit (Käufersicht)');
    doc.font('Helvetica').fontSize(8.7).fillColor(GRAY).text('Realitäts-Check: Lässt sich der Basis-Kaufpreis aus dem laufenden Ergebnis über die Finanzierungslaufzeit tragen?', L, doc.y, PROSE(8.7));
    doc.moveDown(0.25);
    kv([
      ['Finanzierbarer Kaufpreis (Näherung)', eur(a.financeablePrice)],
      ['Basis-Korridor (Enterprise Value)', eur(result.corridor.base)],
      ['Deckungsgrad (finanzierbar / Basis)', a.dscr != null ? mx(a.dscr) : '—'],
    ]);
    doc.moveDown(0.15); ensure(14);
    doc.font('Helvetica-Oblique').fontSize(8).fillColor(GRAY).text(`Annahme: ${a.buyerYears} Jahre Finanzierung, ${pct(a.buyerInterest)} Zins, freier Cashflow ${eur(a.freeCashForDebt)}.`, L, doc.y, { width: PAGE_W });
    doc.moveDown(0.3); ensure(24);
    const vColor = a.verdict === 'tragfähig' ? '#166534' : a.verdict === 'grenzwertig' ? '#92400e' : '#991b1b';
    doc.font('Helvetica-Bold').fontSize(9.5).fillColor(vColor).text(`Einschätzung: aus Käufersicht ${a.verdict}.`, L, doc.y, { width: PAGE_W });
    doc.moveDown(0.6);

    // ── Werblicher Abschluss + Disclaimer ─────────────────────────────────────
    ensure(96);
    const ctaY = doc.y, ctaH = 82;
    doc.rect(L, ctaY, PAGE_W, ctaH).fillAndStroke(NAVY, NAVY);
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#fff').text('Von der Bewertung zum Abschluss', L + 16, ctaY + 11, { width: PAGE_W - 32 });
    doc.font('Helvetica').fontSize(8.7).fillColor('rgba(255,255,255,0.88)').text(
      'Diese indikative Bewertung ist die Grundlage. Für einen am Markt durchsetzbaren Preis verproben wir die Annahmen, bereiten Zahlen und Equity-Story auf und begleiten Sie diskret durch den gesamten Verkaufs- oder Nachfolgeprozess. Sprechen Sie uns an — wir stehen Ihnen persönlich zur Verfügung.',
      L + 16, ctaY + 28, { width: PAGE_W - 32, align: 'justify', lineGap: 2.5 });
    doc.font('Helvetica-Bold').fontSize(8.3).fillColor(STEEL).text('Phalanx GmbH  ·  Helene-Lange-Straße 28, 91056 Erlangen  ·  neusser@phalanx.de  ·  www.capitalmatch.de', L + 16, ctaY + ctaH - 15, { width: PAGE_W - 32 });
    doc.x = L; doc.y = ctaY + ctaH + 10;

    ensure(70);
    const dText = `${result.disclaimer} Quelle der Branchen-Multiples: ${result.multipleSource}. Die verwendeten Zinssätze, Steuerquoten und Scorecard-Gewichte sind indikative Annahmen. Für eine belastbare Bewertung (z. B. nach IDW S1) und die Ermittlung eines am Markt durchsetzbaren Preises sprechen Sie uns gern an.`;
    doc.font('Helvetica').fontSize(8);
    const dH = doc.heightOfString(dText, { width: PAGE_W - 24, lineGap: 1.5 }) + 26;
    const dY = doc.y;
    doc.rect(L, dY, PAGE_W, dH).fillAndStroke(LIGHT, '#bfdbfe');
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor(NAVY).text('Wichtiger Hinweis', L + 12, dY + 8);
    doc.font('Helvetica').fontSize(8).fillColor(GRAY).text(dText, L + 12, dY + 20, { width: PAGE_W - 24, align: 'justify', lineGap: 1.5 });

    // ── Footer je Seite ───────────────────────────────────────────────────────
    const range = doc.bufferedPageRange();
    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(range.start + i);
      const old = doc.page.margins.bottom; doc.page.margins.bottom = 0;
      drawCompanyFooter(doc, { L, pageWidth: PAGE_W, note: `CapitalMatch · eine Marke der Phalanx GmbH · Ausführliche Bewertung (indikativ) · ${dateStr} · Seite ${i + 1}/${range.count}` });
      doc.page.margins.bottom = old;
    }
    doc.end();
  });
}

module.exports = { generateDetailedReport };
