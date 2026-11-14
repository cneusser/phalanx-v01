// ─────────────────────────────────────────────────────────────────────────────
// Die Branchenliste auf Englisch, ohne die Werte anzufassen (v0.470)
//
// Die NACE-Liste war nur deutsch. Ein englischer Nutzer sah im Auswahlfeld
// "C28 – Maschinenbau", und das ist für eine Oberfläche, die sonst englisch
// ist, eine Lücke mitten im Hauptweg.
//
// Die Gefahr beim Übersetzen liegt nicht in der Sprache, sondern im Wert: Der
// gespeicherte Text IST die Kennung. Mandate, Suchprofile und die
// Taxonomie-Synonyme hängen an genau diesen Zeichenketten. Übersetzt wird
// deshalb nur die Anzeige. Diese Datei hält fest, dass das so bleibt.
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');

let fail = 0;
const ok = (n, c) => { console.log((c ? '✓' : '✗ FEHLER') + ' ' + n); if (!c) fail++; };

const wurzel = path.join(__dirname, '..', '..');
const quelle = fs.readFileSync(path.join(wurzel, 'client', 'src', 'constants', 'projectOptions.js'), 'utf8');

// Die Datei ist ein ES-Modul. Für die Prüfung wird sie in ein bewertbares
// Stück Code verwandelt, statt einen Baukasten dafür einzuführen.
const code = quelle
  .replace(/^export (const|function) /gm, '$1 ')
  .concat('\n;module.exports = { NACE_INDUSTRIES, NACE_FLAT, naceLabel, naceGruppe, naceListe, naceKennung };');
const modul = {};
// eslint-disable-next-line no-new-func
new Function('module', 'exports', code)(modul, {});
const { NACE_FLAT, naceLabel, naceGruppe, naceListe, naceKennung } = modul.exports;

console.log('\n── Die Kennung ──');
ok('sie wird vorn abgelesen', naceKennung('C28 – Maschinenbau') === 'C28');
ok('auch bei Spannen', naceKennung('C13–15 – Textilien, Bekleidung, Leder') === 'C13–15');
ok('auch ohne Zahl', naceKennung('B – Bergbau & Gewinnung von Steinen/Erden') === 'B');
ok('und ohne Kennung kommt nichts', naceKennung('Irgendwas') === null);

console.log('\n── Die Übersetzung ──');
ok('deutsch bleibt deutsch', naceLabel('C28 – Maschinenbau', 'de') === 'C28 – Maschinenbau');
ok('englisch wird englisch', naceLabel('C28 – Maschinenbau', 'en') === 'C28 – Mechanical engineering');
ok('die Kennung bleibt stehen', naceLabel('J62 – Software-Entwicklung & IT-Dienstleistungen', 'en').startsWith('J62 – '));
ok('eine Gruppe wird auch übersetzt', naceGruppe('C: Verarbeitendes Gewerbe', 'en') === 'C: Manufacturing');
ok('ein unbekannter Wert bleibt unverändert', naceLabel('Z99 – Erfunden', 'en') === 'Z99 – Erfunden');

console.log('\n── Vollständigkeit ──');
{
  const ohne = NACE_FLAT.filter((o) => naceLabel(o, 'en') === o);
  ok(`jede Zeile hat eine englische Fassung${ohne.length ? ': ' + ohne.join(' | ') : ''}`, ohne.length === 0);
  const gruppen = naceListe('en');
  const gruppenOhne = gruppen.filter((g) => /Gewerbe|Landwirtschaft|Handel, Logistik|Finanzen &|Unternehmensdienst|Bildung, Gesundheit|Information &|Energie, Ver/.test(g.group));
  ok('jede Gruppe ebenso', gruppenOhne.length === 0);
}

console.log('\n── Der Wert bleibt der Wert ──');
{
  const liste = naceListe('en');
  const werte = liste.flatMap((g) => g.options.map((o) => o.wert));
  ok('die englische Liste trägt dieselben Werte', JSON.stringify(werte) === JSON.stringify(NACE_FLAT));
  ok('und zeigt daneben die Beschriftung', liste[1].options[0].label !== liste[1].options[0].wert);
}

console.log('\n── Die Oberfläche nutzt es ──');
{
  const lies = (...p) => fs.readFileSync(path.join(wurzel, ...p), 'utf8');
  const select = lies('client', 'src', 'components', 'GroupedSelect.jsx');
  ok('das Auswahlfeld übersetzt die Anzeige', /naceLabel\(o, lang\)/.test(select));
  ok('speichert aber den Wert', /<option key=\{o\} value=\{o\}>/.test(select));
  ok('auch "Bitte wählen" ist übersetzbar', /allgemein\.bitte_waehlen/.test(select));
  for (const seite of ['ProjectDetail.jsx', 'Projects.jsx', 'Landing.jsx']) {
    ok(`${seite} zeigt die Branche übersetzt`, /naceLabel\(/.test(lies('client', 'src', 'pages', seite)));
  }
  ok('die neuen Schlüssel stehen im Wörterbuch',
    /'allgemein\.bitte_waehlen'/.test(lies('client', 'src', 'i18n', 'index.jsx')));
}

console.log(fail ? `\n${fail} Fehler` : '\nAlles grün');
process.exit(fail ? 1 : 0);
