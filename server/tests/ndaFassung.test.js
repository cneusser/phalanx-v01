// ─────────────────────────────────────────────────────────────────────────────
// Eine Fassung, nicht zwei (v0.466)
//
// ── Was vorgefallen ist ─────────────────────────────────────────────────────
//
// Ein Interessent hat online unterzeichnet, danach das signierte PDF mit dem
// Unterzeichnungsdialog verglichen und drei Abweichungen gefunden:
//
//   · Vertragspartei im Dialog: „Phalanx M&A Advisory GmbH, München". Diese
//     Gesellschaft gibt es nicht.
//   · Die Präambel im PDF schliesst „zugunsten des Eigentümers und des
//     Zielunternehmens" ab; im Dialog fehlte das.
//   · § 1.3 (Weitergabe an Berater, Gutachter, verbundene Gesellschaften und
//     Finanzierungspartner) und § 7 standen im PDF ausführlicher.
//
// Er hatte in allen drei Punkten recht. Der Dialog trug seinen eigenen
// Vertragstext im Quelltext der Oberfläche, das PDF entstand aus der Vorlage
// in der Datenbank.
//
// ── Was diese Prüfungen festhalten ──────────────────────────────────────────
//
// Die wichtigste ist die erste: Im Quelltext der Oberfläche steht kein
// Vertragstext mehr. Keine Paragraphen, keine Vertragspartei, keine
// Laufzeit. Alles, was dort stünde, könnte wieder auseinanderlaufen, und
// zwar unbemerkt, denn niemand liest zwei Texte nebeneinander.
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');

let fail = 0;
const ok = (n, c) => { console.log((c ? '✓' : '✗ FEHLER') + ' ' + n); if (!c) fail++; };

const wurzel = path.join(__dirname, '..', '..');
const lies = (...p) => fs.readFileSync(path.join(wurzel, ...p), 'utf8');

const modal = lies('client', 'src', 'components', 'NDASignModal.jsx');
const routen = lies('server', 'routes', 'ndas.js');
const migration = lies('server', 'db', 'migrations', '20260901002030_nda_fassung_nachweis.js');
const vorlage = require('../db/defaultNdaTemplate');
const { fassung, alsText } = require('../utils/ndaFassung');

// ── 1. Kein Vertragstext in der Oberfläche ───────────────────────────────
console.log('\n── Kein zweiter Vertragstext ──');
ok('die erfundene Gesellschaft steht nirgends mehr', !/Phalanx M&A Advisory GmbH/.test(modal));
ok('es gibt keine eigene Paragraphenliste mehr', !/NDA_SECTIONS/.test(modal));
ok('kein Paragraphentext im Quelltext', !/Die Vertragsparteien verpflichten sich gegenseitig/.test(modal));
ok('keine eigene Präambel im Quelltext', !/handelt als exklusiver M&A/.test(modal));
ok('keine fest eingetragene Laufzeit in der Zusammenfassung', !/\['Laufzeit', '2 Jahre'\]/.test(modal));
ok('kein fest eingetragener Gerichtsstand', !/\['Gerichtsstand', 'München'\]/.test(modal));
ok('der Berater kommt aus der Fassung', /fassung\?\.parteien\.berater\.name/.test(modal));
ok('die Paragraphen kommen aus der Fassung', /fassung\?\.paragraphen \|\| \[\]/.test(modal));
ok('die Präambel ebenso', /\{fassung\?\.praeambel \|\| ''\}/.test(modal));

// Die ganze Oberfläche, nicht nur dieser Dialog.
console.log('\n── Und auch sonst nirgends ──');
{
  const dateien = [];
  const lauf = (ordner) => {
    for (const e of fs.readdirSync(ordner, { withFileTypes: true })) {
      const p = path.join(ordner, e.name);
      if (e.isDirectory()) lauf(p);
      else if (/\.jsx?$/.test(e.name)) dateien.push(p);
    }
  };
  lauf(path.join(wurzel, 'client', 'src'));
  const treffer = dateien.filter((f) => /Phalanx M&A Advisory/.test(fs.readFileSync(f, 'utf8')));
  ok(`keine Datei der Oberfläche nennt die erfundene Gesellschaft${treffer.length ? `: ${treffer.map((f) => path.basename(f)).join(', ')}` : ''}`,
    treffer.length === 0);
}

// ── 2. Die Fassung selbst ────────────────────────────────────────────────
console.log('\n── Die Fassung ──');
const f = fassung({
  vorlage: { ...vorlage, id: 7, version: 3 },
  kaeufer: { first_name: 'Fabian', last_name: 'Hinkel', company: 'Hinkel Invest', email: 'f@h.de' },
  mandat: { codename: 'FARADAY' },
});
ok('der richtige Berater steht drin', f.parteien.berater.name === 'Phalanx GmbH');
ok('mit der richtigen Anschrift', /Helene-Lange/.test(f.parteien.berater.strasse) && /91056/.test(f.parteien.berater.ort));
ok('Platzhalter sind gefüllt', f.praeambel.includes('FARADAY') && !f.praeambel.includes('{{'));
ok('die Präambel nennt den Eigentümer und das Zielunternehmen',
  /zugunsten des Eigentümers und des Zielunternehmens/.test(f.praeambel));
ok('die Paragraphen sind durchnummeriert', f.paragraphen[0].nummer === '§ 1' && f.paragraphen[6].nummer === '§ 7');
ok('§ 1.3 nennt die Finanzierungspartner',
  f.paragraphen[0].absaetze.some((a) => /Finanzierungspartner/.test(a)));
ok('§ 7 nennt die Beschränkung auf unmittelbare Schäden',
  /unmittelbare Schäden/.test(f.paragraphen[6].absaetze.join(' ')));
ok('der Gerichtsstand steht im Text, nicht nur im Feld',
  f.paragraphen.some((p) => p.absaetze.some((a) => a.includes(f.gerichtsstand))));
ok('die Vorlagenkennung wird mitgeführt', f.vorlage_id === 7 && f.version === 3);

console.log('\n── Der Fingerabdruck ──');
ok('er ist ein SHA-256', /^[0-9a-f]{64}$/.test(f.hash));
{
  const nochmal = fassung({
    vorlage: { ...vorlage, id: 7, version: 3 },
    kaeufer: { first_name: 'Fabian', last_name: 'Hinkel', company: 'Hinkel Invest', email: 'f@h.de' },
    mandat: { codename: 'FARADAY' },
  });
  ok('derselbe Text ergibt denselben Abdruck', nochmal.hash === f.hash);

  const geaendert = JSON.parse(JSON.stringify(vorlage));
  geaendert.sections[0].paragraphs[2] = geaendert.sections[0].paragraphs[2].replace('Finanzierungspartner', 'Dritte');
  const anders = fassung({
    vorlage: { ...geaendert, id: 7, version: 3 },
    kaeufer: { first_name: 'Fabian', last_name: 'Hinkel', company: 'Hinkel Invest', email: 'f@h.de' },
    mandat: { codename: 'FARADAY' },
  });
  ok('eine geänderte Klausel ändert den Abdruck', anders.hash !== f.hash);

  const andererBerater = JSON.parse(JSON.stringify(vorlage));
  andererBerater.advisor.name = 'Phalanx M&A Advisory GmbH';
  const b = fassung({
    vorlage: { ...andererBerater, id: 7, version: 3 },
    kaeufer: { first_name: 'Fabian', last_name: 'Hinkel', company: 'Hinkel Invest', email: 'f@h.de' },
    mandat: { codename: 'FARADAY' },
  });
  ok('eine andere Vertragspartei ändert ihn ebenfalls', b.hash !== f.hash);

  const andererKunde = fassung({
    vorlage: { ...vorlage, id: 7, version: 3 },
    kaeufer: { first_name: 'Anna', last_name: 'Berger', company: 'Berger GmbH', email: 'a@b.de' },
    mandat: { codename: 'FARADAY' },
  });
  ok('ein anderer Unterzeichner ergibt eine andere Fassung', andererKunde.hash !== f.hash);
}

console.log('\n── Der Wortlaut zum Nachlesen ──');
{
  const text = alsText(f);
  ok('er nennt beide Parteien', text.includes('Phalanx GmbH') && text.includes('Fabian Hinkel'));
  ok('er enthält die Präambel', text.includes('Präambel'));
  ok('und jeden Paragraphen', f.paragraphen.every((p) => text.includes(p.nummer)));
  ok('auch die Aufzählungen', text.includes('· '));
}

// ── 3. Unterschrieben wird nur, was angezeigt wurde ──────────────────────
console.log('\n── Nur das Angezeigte wird unterschrieben ──');
ok('es gibt eine Route für die Fassung', /router\.get\('\/:projectId\/fassung'/.test(routen));
ok('der Dialog holt sie dort', /\/ndas\/\$\{projectId\}\/fassung/.test(modal));
ok('und schickt den Abdruck beim Unterzeichnen mit', /fassung_hash: fassung \? fassung\.hash : null/.test(modal));
ok('ohne Abdruck wird nicht unterzeichnet', /FASSUNG_FEHLT/.test(routen));
ok('bei abweichendem Abdruck auch nicht', /FASSUNG_GEAENDERT/.test(routen));
ok('und die Abweichung wird protokolliert', /NDA_FASSUNG_ABWEICHUNG/.test(routen));
ok('die Meldung sagt, was zu tun ist', /Seite neu und lesen Sie die neue Fassung/.test(routen));
ok('ohne geladene Fassung geht es nicht weiter', /disabled=\{!scrolled \|\| !fassung\}/.test(modal));
ok('ein Ladefehler wird gezeigt statt verschwiegen', /fassungFehler &&/.test(modal));

console.log('\n── Der Nachweis ──');
ok('Abdruck, Fassungsnummer und Wortlaut werden gespeichert',
  /fassung_hash=\?/.test(routen) && /fassung_version=\?/.test(routen) && /fassung_text=\?/.test(routen));
ok('die Spalten gibt es', /fassung_hash/.test(migration) && /fassung_text/.test(migration));
ok('der Wortlaut wird mitgespeichert, nicht nur der Abdruck',
  /ndaFassung\.alsText\(geltend\)/.test(routen));
ok('und es ist begründet, warum', /stellt den Text[\s*]+aber nicht wieder her/.test(migration));

console.log(fail ? `\n${fail} Fehler` : '\nAlles grün');
process.exit(fail ? 1 : 0);
