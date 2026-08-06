// Prüft das stichwortbasierte Schwärzen: Zielbegriff wird entfernt, Rest bleibt.
const PDFDocument = require('pdfkit');
const { redactPdf, countTerms, normTerms } = require('../utils/redact');

let fail = 0;
const ok = (n, c) => { console.log((c ? '✓' : '✗ FAIL') + ' ' + n); if (!c) fail++; };

function makePdf() {
  return new Promise((resolve) => {
    const chunks = []; const doc = new PDFDocument();
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.fontSize(11).text('Verkaeufer GEHEIM Betongold behaelt Wettbewerbsverbot.', 50, 60);
    doc.text('Kontakt GEHEIM Ende der Zeile.', 50, 90);
    doc.end();
  });
}

async function textOf(buf) {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(buf) }).promise;
  const c = await (await pdf.getPage(1)).getTextContent();
  return c.items.map((x) => x.str).join(' ');
}

(async () => {
  ok('normTerms filtert kurze/leere', normTerms([' ', 'a', 'ab', 'GEHEIM']).join(',') === 'ab,GEHEIM');

  const buf = await makePdf();
  const cnt = await countTerms(buf, ['GEHEIM', 'Betongold']);
  ok('Vorschau zählt GEHEIM zweimal', cnt.per_term.GEHEIM === 2);
  ok('Vorschau zählt Betongold einmal', cnt.per_term.Betongold === 1);

  const { buffer, hits } = await redactPdf(buf, ['GEHEIM']);
  ok('zwei Fundstellen geschwärzt', hits === 2);
  const t = await textOf(buffer);
  ok('GEHEIM ist entfernt', !t.includes('GEHEIM'));
  ok('Betongold bleibt erhalten', t.includes('Betongold'));

  console.log(fail ? `\n${fail} FEHLER` : '\nAlle Tests grün');
  process.exit(fail ? 1 : 0);
})();
