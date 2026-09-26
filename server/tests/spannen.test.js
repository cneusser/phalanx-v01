// ─────────────────────────────────────────────────────────────────────────────
// Spannen für die öffentliche Ansicht (v0.409).
//
// Geprüft wird das, was teuer wäre: dass ohne Freischaltung keine exakte Zahl
// und keine Stadt nach draußen geht, und dass eine bereits vorhandene Spanne
// nicht ein zweites Mal gerundet wird.
// ─────────────────────────────────────────────────────────────────────────────
const sp = require('../utils/spannen');

let fail = 0;
const ok = (n, c) => { console.log((c ? '✓' : '✗ FEHLER') + ' ' + n); if (!c) fail++; };
const gleich = (n, a, b) => ok(n + (a === b ? '' : `  (war: ${JSON.stringify(a)}, erwartet: ${JSON.stringify(b)})`), a === b);

// ── Beträge ─────────────────────────────────────────────────────────────────
gleich('blanker Eurobetrag wird zur Spanne', sp.zuSpanne('8400000'), '5 bis 10 Mio.');
gleich('Betrag mit Punkten und Waehrung', sp.zuSpanne('8.400.000 EUR'), '5 bis 10 Mio.');
gleich('Millionen werden erkannt', sp.zuSpanne('8,4 Mio.'), '5 bis 10 Mio.');
gleich('Milliarden werden erkannt', sp.zuSpanne('2,8 Mrd.'), 'über 500 Mio.');
gleich('Tausender werden erkannt', sp.zuSpanne('900 TEUR'), '0,5 bis 1 Mio.');
gleich('auch mit Eurozeichen', sp.zuSpanne('900 T€'), '0,5 bis 1 Mio.');
gleich('sehr kleiner Betrag', sp.zuSpanne('120000'), 'unter 0,25 Mio.');
gleich('genau auf einer Stufe', sp.zuSpanne('10 Mio.'), '10 bis 15 Mio.');

// Eine bestehende Spanne bleibt unveraendert, sonst waere aus
// "5 bis 10 Mio." plötzlich "5 bis 10 Mio." mit falscher Untergrenze geworden.
for (const s of ['5 bis 10 Mio.', '€ 10–20 Mio.', 'ab 3 Mio.', 'unter 1 Mio.', 'über 50 Mio.', '1-3 Mio.']) {
  gleich(`unveraendert: ${s}`, sp.zuSpanne(s), s);
}
gleich('leer bleibt k. A.', sp.zuSpanne(''), 'k. A.');
gleich('null bleibt k. A.', sp.zuSpanne(null), 'k. A.');

// Der Kern der Korrektur: Was kein Geldbetrag ist, wird nicht umgerechnet,
// sondern bleibt stehen. Im Marktplatz stand sonst "EBITDA über 500 Mio."
// bei einem Unternehmen mit 10 bis 13 Mio. Umsatz.
gleich('Freitext bleibt stehen', sp.zuSpanne('auf Anfrage'), 'auf Anfrage');
gleich('eine Marge bleibt eine Marge', sp.zuSpanne('ca. 8 %'), 'ca. 8 %');
gleich('Marge mit Zusatz bleibt stehen', sp.zuSpanne('12 % Marge'), '12 % Marge');
gleich('eine Jahreszahl wird nicht zu Millionen', sp.zuSpanne('2025'), '2025');
gleich('eine kleine blanke Zahl bleibt stehen', sp.zuSpanne('800'), '800');
gleich('EBIT-Marge mit Klammerzusatz bleibt stehen',
  sp.zuSpanne('14-15 % EBIT-Marge (Branche 8-10 %)'), '14-15 % EBIT-Marge (Branche 8-10 %)');

ok('Prozent ist kein Betrag', !sp.istBetrag('ca. 8 %'));
ok('eine Jahreszahl ist kein Betrag', !sp.istBetrag('2025'));
ok('mit Waehrung ist es ein Betrag', sp.istBetrag('8.400.000 EUR'));
ok('mit Einheit ist es ein Betrag', sp.istBetrag('0,9 Mio.'));
ok('eine blanke Zahl ab Zehntausend ist ein Betrag', sp.istBetrag('8400000'));

// ── Mitarbeitende ───────────────────────────────────────────────────────────
gleich('34 Mitarbeitende', sp.mitarbeiterSpanne(34), '25 bis 50');
gleich('3 Mitarbeitende', sp.mitarbeiterSpanne(3), '1 bis 5');
gleich('2000 Mitarbeitende', sp.mitarbeiterSpanne(2000), 'über 1000');
gleich('null ergibt nichts', sp.mitarbeiterSpanne(0), null);
gleich('Text ergibt nichts', sp.mitarbeiterSpanne('viele'), null);

// ── Wer darf aufloesen ──────────────────────────────────────────────────────
ok('ohne Anmeldung nicht', !sp.darfAufloesen(null));
ok('angemeldet, aber nicht freigeschaltet: nicht', !sp.darfAufloesen({ role: 'buyer', is_approved: 0, is_active: 1 }));
ok('freigeschaltet, aber inaktiv: nicht', !sp.darfAufloesen({ role: 'buyer', is_approved: 1, is_active: 0 }));
ok('freigeschaltet und aktiv: ja', sp.darfAufloesen({ role: 'buyer', is_approved: 1, is_active: 1 }));
ok('das Team sieht immer alles', sp.darfAufloesen({ role: 'advisor', is_approved: 0 }));

// ── Eine ganze Zeile ────────────────────────────────────────────────────────
const zeile = {
  id: 7, codename: 'FARADAY', industry: 'Elektrotechnik', region: 'Bayern',
  revenue_band: '8400000', ebitda_band: '1100000', investment_needed: '3000000',
  location_city: 'Erlangen', highlights: ['Kundenliste', 'Halle in Erlangen'],
  post_money_valuation: '12 Mio.', equity_stake: '30 %', employees: 34,
  short_description: 'Inhabergeführter Betrieb',
};

const draussen = sp.fuerOeffentlich(zeile, null);
gleich('ohne Anmeldung: Umsatz als Spanne', draussen.revenue_band, '5 bis 10 Mio.');
gleich('ohne Anmeldung: EBITDA als Spanne', draussen.ebitda_band, '1 bis 2 Mio.');
gleich('ohne Anmeldung: Runde als Spanne', draussen.investment_needed, '3 bis 5 Mio.');
gleich('ohne Anmeldung: Mitarbeitende als Spanne', draussen.employees, '25 bis 50');
ok('ohne Anmeldung: keine Stadt', !('location_city' in draussen));
ok('ohne Anmeldung: keine Highlights', !('highlights' in draussen));
ok('ohne Anmeldung: keine Bewertung', !('post_money_valuation' in draussen));
ok('ohne Anmeldung: kein Anteil', !('equity_stake' in draussen));
ok('Deckname und Branche bleiben', draussen.codename === 'FARADAY' && draussen.industry === 'Elektrotechnik');
ok('die Region bleibt, sie ist grob genug', draussen.region === 'Bayern');
gleich('das Kennzeichen sagt, dass nicht aufgeloest wurde', draussen.aufgeloest, false);
ok('die Vorlage wurde nicht veraendert', zeile.location_city === 'Erlangen' && zeile.revenue_band === '8400000');

const drinnen = sp.fuerOeffentlich(zeile, { role: 'buyer', is_approved: 1, is_active: 1 });
gleich('freigeschaltet: exakter Umsatz', drinnen.revenue_band, '8400000');
gleich('freigeschaltet: Stadt sichtbar', drinnen.location_city, 'Erlangen');
gleich('freigeschaltet: Highlights sichtbar', (drinnen.highlights || []).length, 2);
gleich('freigeschaltet: Kennzeichen gesetzt', drinnen.aufgeloest, true);

console.log(fail ? `\n${fail} Fehler` : '\nAlle Prüfungen bestanden');
process.exit(fail ? 1 : 0);
