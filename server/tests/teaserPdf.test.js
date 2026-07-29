// Prüft die Teaser-/IM-Generierung (gültiges PDF) und die Standard-Ordnerliste.
const { generateTeaser, generateIM } = require('../utils/teaserPdf');
const { STANDARD_SAFE_FOLDERS, TEASER_FOLDER } = require('../utils/safeStructure');

let fail = 0;
const ok = (n, c) => { console.log((c ? '✓' : '✗ FAIL') + ' ' + n); if (!c) fail++; };

const project = {
  codename: 'Betongold', industry: 'Bauwirtschaft', region: 'DACH',
  revenue_band: '10-25 Mio', ebitda_band: '2-4 Mio', deal_type: 'Nachfolge',
  short_description: 'Etablierter Hersteller von Architekturbeton mit stabiler Kundenbasis.',
  highlights: ['Wiederkehrende Umsätze', 'Erfahrenes Team'],
};

(async () => {
  const isPdf = (b) => Buffer.isBuffer(b) && b.slice(0, 5).toString() === '%PDF-';
  const teaser = await generateTeaser(project);
  ok('Teaser ist ein PDF', isPdf(teaser));
  ok('Teaser hat Inhalt', teaser.length > 800);

  const im = await generateIM(project);
  ok('IM ist ein PDF', isPdf(im));
  ok('IM hat Inhalt', im.length > 800);

  // Robust auch ohne highlights (JSON-String / fehlend)
  const p2 = { ...project, highlights: '[]' };
  ok('Teaser ohne Highlights ok', isPdf(await generateTeaser(p2)));

  ok('Standardstruktur hat 9 Ordner', STANDARD_SAFE_FOLDERS.length === 9);
  ok('Teaser-Ordner ist erster', STANDARD_SAFE_FOLDERS[0] === TEASER_FOLDER);

  console.log(fail ? `\n${fail} FEHLER` : '\nAlle Tests grün');
  process.exit(fail ? 1 : 0);
})();
