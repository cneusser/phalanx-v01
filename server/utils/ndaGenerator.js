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

const NDA_DIR = path.join(__dirname, '../data/ndas');
if (!fs.existsSync(NDA_DIR)) fs.mkdirSync(NDA_DIR, { recursive: true });

/**
 * Generate a personalized NDA PDF.
 * @param {object} opts
 * @param {object} opts.buyer      - { first_name, last_name, company, position, email, address, city, country }
 * @param {object} opts.project    - { codename, industry, region }
 * @param {object} opts.advisor    - { name, contact, address, city } – defaults to Phalanx
 * @param {object} opts.signature  - { name, company, date } – filled if signed
 * @param {string} opts.courtVenue - Gerichtsstandort (default: München)
 * @returns {Promise<Buffer>}      - PDF as Buffer
 */
function generateNDA(opts) {
  const {
    buyer,
    project,
    advisor = {
      name: 'Phalanx M&A Advisory GmbH',
      contact: 'M&A Advisory Team',
      address: 'Musterstraße 1',
      city: '80331 München',
      country: 'Deutschland',
    },
    signature = null,
    courtVenue = 'München',
  } = opts;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
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

    const section = (num, title) => {
      doc.moveDown(0.6);
      doc.font('Helvetica-Bold').fontSize(10).fillColor(NAVY)
        .text(`${num}. ${title}`, { paragraphGap: 2 });
      doc.moveDown(0.2);
    };

    const body = (text) => {
      doc.font('Helvetica').fontSize(9).fillColor(BLACK)
        .text(text, { align: 'justify', lineGap: 2.5 });
    };

    const bullet = (text) => {
      doc.font('Helvetica').fontSize(9).fillColor(BLACK)
        .text(`\u2013  ${text}`, { indent: 12, lineGap: 2 });
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

    // ─── STATUS BADGE (signed) ───────────────────────────────────────────────
    if (signature) {
      doc.rect(72, doc.y, PAGE_W, 22)
        .fillAndStroke('#d1fae5', '#6ee7b7');
      doc.font('Helvetica-Bold').fontSize(9).fillColor('#065f46')
        .text(`✓  Online unterzeichnet durch ${signature.name} (${signature.company}) am ${signedStr}`, 80, doc.y - 18, { lineBreak: false });
      doc.moveDown(0.8);
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
      .text('Der Interessent und der Transaktionsberater werden nachfolgend gemeinsam die "Vertragsparteien" genannt.');

    doc.moveDown(0.4);
    hline(doc.y);
    doc.moveDown(0.5);

    // ─── PRÄAMBEL ─────────────────────────────────────────────────────────────
    doc.font('Helvetica-Bold').fontSize(10).fillColor(NAVY).text('Präambel');
    doc.moveDown(0.2);
    body(`Die Vertragsparteien beabsichtigen, Gespräche über das unter dem Projektnamen ${project.codename} genannte Mandat zu führen und sich untereinander vertrauliche Unterlagen und Informationen bereitzustellen. Der Transaktionsberater handelt hierbei als exklusiver M&A‑Berater für den Eigentümer und wurde vom Eigentümer und dem Zielunternehmen autorisiert, diese Vertraulichkeitsvereinbarung zugunsten des Eigentümers und des Zielunternehmens abzuschließen. Zweck dieser Vertraulichkeitsvereinbarung ist es, die vertraulichen Informationen beider Parteien vor unberechtigter Verwendung oder Veröffentlichung zu schützen.`);

    // ─── §1 ───────────────────────────────────────────────────────────────────
    section(1, 'Verpflichtung zur Vertraulichkeit');
    body('1.1  Die Vertragsparteien verpflichten sich gegenseitig, sämtliche verkörperten oder mündlich übermittelten Informationen und Erkenntnisse, die ihnen im Zusammenhang mit dem Projekt zugänglich gemacht werden, vertraulich zu behandeln, ausschließlich für das Projekt zu verwenden und nicht anderweitig zu nutzen, unabhängig davon, auf welchem Trägermedium die Informationen verkörpert sind.');
    doc.moveDown(0.3);
    body('1.2  Der Zugang zu vertraulichen Informationen wird auf solche Mitarbeiter, Organe und Berater beschränkt, die die Informationen im Rahmen ihrer Tätigkeit und zum Zweck des Projekts benötigen. Diese Personen sind zur Vertraulichkeit zu verpflichten, sofern eine gleichwertige berufsrechtliche Verschwiegenheitsverpflichtung nicht besteht.');
    doc.moveDown(0.3);
    body('1.3  Die Weitergabe vertraulicher Informationen an Geschäftsführer, Führungskräfte, Mitarbeiter, Berater, Gutachter, verbundene Gesellschaften oder Finanzierungspartner ist nur zulässig, wenn diese zuvor schriftlich und in mindestens gleichwertiger Weise zur Geheimhaltung verpflichtet wurden. Dies gilt nicht, soweit eine berufsrechtliche Pflicht zur Verschwiegenheit bereits besteht oder die Informationen im Zusammenhang mit dem Projekt zwingend offengelegt werden müssen.');
    doc.moveDown(0.3);
    body('1.4  Auf Verlangen der jeweils anderen Vertragspartei werden alle überlassenen vertraulichen Informationen und Unterlagen unverzüglich zurückgegeben oder vernichtet. Davon ausgenommen sind Unterlagen, deren Aufbewahrung aufgrund gesetzlicher Aufbewahrungspflichten oder interner Compliance‑ beziehungsweise IT‑Backup‑Regeln erforderlich ist.');

    // ─── §2 ───────────────────────────────────────────────────────────────────
    section(2, 'Ausnahmen von der Vertraulichkeit');
    body('Diese Vertraulichkeitsvereinbarung erstreckt sich nicht auf Informationen, die:');
    doc.moveDown(0.2);
    bullet('ohne Zutun der empfangenden Partei allgemein bekannt oder öffentlich zugänglich waren oder werden;');
    bullet('nach Offenlegung ohne Verletzung dieser Vertraulichkeitsvereinbarung veröffentlicht werden;');
    bullet('sich nachweislich bereits rechtmäßig im Besitz der empfangenden Partei befanden;');
    bullet('rechtmäßig von einem Dritten erhalten wurden;');
    bullet('von der empfangenden Partei unabhängig und ohne Nutzung vertraulicher Informationen entwickelt wurden; oder');
    bullet('aufgrund gesetzlicher, behördlicher oder gerichtlicher Anordnung offengelegt werden müssen.');

    // ─── §3 ───────────────────────────────────────────────────────────────────
    section(3, 'Anzeige bei Verlust');
    body('Der Verlust oder die unberechtigte Offenlegung vertraulicher Informationen ist der jeweils anderen Vertragspartei unverzüglich schriftlich anzuzeigen. Dies gilt auch bei Verlusten infolge Diebstahls oder ähnlicher Ereignisse.');

    // ─── §4 ───────────────────────────────────────────────────────────────────
    section(4, 'Unentgeltliche Überlassung');
    body('Die Überlassung vertraulicher Informationen erfolgt unentgeltlich.');

    // ─── §5 ───────────────────────────────────────────────────────────────────
    section(5, 'Laufzeit');
    body('Diese Vertraulichkeitsvereinbarung gilt für einen Zeitraum von zwei (2) Jahren ab Unterzeichnung durch den Interessenten. Sofern die Vertraulichkeitsvereinbarung online abgeschlossen wird, beginnt die Laufzeit mit dem Zugang der per E‑Mail übermittelten Vertragsexemplare beim Interessenten.');

    // ─── §6 ───────────────────────────────────────────────────────────────────
    section(6, 'Anwendbares Recht und Gerichtsstand');
    body(`Diese Vertraulichkeitsvereinbarung unterliegt dem Recht der Bundesrepublik Deutschland. Ausschließlicher Gerichtsstand für alle Streitigkeiten aus oder im Zusammenhang mit dieser Vereinbarung ist ${courtVenue}.`);

    // ─── §7 ───────────────────────────────────────────────────────────────────
    section(7, 'Haftungsbeschränkung und Nichtübertragbarkeit');
    body('Für den Fall eines Verstoßes gegen diese Vertraulichkeitsvereinbarung gelten die allgemeinen gesetzlichen Regelungen. Eine Haftung besteht nur für unmittelbare Schäden; Folgeschäden, entgangener Gewinn oder sonstige indirekte Schäden sind ausgeschlossen. Sämtliche Ansprüche können pro Verstoß nur einmal geltend gemacht werden. Rechte und Pflichten aus dieser Vertraulichkeitsvereinbarung sind nicht übertragbar.');

    // ─── §8 ───────────────────────────────────────────────────────────────────
    section(8, 'Salvatorische Klausel');
    body('Sollten einzelne Bestimmungen dieser Vertraulichkeitsvereinbarung unwirksam oder undurchführbar sein oder werden, bleibt die Wirksamkeit der übrigen Bestimmungen unberührt. Die Vertragsparteien werden die unwirksame oder undurchführbare Bestimmung durch eine wirksame Bestimmung ersetzen, die dem wirtschaftlichen Zweck der unwirksamen Bestimmung am nächsten kommt.');

    // ─── §9 ───────────────────────────────────────────────────────────────────
    section(9, 'Keine Verpflichtung zum Abschluss; Schriftform');
    body('Durch die Unterzeichnung dieser Vertraulichkeitsvereinbarung kommt keine Verpflichtung zum Abschluss einer Transaktion zustande. Der Prozess bleibt für die Vertragsparteien unverbindlich, und keine Partei ist verpflichtet, eine Transaktion abzuschließen. Diese Vertraulichkeitsvereinbarung stellt die vollständige Vereinbarung zwischen den Vertragsparteien dar. Mündliche Nebenabreden bestehen nicht. Änderungen und Ergänzungen dieser Vertraulichkeitsvereinbarung sowie Kündigungen bedürfen der Schriftform; die elektronische Form ist hierfür nicht ausreichend. Dies gilt auch für eine Änderung oder Aufhebung dieser Schriftformklausel.');

    // ─── §10 ──────────────────────────────────────────────────────────────────
    section(10, 'Wirksamkeit bei Online‑Abschluss');
    body('Wenn der Interessent diese Vertraulichkeitsvereinbarung online auf der Internetseite des Transaktionsberaters bestätigt, erkennt der Interessent die Verbindlichkeit dieser Vereinbarung auch ohne eigenhändige Unterschrift an. Der online erklärte Konsens hat für den Interessenten dieselbe rechtliche Wirkung wie eine handschriftliche Unterschrift und begründet eine rechtswirksame Vertraulichkeitsverpflichtung zwischen den Parteien.');

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
      // Signed box
      doc.rect(sig2X - 8, sigStartY - 8, sigColW + 8, 95)
        .fillAndStroke('#f0fdf4', '#86efac');
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#065f46')
        .text('✓ Online unterzeichnet', sig2X, sigStartY);
      doc.font('Helvetica').fontSize(8.5).fillColor(GRAY)
        .text(`Datum: ${signedStr}`, sig2X, doc.y);
      doc.moveDown(0.8);
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

    doc.y = sigStartY + 110;
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
      const pageBottom = doc.page.height - 38;
      doc.rect(0, pageBottom, doc.page.width, 38).fill('#14314F');
      doc.font('Helvetica').fontSize(7.5).fillColor('rgba(255,255,255,0.6)')
        .text(
          `Phalanx M&A Advisory GmbH  ·  Vertraulich  ·  Projekt: ${project.codename}  ·  Seite ${i + 1} von ${range.count}`,
          72, pageBottom + 14, { width: PAGE_W, align: 'center' }
        );
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
