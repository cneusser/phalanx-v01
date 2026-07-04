/**
 * NDA PDF Generator – Phalanx M&A Platform
 * Generates a filled-in, legally formatted NDA PDF using pdfkit.
 */

const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const NAVY  = '#14314F';
const GOLD  = '#A5C8E4';
const GRAY  = '#555555';
const LIGHT = '#EDF4FA';
const BLACK = '#1A1A1A';

// Persistenter Speicher: bevorzugt das Railway-Volume (RAILWAY_VOLUME_MOUNT_PATH
// wird automatisch gesetzt, sobald ein Volume am Service hängt). Sonst ENV
// NDA_DIR, sonst lokaler Ordner (Entwicklung). Verhindert, dass signierte
// NDA-PDFs bei jedem Deploy verloren gehen.
const NDA_DIR = process.env.NDA_DIR
  || (process.env.RAILWAY_VOLUME_MOUNT_PATH
        ? path.join(process.env.RAILWAY_VOLUME_MOUNT_PATH, 'ndas')
        : path.join(__dirname, '../data/ndas'));
if (!fs.existsSync(NDA_DIR)) fs.mkdirSync(NDA_DIR, { recursive: true });

// Standard-Vorlage als Fallback (DB-Vorlage hat Vorrang, siehe nda_templates)
const DEFAULT_TEMPLATE = require('../db/defaultNdaTemplate');

// Platzhalter ({{key}}) mit Werten füllen
function fillPlaceholders(text, vars) {
  return String(text || '').replace(/\{\{(\w+)\}\}/g, (_, key) => (vars[key] != null ? vars[key] : `{{${key}}}`));
}

/**
 * Generate a personalized NDA PDF.
 * @param {object} opts
 * @param {object} opts.buyer      - { first_name, last_name, company, position, email, address, city, country }
 * @param {object} opts.project    - { codename, industry, region }
 * @param {object} opts.template   - NDA-Vorlage { court_venue, advisor, preamble, sections } (Default: Standard-Vorlage)
 * @param {object} opts.signature  - { name, company, date } – filled if signed
 * @returns {Promise<Buffer>}      - PDF as Buffer
 */
function generateNDA(opts) {
  const {
    buyer,
    project,
    template = DEFAULT_TEMPLATE,
    signature = null,
  } = opts;

  const advisor = template.advisor || DEFAULT_TEMPLATE.advisor;
  const courtVenue = template.court_venue || 'München';
  const vars = {
    project_codename: project.codename,
    buyer_name: `${buyer.first_name} ${buyer.last_name}`,
    buyer_company: buyer.company || '',
    court_venue: courtVenue,
    advisor_name: advisor.name,
  };

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      bufferPages: true, // nötig für korrekte Fußzeilen/Seitenzählung auf allen Seiten
      margins: { top: 65, bottom: 65, left: 72, right: 72 },
      info: {
        Title: `NDA – Projekt ${project.codename}`,
        Author: advisor.name,
        Subject: 'Vertraulichkeitsvereinbarung',
        Keywords: 'NDA, Vertraulichkeit, M&A',
        Creator: 'Phalanx M&A Plattform',
      },
    });

    const buffers = [];
    doc.on('data', b => buffers.push(b));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    const PAGE_W = doc.page.width - 144; // content width
    const signedStr = signature
      ? new Date(signature.date).toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })
      : null;

    // ─── Helper functions ────────────────────────────────────────────────────

    const hline = (y, color = '#E0DDD6', w = PAGE_W) => {
      doc.moveTo(72, y).lineTo(72 + w, y).strokeColor(color).lineWidth(0.8).stroke();
    };

    // WICHTIG: x-Position immer auf 72 pinnen \u2014 pdfkit \u00fcbernimmt sonst die
    // x-Position des zuletzt positionierten Texts (Parteien-Spalten), wodurch
    // der gesamte Flie\u00dftext in der rechten Spaltenh\u00e4lfte landete.
    const section = (num, title) => {
      doc.moveDown(0.6);
      doc.font('Helvetica-Bold').fontSize(10).fillColor(NAVY)
        .text(`${num}. ${title}`, 72, doc.y, { width: PAGE_W, paragraphGap: 2 });
      doc.moveDown(0.2);
    };

    const body = (text) => {
      doc.font('Helvetica').fontSize(9).fillColor(BLACK)
        .text(text, 72, doc.y, { width: PAGE_W, align: 'justify', lineGap: 2.5 });
    };

    const bullet = (text) => {
      doc.font('Helvetica').fontSize(9).fillColor(BLACK)
        .text(`\u2013  ${text}`, 84, doc.y, { width: PAGE_W - 12, lineGap: 2 });
    };

    // ─── HEADER ──────────────────────────────────────────────────────────────
    doc.rect(0, 0, doc.page.width, 52).fill(NAVY);
    doc.fillColor('#fff').font('Helvetica-Bold').fontSize(13)
      .text('PHALANX', 72, 16, { continued: true })
      .font('Helvetica').fontSize(10).fillColor(GOLD)
      .text('  M&A Advisory Plattform');
    doc.font('Helvetica').fontSize(8.5).fillColor('rgba(255,255,255,0.7)')
      .text('Vertraulichkeitsvereinbarung', 72, 34);

    doc.y = 70;

    // ─── TITLE ───────────────────────────────────────────────────────────────
    doc.font('Helvetica-Bold').fontSize(14).fillColor(NAVY)
      .text('Beidseitige Vertraulichkeitsvereinbarung', { align: 'center' });
    doc.moveDown(0.2);
    doc.font('Helvetica').fontSize(10).fillColor(GRAY)
      .text(`für Interessenten zu Mandat/Projekt: ${project.codename}`, { align: 'center' });
    doc.moveDown(0.4);
    hline(doc.y);
    doc.moveDown(0.6);

    // ─── STATUS BADGE (signed) — überlappungsfrei positioniert ──────────────
    if (signature) {
      const badgeY = doc.y;
      doc.rect(72, badgeY, PAGE_W, 24).fillAndStroke('#d1fae5', '#6ee7b7');
      doc.font('Helvetica-Bold').fontSize(9).fillColor('#065f46')
        .text(`Online unterzeichnet durch ${signature.name}${signature.company ? ' (' + signature.company + ')' : ''} am ${signedStr}`,
          82, badgeY + 8, { width: PAGE_W - 20, lineBreak: false });
      doc.y = badgeY + 24 + 12;
    }

    // ─── PARTIES ─────────────────────────────────────────────────────────────
    doc.font('Helvetica-Bold').fontSize(11).fillColor(NAVY)
      .text('Vertragsparteien');
    doc.moveDown(0.3);

    // Two-column parties
    const colW = (PAGE_W - 20) / 2;
    const col1X = 72;
    const col2X = 72 + colW + 20;

    const startY = doc.y;

    // Left: Interessent
    doc.font('Helvetica-Bold').fontSize(9).fillColor(BLACK)
      .text(`${buyer.first_name} ${buyer.last_name}`, col1X, startY, { width: colW });
    doc.font('Helvetica').fontSize(8.5).fillColor(GRAY);
    if (buyer.company) doc.text(buyer.company, col1X, doc.y, { width: colW });
    if (buyer.address) doc.text(buyer.address, col1X, doc.y, { width: colW });
    if (buyer.city) doc.text(buyer.city, col1X, doc.y, { width: colW });
    doc.text(buyer.country || 'Deutschland', col1X, doc.y, { width: colW });
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor(NAVY)
      .text('(nachfolgend "Interessent")', col1X, doc.y, { width: colW });

    const leftBottom = doc.y;

    // Right: Berater
    doc.font('Helvetica-Bold').fontSize(9).fillColor(BLACK)
      .text(advisor.name, col2X, startY, { width: colW });
    doc.font('Helvetica').fontSize(8.5).fillColor(GRAY);
    doc.text(advisor.contact, col2X, doc.y, { width: colW });
    doc.text(advisor.address, col2X, doc.y, { width: colW });
    doc.text(advisor.city, col2X, doc.y, { width: colW });
    doc.text(advisor.country || 'Deutschland', col2X, doc.y, { width: colW });
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor(NAVY)
      .text('(nachfolgend "Transaktionsberater")', col2X, doc.y, { width: colW });

    const rightBottom = doc.y;
    doc.y = Math.max(leftBottom, rightBottom) + 6;
    doc.font('Helvetica').fontSize(8.5).fillColor(GRAY)
      .text('Der Interessent und der Transaktionsberater werden nachfolgend gemeinsam die "Vertragsparteien" genannt.', 72, doc.y, { width: PAGE_W });

    doc.moveDown(0.4);
    hline(doc.y);
    doc.moveDown(0.5);

    // ─── PRÄAMBEL (aus Vorlage, Platzhalter befüllt) ─────────────────────────
    doc.font('Helvetica-Bold').fontSize(10).fillColor(NAVY).text('Präambel');
    doc.moveDown(0.2);
    body(fillPlaceholders(template.preamble, vars));

    // ─── §§ aus der Vorlage ──────────────────────────────────────────────────
    (template.sections || []).forEach((sec, idx) => {
      section(idx + 1, fillPlaceholders(sec.title, vars));
      (sec.paragraphs || []).forEach((p, i) => {
        if (i > 0) doc.moveDown(0.3);
        body(fillPlaceholders(p, vars));
      });
      if (sec.bullets && sec.bullets.length) {
        doc.moveDown(0.2);
        sec.bullets.forEach(b => bullet(fillPlaceholders(b, vars)));
      }
    });

    // ─── NEW PAGE for signature ───────────────────────────────────────────────
    doc.addPage();

    // ─── SIGNATURE BLOCK ─────────────────────────────────────────────────────
    doc.font('Helvetica-Bold').fontSize(12).fillColor(NAVY)
      .text('Unterschriften', { align: 'center' });
    doc.moveDown(0.3);
    hline(doc.y);
    doc.moveDown(1.2);

    const sigColW = (PAGE_W - 30) / 2;
    const sig1X = 72;
    const sig2X = 72 + sigColW + 30;
    const sigStartY = doc.y;

    // Berater signature (left)
    doc.font('Helvetica').fontSize(8.5).fillColor(GRAY)
      .text('Ort, Datum', sig1X, sigStartY);
    doc.moveDown(2.5);
    hline(doc.y, '#999', sigColW);
    doc.moveDown(0.3);
    doc.font('Helvetica-Bold').fontSize(9).fillColor(NAVY)
      .text('Unterschrift Transaktionsberater', sig1X, doc.y, { width: sigColW });
    doc.font('Helvetica').fontSize(9).fillColor(BLACK)
      .text(advisor.name, sig1X, doc.y, { width: sigColW });

    // Interessent signature (right)
    if (signature) {
      // Signed box — mit visueller Unterschrift (Schreibschrift-Stil)
      doc.rect(sig2X - 8, sigStartY - 8, sigColW + 8, 120)
        .fillAndStroke('#f0fdf4', '#86efac');
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#065f46')
        .text('Online unterzeichnet', sig2X, sigStartY);
      doc.font('Helvetica').fontSize(8.5).fillColor(GRAY)
        .text(`Datum: ${signedStr}`, sig2X, doc.y);
      doc.moveDown(0.4);
      // Visuelle Unterschrift: Name in kursiver Serifenschrift über der Linie
      doc.font('Times-Italic').fontSize(20).fillColor('#0f3d2e')
        .text(signature.name, sig2X, doc.y, { width: sigColW });
      doc.moveDown(0.15);
      hline(doc.y, '#16a34a', sigColW);
      doc.moveDown(0.3);
      doc.font('Helvetica-Bold').fontSize(9).fillColor(NAVY)
        .text('Unterschrift Interessent (Online §10)', sig2X, doc.y, { width: sigColW });
      doc.font('Helvetica').fontSize(9).fillColor(BLACK)
        .text(signature.name, sig2X, doc.y, { width: sigColW });
      if (signature.company) doc.text(signature.company, sig2X, doc.y, { width: sigColW });
    } else {
      doc.font('Helvetica').fontSize(8.5).fillColor(GRAY)
        .text('Ort, Datum', sig2X, sigStartY);
      doc.y = sigStartY;
      doc.moveDown(2.5);
      hline(doc.y, '#999', sigColW);
      doc.y -= 0; // position after line
      doc.font('Helvetica-Bold').fontSize(9).fillColor(NAVY)
        .text('Unterschrift Interessent', sig2X, doc.y + 5, { width: sigColW });
      doc.font('Helvetica').fontSize(9).fillColor(BLACK)
        .text(`${buyer.first_name} ${buyer.last_name}`, sig2X, doc.y, { width: sigColW });
      if (buyer.company) doc.text(buyer.company, sig2X, doc.y, { width: sigColW });
    }

    doc.y = sigStartY + 130;
    doc.moveDown(1.5);
    hline(doc.y);
    doc.moveDown(0.8);

    // ─── AUDIT TRAIL BOX (only on signed copies) ─────────────────────────────
    if (signature) {
      doc.rect(72, doc.y, PAGE_W, signature.ip ? 70 : 52).fillAndStroke('#eff6ff', '#bfdbfe');
      const auditY = doc.y + 10;
      doc.font('Helvetica-Bold').fontSize(9).fillColor(NAVY)
        .text('Nachweis der Online-Unterzeichnung (Audit Trail)', 84, auditY);
      doc.font('Helvetica').fontSize(8.5).fillColor(GRAY);
      doc.text(`Unterzeichner:  ${signature.name}${signature.company ? ', ' + signature.company : ''}`, 84, doc.y);
      doc.text(`E-Mail:  ${buyer.email}`, 84, doc.y);
      doc.text(`Zeitstempel:  ${new Date(signature.date).toLocaleString('de-DE', { timeZone: 'Europe/Berlin' })} (MEZ/MESZ)`, 84, doc.y);
      if (signature.ip) doc.text(`IP-Adresse:  ${signature.ip}`, 84, doc.y);
      doc.text(`Projekt:  ${project.codename}  ·  Plattform: phalanx.de`, 84, doc.y);
      doc.y += 14;
    }

    // ─── FOOTER on every page ────────────────────────────────────────────────
    const range = doc.bufferedPageRange();
    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(range.start + i);
      // Unteren Seitenrand temporär aufheben, sonst legt pdfkit beim
      // Schreiben in die Fußzeile automatisch neue (leere) Seiten an
      const oldBottomMargin = doc.page.margins.bottom;
      doc.page.margins.bottom = 0;
      const pageBottom = doc.page.height - 38;
      doc.rect(0, pageBottom, doc.page.width, 38).fill('#14314F');
      doc.font('Helvetica').fontSize(7.5).fillColor('rgba(255,255,255,0.6)')
        .text(
          `${advisor.name}  ·  Vertraulich  ·  Projekt: ${project.codename}  ·  Seite ${i + 1} von ${range.count}`,
          72, pageBottom + 14, { width: PAGE_W, align: 'center', lineBreak: false }
        );
      doc.page.margins.bottom = oldBottomMargin;
    }

    doc.end();
  });
}

/**
 * Save NDA PDF to disk.
 * @returns {string} filename (not full path)
 */
async function saveNDA(opts) {
  const buffer = await generateNDA(opts);
  const ts = Date.now();
  const filename = `nda_${opts.project.codename.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${opts.buyer.id || 'user'}_${ts}.pdf`;
  const filepath = path.join(NDA_DIR, filename);
  fs.writeFileSync(filepath, buffer);
  return filename;
}

module.exports = { generateNDA, saveNDA, NDA_DIR };
