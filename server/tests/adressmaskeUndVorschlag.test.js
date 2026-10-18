// ─────────────────────────────────────────────────────────────────────────────
// Zwei Oberflächen zu fertigem Serverstand (v0.463)
//
// Beides lag seit Wochen halb fertig: Die Adressfelder nach deutschem Standard
// hatten Migration, Zerleger und Schnittstelle, aber kein Eingabefeld, und die
// Investorensuche hatte eine Route, aber keinen Knopf. Eine Funktion ohne Weg
// dorthin ist für den Benutzer dasselbe wie keine Funktion, kostet aber
// Pflege.
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');

let fail = 0;
const ok = (n, c) => { console.log((c ? '✓' : '✗ FEHLER') + ' ' + n); if (!c) fail++; };

const wurzel = path.join(__dirname, '..', '..');
const lies = (...p) => fs.readFileSync(path.join(wurzel, ...p), 'utf8');

const crm = lies('server', 'routes', 'crm.js');
const maske = lies('client', 'src', 'pages', 'Crm.jsx');
const board = lies('client', 'src', 'components', 'DealFunnelBoard.jsx');
const adressfelder = require('../utils/adressfelder');

// ── 1. Die Anschrift lässt sich endlich eingeben ─────────────────────────
console.log('\n── Anschrift in getrennten Feldern ──');
for (const feld of ['strasse', 'hausnummer', 'adresszusatz', 'plz', 'ort', 'land']) {
  ok(`die Maske hat ein Feld für ${feld}`, new RegExp(`set\\('${feld}'\\)`).test(maske));
}
ok('die vier alten Felder werden nicht mehr bearbeitet',
  !/set\('street'\)/.test(maske) && !/set\('postal_code'\)/.test(maske)
  && !/set\('city'\)/.test(maske) && !/set\('country'\)/.test(maske));
ok('der Altbestand wird aber angezeigt, solange nichts Neues da ist',
  /Im Altbestand steht/.test(maske));
ok('die Anzeigezeile wird gerechnet und nicht gespeichert',
  /gerechnet, nie gespeichert|Die Anzeigezeile wird gerechnet/.test(maske));
ok('die Detailansicht nimmt zuerst die neuen Felder', /company\.strasse, company\.hausnummer/.test(maske));
ok('und fällt auf den Altbestand zurück', /company\.street, \[company\.postal_code/.test(maske));
ok('die Hausnummer ist ein Textfeld, kein Zahlenfeld',
  !/type="number"[^>]*hausnummer|hausnummer[^>]*type="number"/.test(maske));

console.log('\n── Der Server nimmt sie an ──');
ok('beim Ändern', /\['strasse', 'hausnummer', 'adresszusatz', 'plz', 'ort', 'land'\]\.some/.test(crm));
ok('beim Anlegen', /strasse, hausnummer, adresszusatz, plz, ort, land, adresse_quelle, adresse_am/.test(crm));
ok('geprüft wird mit demselben Modul wie an der Schnittstelle',
  (crm.match(/adressfelder\.eingangPruefen\(req\.body\)/g) || []).length >= 2);
ok('von Hand gepflegte Angaben werden als solche gekennzeichnet', /adresse_quelle = \?/.test(crm) && /'manuell'/.test(crm));
ok('ein geleertes Feld wird auch geleert gespeichert', /Geleerte Felder gehören auch gespeichert/.test(crm));
ok('beim Anlegen wird vor dem Anlegen geprüft',
  crm.indexOf('const adresse = adressfelder.eingangPruefen(req.body)') < crm.indexOf('INSERT INTO crm_companies'));

console.log('\n── Die Prüfung selbst ──');
{
  const gut = adressfelder.eingangPruefen({ strasse: 'Maximilianstraße', hausnummer: '13', plz: '80539', ort: 'München', land: 'de' });
  ok('eine saubere Anschrift geht durch', gut.fehler.length === 0);
  ok('das Land wird auf zwei Grossbuchstaben gebracht', gut.felder.land === 'DE');
  const schlecht = adressfelder.eingangPruefen({ land: 'Deutschland' });
  ok('ein ausgeschriebenes Land wird abgewiesen', schlecht.fehler.length === 1);
  ok('und die Meldung sagt, was erwartet wird', /ISO 3166/.test(schlecht.fehler[0]));
  const zuLang = adressfelder.eingangPruefen({ hausnummer: 'x'.repeat(30) });
  ok('zu lange Angaben werden abgewiesen', zuLang.fehler.length === 1);
  const sonderfall = adressfelder.eingangPruefen({ hausnummer: '12 bis 14' });
  ok('„12 bis 14" ist eine gültige Hausnummer', sonderfall.fehler.length === 0 && sonderfall.felder.hausnummer === '12 bis 14');
  const plz = adressfelder.eingangPruefen({ plz: '01067' });
  ok('die führende Null der Postleitzahl bleibt erhalten', plz.felder.plz === '01067');
}

// ── 2. Der Weg zur Investorensuche ───────────────────────────────────────
console.log('\n── Passende Investoren ──');
ok('der Knopf ruft die vorhandene Route auf', /\/crm\/investoren\/passend\/\$\{active\}/.test(board));
ok('je Treffer stehen die Gründe dabei', /k\.gruende\.join/.test(board));
ok('Übernommene landen auf Stufe 0 und nicht weiter',
  /party_role: 'buyer', funnel_stage: 0/.test(board));
ok('und das steht auch dort', /Stufe 0 \(Longlist zur Freigabe\)/.test(board));
ok('es wird nichts versendet', /Es wird nichts\s*\n?\s*versendet/.test(board));
ok('wer schon dabei ist, lässt sich nicht doppelt übernehmen', /schonDabei\b/.test(board));
ok('ein fehlender Einwilligungsstand wird am Treffer gezeigt',
  /k\.consent_status !== 'opt_in'/.test(board) && /keine Einwilligung/.test(board));
ok('beim Wechsel des Mandats wird der alte Vorschlag verworfen',
  /setPassend\(null\); \}, \[active\]\)/.test(board));
ok('ohne gepflegte Suchkriterien wird das gesagt, nicht nur eine Null',
  /Es sind noch keine Suchkriterien gepflegt/.test(board));

// ── 3. Die Auswertung dahinter ───────────────────────────────────────────
console.log('\n── Der Abgleich ──');
{
  const { vorschlagen } = require('../utils/investorMatch');
  const mandat = { industry: 'Elektrotechnik', region: 'Bayern', revenue_band: '10 bis 20 Mio.' };
  const ohneKriterien = [{ id: 1, first_name: 'Ohne', last_name: 'Profil' }];
  ok('wer keine Kriterien gepflegt hat, wird nicht vorgeschlagen',
    vorschlagen(ohneKriterien, mandat).length === 0);
  const treffer = vorschlagen([
    { id: 2, first_name: 'Max', last_name: 'Heufelder', focus_industries: '["Elektrotechnik"]', focus_regions: '["Bayern"]' },
    { id: 3, first_name: 'Nur', last_name: 'Branche', focus_industries: '["Elektrotechnik"]' },
  ], mandat);
  ok('wer passt, wird vorgeschlagen', treffer.length === 2);
  ok('wer mehr Gründe hat, steht oben', treffer[0].id === 2);
  ok('jeder Treffer trägt seine Gründe', treffer.every((t) => t.gruende.length > 0));
}

console.log(fail ? `\n${fail} Fehler` : '\nAlles grün');
process.exit(fail ? 1 : 0);
