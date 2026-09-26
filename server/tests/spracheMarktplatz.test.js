// ─────────────────────────────────────────────────────────────────────────────
// Sprache auf dem Marktplatz (v0.410).
//
// Geprüft wird die Reihenfolge, in der Sprache und Spannen greifen, und der
// Grundsatz, dass ein ungeprüfter Text nie nach draußen geht.
// ─────────────────────────────────────────────────────────────────────────────
const u = require('../utils/uebersetzung');
const sp = require('../utils/spannen');

let fail = 0;
const ok = (n, c) => { console.log((c ? '✓' : '✗ FEHLER') + ' ' + n); if (!c) fail++; };
const gleich = (n, a, b) => ok(n + (a === b ? '' : `  (war: ${JSON.stringify(a)}, erwartet: ${JSON.stringify(b)})`), a === b);

const FELDER = ['short_description', 'deal_type', 'industry', 'highlights'];

// So kommt eine Zeile aus der Datenbank, nachdem beide Migrationen gelaufen sind.
const faraday = {
  id: 2, codename: 'FARADAY', sprache: 'de', uebersetzung_status: 'entwurf',
  short_description: 'Etablierter Elektrotechnik- und Energiedienstleister.',
  short_description_en: 'Established electrical engineering and energy services provider.',
  deal_type: 'Nachfolge', deal_type_en: 'Succession',
  industry: 'Elektrotechnik', industry_en: null,
  revenue_band: '8400000', ebitda_band: 'ca. 8 %', location_city: 'Erlangen',
};

// ── Entwurf geht nicht nach draußen ─────────────────────────────────────────
const a = u.inSprache(faraday, FELDER, 'en');
gleich('ein Entwurf wird englischen Lesern nicht gezeigt', a.short_description, faraday.short_description);
gleich('das Kennzeichen sagt, in welcher Sprache der Text ist', a.text_sprache, 'de');

// ── Freigegeben wird gezeigt ────────────────────────────────────────────────
const frei = { ...faraday, uebersetzung_status: 'freigegeben' };
const b = u.inSprache(frei, FELDER, 'en');
gleich('freigegeben wird gezeigt', b.short_description, faraday.short_description_en);
gleich('auch die Transaktionsart', b.deal_type, 'Succession');
gleich('ein Feld ohne englische Fassung bleibt deutsch', b.industry, 'Elektrotechnik');
gleich('deutsche Leser bekommen deutsch', u.inSprache(frei, FELDER, 'de').short_description, faraday.short_description);

// ── Reihenfolge: erst Sprache, dann Spannen ─────────────────────────────────
// Andersherum liefe die englische Fassung an der Vergroeberung vorbei, und ein
// nicht angemeldeter englischer Leser saehe exakte Zahlen.
const draussen = sp.fuerOeffentlich(u.inSprache(frei, FELDER, 'en'), null);
gleich('der Umsatz ist auch auf Englisch eine Spanne', draussen.revenue_band, '5 bis 10 Mio.');
gleich('eine Marge bleibt eine Marge', draussen.ebitda_band, 'ca. 8 %');
ok('die Stadt bleibt auch auf Englisch verborgen', !('location_city' in draussen));
gleich('und der Text ist der englische', draussen.short_description, faraday.short_description_en);

// ── Englisch erfasstes Mandat ───────────────────────────────────────────────
const cavendish = {
  sprache: 'en', uebersetzung_status: 'entwurf',
  short_description: 'Deutscher Deep-Tech-Entwickler.',
  short_description_en: 'German deep-tech developer.',
};
const c = u.inSprache(cavendish, FELDER, 'en');
gleich('bei englischer Erfassung gilt die Grundspalte trotzdem als Deutsch',
  c.short_description, 'Deutscher Deep-Tech-Entwickler.');
gleich('und wird als deutsch gekennzeichnet', c.text_sprache, 'de');

const d = u.inSprache({ ...cavendish, uebersetzung_status: 'freigegeben' }, FELDER, 'en');
gleich('nach Freigabe sieht der englische Leser Englisch', d.short_description, 'German deep-tech developer.');

console.log(fail ? `\n${fail} Fehler` : '\nAlle Prüfungen bestanden');
process.exit(fail ? 1 : 0);
