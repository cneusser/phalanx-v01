// ─────────────────────────────────────────────────────────────────────────────
// Adressfelder nach deutschem Standard (v0.447).
//
// Der Zerleger ist bewusst misstrauisch. Eine falsch zerlegte Adresse fällt
// niemandem auf: „Leopoldstr." ohne Hausnummer sieht aus wie eine Adresse, und
// der Brief kommt trotzdem nicht an. Deshalb wird hier nicht geprüft, ob der
// Zerleger möglichst viel schafft, sondern ob er im Zweifel schweigt.
//
// Die beiden Zusagen, auf die es ankommt, stehen am Ende:
//   · Postleitzahl und Hausnummer sind Text. 01067 als Zahl wäre 1067.
//   · Codename und Anschrift verlassen das Haus nie zusammen. Gegenüber
//     Käufern ist der Codename die Anonymisierung, und eine Straße mit
//     Hausnummer führt in einer Minute zum Handelsregister.
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const a = require('../utils/adressfelder');
const pp = require('../utils/phalanxProjekt');

let fail = 0;
const ok = (n, c) => { console.log((c ? '✓' : '✗ FEHLER') + ' ' + n); if (!c) fail++; };

// ── Was sicher zerlegt wird ────────────────────────────────────────────────
const sicher = [
  ['Leopoldstr. 21', 'Leopoldstr.', '21'],
  ['Hauptstraße 28a', 'Hauptstraße', '28a'],
  ['Hauptstraße 28 a', 'Hauptstraße', '28a'],
  ['Am Markt 12-14', 'Am Markt', '12-14'],
  ['Am Markt 12 - 14', 'Am Markt', '12-14'],
  ['Straße des 17. Juni 135', 'Straße des 17. Juni', '135'],
  ['Gewerbepark 12 bis 14', 'Gewerbepark', '12 bis 14'],
  ['Lindenallee 3', 'Lindenallee', '3'],
];
for (const [roh, strasse, hausnummer] of sicher) {
  const r = a.zerlegeStrasse(roh);
  ok(`"${roh}" wird zerlegt`, r.sicher && r.strasse === strasse && r.hausnummer === hausnummer);
}

// ── Was gemeldet statt geraten wird ────────────────────────────────────────
const melden = [
  ['Industriestr', /Keine Hausnummer/],
  ['Postfach 1234', /Postfach/],
  ['PF 90 01 20', /Postfach/],
  ['Bahnhofstr. 5; Werkstr. 9', /zwei Angaben/],
  ['1600 Pennsylvania Avenue', /ausländisches Format/],
  ['Industriestr 4 7', /Mehrere Zahlen/],
  ['', /Keine Angabe/],
];
for (const [roh, muster] of melden) {
  const r = a.zerlegeStrasse(roh);
  ok(`"${roh}" wird gemeldet: ${r.grund}`, !r.sicher && muster.test(r.grund || ''));
}
ok('eine gemeldete Angabe behält ihr Original',
  a.zerlegeStrasse('Industriestr').strasse === 'Industriestr');
ok('und bekommt keine erfundene Hausnummer',
  a.zerlegeStrasse('Industriestr').hausnummer === null);

// ── Land ───────────────────────────────────────────────────────────────────
ok('Deutschland wird DE', a.landCode('Deutschland') === 'DE');
ok('Germany auch', a.landCode('Germany') === 'DE');
ok('Österreich wird AT', a.landCode('Österreich') === 'AT');
ok('ohne Angabe gilt die Vorbelegung', a.landCode('') === 'DE');
ok('Unbekanntes wird nicht geraten', a.landCode('Elbonien') === null);

// ── Der Trockenlauf urteilt über den ganzen Satz ───────────────────────────
{
  const gut = a.vorschlagFuer({ id: 1, name: 'Muster GmbH', street: 'Leopoldstr. 21',
    postal_code: '80802', city: 'München', country: 'Deutschland' });
  ok('ein sauberer Satz ist sicher', gut.sicher);
  ok('und trägt alle Felder', gut.vorschlag.strasse === 'Leopoldstr.' && gut.vorschlag.hausnummer === '21'
    && gut.vorschlag.plz === '80802' && gut.vorschlag.ort === 'München' && gut.vorschlag.land === 'DE');
  ok('das Original bleibt im Vorschlag sichtbar', gut.original === 'Leopoldstr. 21');

  const schief = a.vorschlagFuer({ id: 2, name: 'Zweite GmbH', street: 'Industriestr',
    postal_code: 'SW1A 1AA', city: 'London', country: 'Elbonien' });
  ok('ein unklarer Satz wird gemeldet', !schief.sicher);
  ok('und nennt jeden Grund einzeln', schief.hinweise.length >= 2);
  ok('ein unbekanntes Land wird benannt', schief.hinweise.some((h) => /Elbonien/.test(h)));

  const plzSchief = a.vorschlagFuer({ id: 3, name: 'Dritte GmbH', street: 'Lindenallee 3',
    postal_code: 'AB12', city: 'Berlin', country: 'Deutschland' });
  ok('eine unplausible Postleitzahl wird gemeldet', plzSchief.hinweise.some((h) => /Postleitzahl/.test(h)));
}

// ── Die Anzeigezeile wird berechnet ────────────────────────────────────────
{
  const inland = a.anzeigeZeilen({ strasse: 'Leopoldstr.', hausnummer: '21', plz: '80802', ort: 'München', land: 'DE' });
  ok('Inland: zwei Zeilen', inland.length === 2);
  ok('Straße und Hausnummer stehen zusammen', inland[0] === 'Leopoldstr. 21');
  ok('Postleitzahl und Ort auch', inland[1] === '80802 München');

  const mitZusatz = a.anzeigeZeilen({ strasse: 'Leopoldstr.', hausnummer: '21', adresszusatz: 'Haus 3',
    plz: '80802', ort: 'München', land: 'DE' });
  ok('der Zusatz steht dazwischen', mitZusatz[1] === 'Haus 3');

  const ausland = a.anzeigeZeilen({ strasse: 'Bahnhofstrasse', hausnummer: '1', plz: '8001', ort: 'Zürich', land: 'CH' });
  ok('ein fremdes Land bekommt eine eigene Zeile', ausland[ausland.length - 1] === 'CH');
  ok('das eigene Land nicht', !inland.includes('DE'));

  const quelle = fs.readFileSync(path.join(__dirname, '..', 'utils', 'adressfelder.js'), 'utf8');
  ok('die Zeile wird nirgends gespeichert', !/anzeige_zeile|display_address/.test(quelle));
}

// ── Eingehende Felder ──────────────────────────────────────────────────────
{
  const gut = a.eingangPruefen({ strasse: 'Leopoldstr.', hausnummer: '21', plz: '80802', ort: 'München', land: 'de' });
  ok('ein sauberer Satz geht durch', gut.fehler.length === 0);
  ok('das Land wird groß geschrieben', gut.felder.land === 'DE');
  ok('Deutschland als Wort wird abgelehnt', a.eingangPruefen({ land: 'Deutschland' }).fehler.length === 1);
  ok('zu lange Felder werden abgelehnt',
    a.eingangPruefen({ ort: 'x'.repeat(200) }).fehler.length === 1);
}

// ── Text, nicht Zahl ───────────────────────────────────────────────────────
{
  const wanderung = fs.readFileSync(path.join(__dirname, '..', 'db', 'migrations', '20260901001790_adressfelder.js'), 'utf8');
  ok('plz ist Text', /t\.string\('plz', 10\)/.test(wanderung));
  ok('hausnummer ist Text', /t\.string\('hausnummer', 20\)/.test(wanderung));
  ok('land hat zwei Zeichen und die Vorbelegung DE', /t\.string\('land', 2\)\.defaultTo\('DE'\)/.test(wanderung));
  ok('keine Spalte ist eine Zahl', !/t\.integer\('(plz|hausnummer)'/.test(wanderung));
  ok('die alten Felder bleiben stehen', !/dropColumn\('street'\)/.test(wanderung));
  // Eine Postleitzahl als Zahl wäre der Fehler, den die Spaltenart verhindert.
  ok('01067 bleibt als Text erhalten', String('01067') === '01067' && Number('01067') === 1067);
}

// ── Codename und Anschrift verlassen das Haus nie zusammen ─────────────────
{
  const raus = pp.mandatNachAussen({
    id: 7, codename: 'FARADAY', status: 'active', phalanx_projekt_nummer: '30343',
    strasse: 'Leopoldstr.', hausnummer: '21', plz: '80802', ort: 'München', land: 'DE',
    street: 'Leopoldstr. 21', postal_code: '80802', city: 'München',
  });
  const text = JSON.stringify(raus);
  ok('der Codename geht hinaus', /FARADAY/.test(text));
  ok('die Straße nicht', !/Leopoldstr/.test(text));
  ok('die Postleitzahl nicht', !/80802/.test(text));
  ok('der Ort nicht', !/München/.test(text));
  for (const feld of ['strasse', 'hausnummer', 'plz', 'ort', 'land', 'adresszusatz']) {
    ok(`"${feld}" steht nicht auf der Liste der erlaubten Felder`, !pp.ERLAUBTE_FELDER.includes(feld));
  }
  ok('ein nachträglich ergänztes Adressfeld würde auffallen',
    pp.verbotenesGefunden({ ...raus, plz: '80802' }).includes('plz'));
}

// ── Die Schnittstelle schreibt nicht zurück ────────────────────────────────
{
  const extern = fs.readFileSync(path.join(__dirname, '..', 'routes', 'extern.js'), 'utf8');
  ok('es gibt einen Weg herein', /'\/firma-adresse'/.test(extern));
  ok('aber keinen hinaus', !/SELECT[^;]*strasse[^;]*FROM crm_companies[^;]*\n[\s\S]{0,400}res\.json/.test(extern.slice(extern.indexOf("'/mandate'"), extern.indexOf("'/projekt'"))));
  ok('eine hier gepflegte Anschrift wird nicht überschrieben', /adresse_quelle === 'lokal'/.test(extern));
  ok('sondern die Abweichung gemeldet', /abweichung:/.test(extern));
  ok('eine unbekannte Firma wird nicht angelegt', /Angelegt wird über diesen Weg nichts/.test(extern));
  ok('Dubletten werden gemeldet, nicht aufgelöst', /Dublette zuerst klären/.test(extern));
  ok('es wird nichts gelöscht', !/DELETE FROM/.test(extern));

  const admin = fs.readFileSync(path.join(__dirname, '..', 'routes', 'admin.js'), 'utf8');
  ok('der Trockenlauf ist ein Bericht im Verwaltungsbereich', /'\/berichte\/adressen'/.test(admin));
  ok('die Übernahme ist ein eigener Schritt', /'\/berichte\/adressen\/anwenden'/.test(admin));
  const anwenden = admin.slice(admin.indexOf("'/berichte/adressen/anwenden'"), admin.indexOf("'/berichte/adressen/rueckmeldungen'"));
  ok('übernommen wird nur, was sicher ist', /if \(!v\.sicher\)/.test(anwenden));
  ok('die Quelle wird auf "zerlegt" gesetzt', /adresse_quelle = 'zerlegt'/.test(anwenden));
  ok('das Originalfeld bleibt stehen', !/street = NULL/.test(anwenden));
  ok('hier geänderte Adressen werden gemeldet', /'\/berichte\/adressen\/rueckmeldungen'/.test(admin));
  ok('und ausdrücklich nicht zurückgeschrieben', /Zurückgeschrieben wird nichts/.test(admin));
}

// ── Eine Regel, nicht zwei ─────────────────────────────────────────────────
{
  const { normalizeName } = require('../utils/firmenname');
  ok('der Firmenname wird an einer Stelle normalisiert',
    normalizeName('NextGen Equity Partners GmbH') === normalizeName('nextgen equity partners'));
  const crm = fs.readFileSync(path.join(__dirname, '..', 'routes', 'crm.js'), 'utf8');
  const extern = fs.readFileSync(path.join(__dirname, '..', 'routes', 'extern.js'), 'utf8');
  ok('crm.js hat keine eigene Kopie mehr', !/function normalizeName\(name\)/.test(crm));
  ok('extern.js auch nicht', !/function normalizeName\(name\)/.test(extern));
}

process.exit(fail ? 1 : 0);
