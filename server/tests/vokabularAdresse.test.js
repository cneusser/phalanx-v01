// Gemeinsames Vokabular und Adresszerlegung (v0.400).
//
// Zwei Dinge werden hier geprüft. Erstens: Die Notfassung der Käufertypen in
// der Oberfläche muss Zeichen für Zeichen zu der Liste auf dem Server passen,
// sonst laufen beide auseinander und man pflegt doch wieder zweimal. Zweitens:
// Die Zerlegung einer Anschrift muss verlässlich sein, denn ein falsch
// einsortierter Ort landet still in der Datenbank.
const fs = require('fs');
const path = require('path');
const vok = require('../utils/vokabular');
const adr = require('../utils/adresse');

let fail = 0;
const ok = (n, c) => { console.log((c ? '✓' : '✗ FEHLER') + ' ' + n); if (!c) fail++; };
const gleich = (n, a, b) => ok(n + (a === b ? '' : `  (erhalten: ${JSON.stringify(a)}, erwartet: ${JSON.stringify(b)})`), a === b);

// ── Vokabular: Server und Oberfläche müssen deckungsgleich sein ─────────────
const datei = path.join(__dirname, '..', '..', 'client', 'src', 'constants', 'vokabular.js');
const quelle = fs.readFileSync(datei, 'utf8');

for (const k of vok.KAEUFERTYPEN) {
  ok(`Käufertyp ${k.wert} steht auch in der Oberfläche`,
    quelle.includes(`wert: '${k.wert}'`) && quelle.includes(`label: '${k.label}'`));
}
const imClient = (quelle.match(/wert: '([a-z_]+)'/g) || []).length;
gleich('gleiche Anzahl Käufertypen auf beiden Seiten', imClient, vok.KAEUFERTYPEN.length);

for (const land of vok.LAENDER) {
  ok(`Land ${land} steht auch in der Oberfläche`, quelle.includes(`'${land}'`));
}

// ── Zuordnung des Freitexts aus dem Marktplatz ──────────────────────────────
gleich('Privatperson wird zu private', vok.kaeufertypAus('Privatperson'), 'private');
gleich('Family Office wird erkannt', vok.kaeufertypAus('Family Office'), 'family_office');
gleich('Private Equity wird zum Finanzinvestor', vok.kaeufertypAus('Private Equity Fonds'), 'financial');
gleich('MBI wird zum Nachfolger', vok.kaeufertypAus('MBI-Kandidat'), 'successor');
gleich('Strategischer Investor wird strategic', vok.kaeufertypAus('Strategischer Investor'), 'strategic');
gleich('Business Angel wird erkannt', vok.kaeufertypAus('Business Angel'), 'business_angel');
gleich('Suchmandat wird zum Berater', vok.kaeufertypAus('Berater mit Suchmandat'), 'advisor_mandate');
gleich('gültiger Wert bleibt unverändert', vok.kaeufertypAus('venture_capital'), 'venture_capital');
gleich('Unbekanntes bleibt leer statt zu raten', vok.kaeufertypAus('irgendwas'), '');
gleich('Leeres bleibt leer', vok.kaeufertypAus(''), '');
ok('Family Office gewinnt vor Privat', vok.kaeufertypAus('privates Family Office') === 'family_office');

// ── Anschriften zerlegen ────────────────────────────────────────────────────
const f1 = adr.zerlege('Albrecht-Dürer-Straße 42, 15732 Schulzendorf, Deutschland');
gleich('Straße erkannt', f1.street, 'Albrecht-Dürer-Straße 42');
gleich('Postleitzahl erkannt', f1.postal_code, '15732');
gleich('Ort erkannt', f1.city, 'Schulzendorf');
gleich('Land erkannt', f1.country, 'Deutschland');
gleich('nichts bleibt übrig', f1.rest, '');

const f2 = adr.zerlege('Musterweg 3a, D-91056 Erlangen');
gleich('Länderkürzel vor der Postleitzahl ergibt das Land', f2.country, 'Deutschland');
gleich('Postleitzahl ohne Kürzel gespeichert', f2.postal_code, '91056');

const f3 = adr.zerlege('Bahnhofstrasse 12, CH-8001 Zürich, Schweiz');
gleich('doppelt genanntes Land landet nicht im Rest', f3.rest, '');
gleich('Schweizer Ort erkannt', f3.city, 'Zürich');

const f4 = adr.zerlege('15732 Schulzendorf');
gleich('nur Postleitzahl und Ort', f4.city, 'Schulzendorf');
gleich('keine Straße erfunden', f4.street, '');

const f5 = adr.zerlege('München');
gleich('ein einzelnes Wort gilt als Ort', f5.city, 'München');

const f6 = adr.zerlege('Postfach 1234, 12345 Berlin');
gleich('Postfach wird nicht zur Straße', f6.street, '');
gleich('Postfach bleibt sichtbar im Rest', f6.rest, 'Postfach 1234');

const f7 = adr.zerlege('');
gleich('leere Eingabe ergibt leere Felder', adr.hatInhalt(f7), false);

const f8 = adr.zerlege('Am Weichselgarten 7, 91058 Erlangen-Tennenlohe, Deutschland');
gleich('Ortsteil mit Bindestrich bleibt ganz', f8.city, 'Erlangen-Tennenlohe');

const f9 = adr.zerlege('Hauptplatz 1, 1010 Wien, Österreich');
gleich('vierstellige Postleitzahl erkannt', f9.postal_code, '1010');
gleich('Österreich erkannt', f9.country, 'Österreich');

// ── Aus Feldern wieder eine Zeile ───────────────────────────────────────────
gleich('Zeile wird sauber zusammengesetzt',
  adr.zeile({ street: 'Musterweg 3', postal_code: '12345', city: 'Ort', country: 'Deutschland' }),
  'Musterweg 3, 12345 Ort, Deutschland');
gleich('fehlende Teile erzeugen keine leeren Kommas',
  adr.zeile({ city: 'Berlin' }), 'Berlin');
gleich('ganz leer bleibt leer', adr.zeile({}), '');

// ── Zusammenspiel mit dem Parser ────────────────────────────────────────────
const { parseLead } = require('../utils/leadParser');
const mail = [
  'Anfrage über DUB.de',
  'Inserat: 5381',
  'Interne Referenz: 5381 Betongold',
  'Name: Veljko Stojkov',
  'E-Mail: veljko.stojkov@example.com',
  'Telefon: 017693153376',
  'Investortyp: Privatperson',
  'Adresse: Albrecht-Dürer-Straße 42, 15732 Schulzendorf, Deutschland',
].join('\n');
const c = parseLead(mail).contact;
gleich('Parser liefert den Käufertyp', c.buyer_type, 'private');
gleich('Parser behält den Wortlaut des Portals', c.investor_type_raw, 'Privatperson');
gleich('Parser liefert den Ort einzeln', c.city, 'Schulzendorf');
gleich('Parser baut die lesbare Zeile', c.location, 'Albrecht-Dürer-Straße 42, 15732 Schulzendorf, Deutschland');

console.log(fail ? `\n${fail} Fehler` : '\nAlle Prüfungen bestanden');
process.exit(fail ? 1 : 0);
