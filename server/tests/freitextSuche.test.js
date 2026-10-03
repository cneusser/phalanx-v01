// ─────────────────────────────────────────────────────────────────────────────
// Freitextsuche unabhängig von der Wortstellung (v0.445).
//
// Anlass: „Bauer Daniel" fand nichts, „Daniel Bauer" schon. Der Grund steckte
// in einer Zeile, die richtig aussieht: Die ganze Eingabe wurde gegen jede
// Spalte einzeln gehalten. Kein Feld enthält beide Namen, also kein Treffer,
// obwohl die Person im Bestand steht.
//
// Das ist der unangenehmste Fehlertyp in einer Kartei: Die Suche sagt nicht
// „weiss nicht", sondern „gibt es nicht". Wer das einmal erlebt, traut ihr
// danach nicht mehr.
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const { suchBedingung, entschaerfen } = require('../utils/freitextSuche');

let fail = 0;
const ok = (n, c) => { console.log((c ? '✓' : '✗ FEHLER') + ' ' + n); if (!c) fail++; };

const SPALTEN = ['k.first_name', 'k.last_name', 'k.email'];

// ── Die Bedingung selbst ────────────────────────────────────────────────────
{
  const leer = suchBedingung('   ', SPALTEN);
  ok('eine leere Eingabe sucht nichts', leer === null);

  const eins = suchBedingung('Bauer', SPALTEN);
  ok('ein Wort ergibt eine Klammer über alle Spalten', /^\(.*OR.*\)$/.test(eins.bedingung));
  ok('und einen Wert je Spalte', eins.werte.length === 3);
  ok('mit Platzhaltern aussen', eins.werte.every((w) => w === '%Bauer%'));

  const zwei = suchBedingung('Bauer Daniel', SPALTEN);
  ok('zwei Wörter werden mit UND verbunden', / AND /.test(zwei.bedingung));
  ok('und nicht mit ODER', !/\) OR \(/.test(zwei.bedingung));
  ok('jedes Wort bekommt seine Werte', zwei.werte.length === 6);
  ok('die Reihenfolge der Wörter spielt keine Rolle',
    suchBedingung('Daniel Bauer', SPALTEN).bedingung === zwei.bedingung);

  // Das ist der Kern: „Bauer Daniel" trifft, weil jedes Wort für sich gegen
  // alle Spalten gehalten wird. Hier nachgestellt, damit die Zusage nicht nur
  // behauptet, sondern geprüft ist.
  const person = { 'k.first_name': 'Daniel', 'k.last_name': 'Bauer', 'k.email': 'bauer4290@googlemail.com' };
  const trifft = (q) => suchBedingung(q, SPALTEN) === null || (() => {
    const w = String(q).trim().split(/\s+/).filter(Boolean);
    return w.every((wort) => SPALTEN.some((sp) => String(person[sp] || '').toLowerCase().includes(wort.toLowerCase())));
  })();
  ok('„Daniel Bauer" trifft', trifft('Daniel Bauer'));
  ok('„Bauer Daniel" trifft ebenso', trifft('Bauer Daniel'));
  ok('„bauer googlemail" trifft über zwei Spalten', trifft('bauer googlemail'));
  ok('„Bauer Müller" trifft nicht', !trifft('Bauer Müller'));

  const viele = suchBedingung('a b c d e f g h', SPALTEN);
  ok('sehr lange Eingaben werden begrenzt', viele.werte.length === 6 * 3);
}

// ── Platzhalter aus der Eingabe dürfen nicht wirken ────────────────────────
{
  ok('das Prozentzeichen wird entschärft', entschaerfen('100%') === '100\\%');
  ok('der Unterstrich ebenso', entschaerfen('a_b') === 'a\\_b');
  const b = suchBedingung('%', SPALTEN);
  ok('eine Suche nach % liefert nicht alles', b.werte.every((w) => w === '%\\%%'));
  ok('und die Abfrage sagt der Datenbank, wie sie das liest', /ESCAPE/.test(b.bedingung));
}

// ── Die Stellen, die sie benutzen ──────────────────────────────────────────
{
  const crm = fs.readFileSync(path.join(__dirname, '..', 'routes', 'crm.js'), 'utf8');
  ok('die Kontaktsuche benutzt sie', /suchBedingung\(q, \['k\.last_name'/.test(crm));
  ok('die Firmensuche ebenso', /suchBedingung\(q, \['c\.name'/.test(crm));
  ok('und die Kontensuche', /suchBedingung\(q, \['u\.first_name'/.test(crm));
  ok('die alte Einzelblock-Suche ist weg',
    !/k\.last_name ILIKE \? OR k\.first_name ILIKE \? OR k\.email ILIKE \?/.test(crm));
}

// ── Verlauf und Firmensicht ────────────────────────────────────────────────
{
  const crm = fs.readFileSync(path.join(__dirname, '..', 'routes', 'crm.js'), 'utf8');
  ok('Nachrichten finden den Kontakt auch ohne verknuepftes Konto',
    /SELECT id FROM users WHERE lower\(email\) = lower\(\?\)/.test(crm));
  ok('es gibt einen Verlauf je Firma', /companies\/:id\/verlauf/.test(crm));
  const fv = crm.slice(crm.indexOf("companies/:id/verlauf"), crm.indexOf("Unternehmen: Detail"));
  ok('er nennt zu jedem Eintrag den Kontakt', /kontakt: name/.test(fv));
  ok('ehemalige Ansprechpartner sind als solche erkennbar', /ehemalig: !!k\.ended_on/.test(fv));
  ok('anonymisierte Kontakte bleiben aussen vor', /anonymized_at IS NULL/.test(fv));

  const seite = fs.readFileSync(path.join(__dirname, '..', '..', 'client', 'src', 'pages', 'Crm.jsx'), 'utf8');
  ok('die Firma zeigt den gemeinsamen Verlauf', /VERLAUF ÜBER ALLE ANSPRECHPARTNER/.test(seite));
  ok('er wird erst auf Anforderung geholt', /verlauf \? 'Neu laden' : 'Verlauf anzeigen'/.test(seite));
  ok('und laesst sich auf eine Person eingrenzen', /nurKontakt/.test(seite));
}

process.exit(fail ? 1 : 0);
