// ─────────────────────────────────────────────────────────────────────────────
// Zweisprachige Mandatstexte (v0.410).
//
// Geprüft wird der Grundsatz: Nichts wird geraten, und nach außen geht nur,
// was ein Mensch freigegeben hat. Ein ungeprüfter englischer Teaser wäre bei
// einem Unternehmensverkauf ein Sachfehler, kein Schönheitsfehler.
// ─────────────────────────────────────────────────────────────────────────────
const u = require('../utils/uebersetzung');

let fail = 0;
const ok = (n, c) => { console.log((c ? '✓' : '✗ FEHLER') + ' ' + n); if (!c) fail++; };
const gleich = (n, a, b) => ok(n + (a === b ? '' : `  (war: ${JSON.stringify(a)}, erwartet: ${JSON.stringify(b)})`), a === b);

const FELDER = ['short_description', 'highlights'];

// ── Ohne eingerichteten Dienst ──────────────────────────────────────────────
delete process.env.UEBERSETZER_SCHLUESSEL;
ok('ohne Schlüssel gilt der Dienst als nicht eingerichtet', !u.eingerichtet());

(async () => {
  const r = await u.uebersetze('Ein Satz.');
  gleich('ohne Dienst kommt kein Text zurück', r.text, null);
  ok('der Grund steht im Klartext', /kein Übersetzungsdienst eingerichtet/.test(r.grund || ''));

  const leer = await u.uebersetze('   ');
  gleich('leerer Text ergibt keinen Versuch', leer.text, null);

  const vor = await u.felderVorbelegen(
    { short_description: 'Etablierter Betrieb.', highlights: 'Kundenliste' }, FELDER);
  gleich('ohne Dienst bleibt der Status fehlt', vor.status, 'fehlt');
  gleich('und es werden keine Werte erfunden', Object.keys(vor.werte).length, 0);
  gleich('jedes Feld meldet seinen Grund', vor.fehler.length, 2);

  // ── Mit einem vorgetäuschten Dienst ───────────────────────────────────────
  const echtesFetch = global.fetch;
  process.env.UEBERSETZER_SCHLUESSEL = 'test:fx';
  global.fetch = async () => ({
    ok: true,
    json: async () => ({ translations: [{ text: 'Established business.' }] }),
  });
  ok('mit Schlüssel gilt der Dienst als eingerichtet', u.eingerichtet());

  const mit = await u.felderVorbelegen(
    { short_description: 'Etablierter Betrieb.', highlights: 'Kundenliste' }, FELDER);
  gleich('zwei Felder werden vorbelegt', Object.keys(mit.werte).length, 2);
  gleich('das Ergebnis ist ein Entwurf, keine Freigabe', mit.status, 'entwurf');

  // Was ein Mensch geschrieben hat, ersetzt keine Maschine.
  const schon = await u.felderVorbelegen(
    { short_description: 'Etablierter Betrieb.', short_description_en: 'Handwritten.', highlights: '' },
    FELDER);
  gleich('vorhandene Fassung wird nicht überschrieben', Object.keys(schon.werte).length, 0);

  global.fetch = echtesFetch;
  delete process.env.UEBERSETZER_SCHLUESSEL;

  // ── Was der Besucher zu sehen bekommt ─────────────────────────────────────
  const deutsch = {
    sprache: 'de', short_description: 'Etablierter Betrieb.',
    short_description_en: 'Established business.', uebersetzung_status: 'entwurf',
  };
  const a = u.inSprache(deutsch, FELDER, 'en');
  gleich('ein Entwurf wird nicht gezeigt', a.short_description, 'Etablierter Betrieb.');
  gleich('und das Kennzeichen sagt, was es ist', a.text_sprache, 'de');

  const b = u.inSprache({ ...deutsch, uebersetzung_status: 'freigegeben' }, FELDER, 'en');
  gleich('freigegeben wird gezeigt', b.short_description, 'Established business.');
  gleich('Kennzeichen steht auf englisch', b.text_sprache, 'en');

  const c = u.inSprache({ ...deutsch, uebersetzung_status: 'freigegeben' }, FELDER, 'de');
  gleich('wer deutsch liest, bekommt deutsch', c.short_description, 'Etablierter Betrieb.');

  const englisch = { sprache: 'en', short_description: 'German deep-tech developer.' };
  const d = u.inSprache(englisch, FELDER, 'de');
  gleich('ein englisch erfasstes Mandat bleibt englisch, solange nichts vorliegt',
    d.short_description, 'German deep-tech developer.');
  gleich('das Kennzeichen sagt es ehrlich', d.text_sprache, 'en');

  ok('die Vorlage wird nie verändert', deutsch.short_description === 'Etablierter Betrieb.');

  console.log(fail ? `\n${fail} Fehler` : '\nAlle Prüfungen bestanden');
  process.exit(fail ? 1 : 0);
})();
