// ─────────────────────────────────────────────────────────────────────────────
// Aus dem Fliesstext werden Suchkriterien (v0.469)
//
// Der Abgleich im Deal-Funnel vergleicht Kennungen. Die recherchierten
// Kontakte tragen Sätze. Also greift er dort nicht, und das ist genau die
// Gruppe, für die er gedacht war.
//
// Die wichtigste Prüfung in dieser Datei ist nicht, dass etwas erkannt wird,
// sondern dass Unbekanntes NICHT erkannt wird. „Infrastruktur" hat in unserer
// Branchenliste keine Entsprechung. Wenn daraus eine wird, stehen am Ende
// Kriterien im Bestand, die niemand gesetzt hat, und der Abgleich schlägt
// Kontakte vor, die gar nicht suchen, was er behauptet.
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const k = require('../utils/kriterienAusText');

let fail = 0;
const ok = (n, c) => { console.log((c ? '✓' : '✗ FEHLER') + ' ' + n); if (!c) fail++; };
const hat = (arr, w) => arr.includes(w);

console.log('\n── Was erkannt wird ──');
{
  const a = k.ableiten('Bau, Infrastruktur, Immobilien, Technologie');
  ok('Bau wird erkannt', hat(a.branchen, 'bau'));
  ok('Technologie wird zu IT', hat(a.branchen, 'it'));
  ok('Immobilien gehoert zu Finanzen und Immobilien', hat(a.branchen, 'finanzen'));
  ok('Infrastruktur bleibt unzugeordnet', hat(a.unklar, 'Infrastruktur'));
  ok('und wird nicht stillschweigend einsortiert', a.branchen.length === 3);
}
{
  const a = k.ableiten('Private Equity, Gesundheit, Konsum, Industrie');
  ok('Gesundheit, Konsum und Industrie werden erkannt',
    hat(a.branchen, 'gesundheit') && hat(a.branchen, 'handel') && hat(a.branchen, 'maschinenbau'));
  ok('Private Equity ist keine Branche und bleibt stehen', hat(a.unklar, 'Private Equity'));
}
{
  ok('Mehrzahl stoert nicht', hat(k.ableiten('Versicherungen und Finanzdienstleistungen').branchen, 'finanzen'));
  ok('Englisch wird mitgelesen', hat(k.ableiten('healthcare and software').branchen, 'it'));
  ok('ein bekanntes Wort im Satz genuegt', hat(k.ableiten('Erneuerbare Energien Europa').branchen, 'energie'));
  ok('deutsche Regionen werden erkannt', hat(k.ableiten('Maschinenbau in Bayern').regionen, 'by'));
}

console.log('\n── Was nicht erkannt wird ──');
{
  const a = k.ableiten('Unternehmensbeteiligungen in Nordeuropa');
  ok('ein Satz ohne bekannte Begriffe ergibt nichts', a.branchen.length === 0 && a.regionen.length === 0);
  ok('und sagt das auch', a.unklar.length > 0);
  ok('leerer Text ergibt leeres Ergebnis', JSON.stringify(k.ableiten('')) === '{"branchen":[],"regionen":[],"unklar":[]}');
  ok('null ebenso', k.ableiten(null).unklar.length === 0);
}

console.log('\n── Der Plan je Kontakt ──');
{
  const p1 = k.planen({ id: 1, company: '31Capital', investment_focus: 'Technologie und Industrie' });
  ok('ohne Kriterien wird ergaenzt', p1.aenderung === true);
  ok('und der Name steht im Bericht', p1.name === '31Capital');

  const p2 = k.planen({ id: 2, company: 'X', investment_focus: 'Technologie', focus_industries: '["bau"]', focus_regions: '["by"]' });
  ok('gepflegte Kriterien werden nicht ueberschrieben', p2.aenderung === false);
  ok('und der Grund steht dabei', /bereits gepflegt/.test(p2.grund));

  // Wer Branchen gepflegt hat, aber keine Regionen, bekommt nur die Regionen.
  const p3 = k.planen({ id: 3, company: 'Y', investment_focus: 'Technologie in Bayern', focus_industries: '["bau"]' });
  ok('fehlende Seite wird einzeln ergaenzt', p3.aenderung === true && p3.branchen.length === 0 && hat(p3.regionen, 'by'));

  // Und wer nur Branchen gepflegt hat und einen Text ohne Region traegt,
  // bekommt nichts. Das ist kein Fehler, sondern das richtige Ergebnis.
  const p3b = k.planen({ id: 6, company: 'Y2', investment_focus: 'Technologie', focus_industries: '["bau"]' });
  ok('ohne neue Angabe bleibt alles stehen', p3b.aenderung === false);

  const p4 = k.planen({ id: 4, company: 'Z', investment_focus: '' });
  ok('ohne Schwerpunkt passiert nichts', p4.aenderung === false);

  const p5 = k.planen({ id: 5, company: 'Q', investment_focus: 'Infrastruktur' });
  ok('wenn nichts folgt, wird nichts gesetzt', p5.aenderung === false);
  ok('und das Unzugeordnete steht im Bericht', p5.unklar.length === 1);
}

console.log('\n── Die Route ──');
{
  const wurzel = path.join(__dirname, '..', '..');
  const crm = fs.readFileSync(path.join(wurzel, 'server', 'routes', 'crm.js'), 'utf8');
  ok('es gibt die Route', /router\.post\('\/kriterien-ableiten'/.test(crm));
  ok('geschrieben wird nur auf ausdruecklichen Wunsch', /uebernehmen === true/.test(crm));
  ok('der Trockenlauf ist der Standard', /trockenlauf: !uebernehmen/.test(crm));
  ok('die Uebernahme steht im Protokoll', /KRITERIEN_ABGELEITET/.test(crm));
  ok('ein leeres Ergebnis ueberschreibt nichts', /WHEN \? = '\[\]' THEN focus_industries/.test(crm));

  const seite = fs.readFileSync(path.join(wurzel, 'client', 'src', 'pages', 'Datenpflege.jsx'), 'utf8');
  ok('die Oberflaeche bietet beides an', /kriterienLauf\(false\)/.test(seite) && /kriterienLauf\(true\)/.test(seite));
  ok('und zeigt das Unzugeordnete', /nicht zugeordnet/.test(seite));
}

console.log(fail ? `\n${fail} Fehler` : '\nAlles grün');
process.exit(fail ? 1 : 0);
