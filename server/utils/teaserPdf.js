// ─────────────────────────────────────────────────────────────────────────────
// Fallback-Generator für Teaser und Investment Memorandum als PDF.
// Wird nur genutzt, wenn kein Master-PDF im Safe hinterlegt ist. Erzeugt ein
// schlichtes, markenkonformes Dokument (Phalanx-Navy) aus den Mandatsdaten.
// Die Personalisierung (Name/E-Mail/Datum) geschieht beim Download per Wasserzeichen.
// ─────────────────────────────────────────────────────────────────────────────
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');

const NAVY = rgb(0.09, 0.13, 0.24);
const STEEL = rgb(0.16, 0.67, 0.89);
const GREY = rgb(0.35, 0.40, 0.46);

function wrap(text, font, size, maxWidth) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (font.widthOfTextAtSize(test, size) > maxWidth && line) { lines.push(line); line = w; }
    else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

async function buildDoc(project, { title, subtitle, sections }) {
  const doc = await PDFDocument.create();
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const reg = await doc.embedFont(StandardFonts.Helvetica);
  const A4 = [595.28, 841.89];

  let page = doc.addPage(A4);
  const [W, H] = A4;
  const M = 56;
  let y = H - M;

  // Kopf-Balken
  page.drawRectangle({ x: 0, y: H - 96, width: W, height: 96, color: NAVY });
  page.drawText('CapitalMatch', { x: M, y: H - 46, size: 16, font: bold, color: rgb(1, 1, 1) });
  page.drawText('powered by Phalanx', { x: M, y: H - 66, size: 9, font: reg, color: rgb(0.7, 0.8, 0.9) });
  page.drawText(String(title).toUpperCase(), { x: M, y: H - 86, size: 9, font: bold, color: STEEL });
  y = H - 130;

  page.drawText(project.codename || 'Mandat', { x: M, y, size: 24, font: bold, color: NAVY });
  y -= 22;
  if (subtitle) { page.drawText(subtitle, { x: M, y, size: 11, font: reg, color: GREY }); y -= 26; }

  const ensure = (need) => {
    if (y - need < M) { page = doc.addPage(A4); y = H - M; }
  };

  for (const s of sections) {
    ensure(40);
    page.drawText(s.h, { x: M, y, size: 12, font: bold, color: NAVY });
    page.drawRectangle({ x: M, y: y - 5, width: 34, height: 2, color: STEEL });
    y -= 20;
    const lines = wrap(s.body || 'k. A.', reg, 10.5, W - 2 * M);
    for (const ln of lines) { ensure(16); page.drawText(ln, { x: M, y, size: 10.5, font: reg, color: rgb(0.15, 0.18, 0.22) }); y -= 15; }
    y -= 12;
  }

  // Fuß
  const firstPage = doc.getPages()[0];
  firstPage.drawText('Vertraulich. Nur zur Verwendung durch den benannten Empfänger. Keine Weitergabe an Dritte.', {
    x: M, y: 30, size: 8, font: reg, color: GREY,
  });
  return Buffer.from(await doc.save());
}

function factsBlock(p) {
  const rows = [
    ['Branche', p.industry], ['Region', p.region],
    ['Umsatzband', p.revenue_band], ['EBITDA-Band', p.ebitda_band],
    ['Transaktionsart', p.deal_type], ['Standort', p.location_city],
  ].filter(([, v]) => v && String(v).trim() && v !== 'k. A.');
  return rows.map(([k, v]) => `${k}: ${v}`).join('   ·   ');
}

async function generateTeaser(project) {
  let highlights = [];
  try { highlights = Array.isArray(project.highlights) ? project.highlights : JSON.parse(project.highlights || '[]'); } catch { /* ignore */ }
  return buildDoc(project, {
    title: 'Teaser (anonymisiert)',
    subtitle: 'Anonymisierte Kurzvorstellung einer Transaktionsgelegenheit',
    sections: [
      { h: 'Eckdaten', body: factsBlock(project) },
      { h: 'Kurzprofil', body: project.short_description },
      { h: 'Highlights', body: highlights.length ? highlights.map((x) => `• ${x}`).join('\n') : 'Auf Anfrage.' },
      { h: 'Nächster Schritt', body: 'Bei Interesse zeichnen Sie die Vertraulichkeitsvereinbarung (NDA) über CapitalMatch. Anschließend erhalten Sie Zugriff auf das Investment Memorandum.' },
    ],
  });
}

async function generateIM(project) {
  let highlights = [];
  try { highlights = Array.isArray(project.highlights) ? project.highlights : JSON.parse(project.highlights || '[]'); } catch { /* ignore */ }
  return buildDoc(project, {
    title: 'Investment Memorandum',
    subtitle: 'Vertrauliche Unternehmensdarstellung',
    sections: [
      { h: '1. Überblick', body: project.short_description },
      { h: '2. Eckdaten', body: factsBlock(project) },
      { h: '3. Investment-Highlights', body: highlights.length ? highlights.map((x) => `• ${x}`).join('\n') : 'Werden im Rahmen der Gespräche erläutert.' },
      { h: '4. Markt und Wettbewerb', body: 'Eine ausführliche Markt- und Wettbewerbsdarstellung ist Teil des Datenraums.' },
      { h: '5. Finanzprofil', body: 'Historische Zahlen (GuV, Bilanz, Cashflow) sowie die Planung liegen im Datenraum unter „Wirtschaftliche Entwicklung".' },
      { h: '6. Prozess und Kontakt', body: 'Der weitere Prozess (Datenraum, Management-Präsentation, LOI) wird durch Phalanx gesteuert. Rückfragen über CapitalMatch.' },
    ],
  });
}

module.exports = { generateTeaser, generateIM };
