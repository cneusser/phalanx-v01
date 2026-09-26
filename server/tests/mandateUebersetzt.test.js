// ─────────────────────────────────────────────────────────────────────────────
// Übersetzung des Mandatsbestands (v0.410).
//
// Der heikle Teil ist der Umzug: Bei einem englisch erfassten Mandat steht der
// englische Text in der Grundspalte, die eigentlich Deutsch führen soll. Er muss
// in die _en-Spalte wandern, bevor die deutsche Fassung die Grundspalte belegt.
// Geht dabei etwas schief, ist ein Mandatstext verloren.
// ─────────────────────────────────────────────────────────────────────────────
const migration = require('../db/migrations/20260901001380_mandate_uebersetzt');

let fail = 0;
const ok = (n, c) => { console.log((c ? '✓' : '✗ FEHLER') + ' ' + n); if (!c) fail++; };
const gleich = (n, a, b) => ok(n + (a === b ? '' : `  (war: ${JSON.stringify(a)}, erwartet: ${JSON.stringify(b)})`), a === b);

// Eine Ablage im Speicher, die sich wie knex verhält, soweit die Migration sie nutzt.
function fakeKnex(zeilen) {
  const f = (tabelle) => ({
    select: async () => zeilen.map((z) => ({ ...z })),
    where: (bed) => ({
      update: async (patch) => {
        const z = zeilen.find((x) => (bed.id !== undefined ? x.id === bed.id : x.codename === bed.codename));
        if (z) Object.assign(z, patch);
        return 1;
      },
      catch: () => {},
    }),
  });
  f.fn = { now: () => 'JETZT' };
  return f;
}

// Der Bestand, wie er heute in der Datenbank steht: alle Spalten vorhanden,
// die englischen leer.
const spalten = (extra) => ({
  short_description_en: null, deal_type_en: null, industry_en: null,
  highlights_en: null, uebersetzung_status: 'fehlt', uebersetzt_am: null, ...extra,
});

(async () => {
  const zeilen = [
    spalten({
      id: 1, codename: 'Cavendish', sprache: 'de',
      short_description: 'German deep-tech developer of next-generation PEM electrolyzer stacks.',
      deal_type: 'Seed financing (equity)',
      industry: 'CleanTech / Green Hydrogen (PEM electrolyzer stacks)',
    }),
    spalten({
      id: 2, codename: 'FARADAY', sprache: 'de',
      short_description: 'Etablierter Elektrotechnik- und Energiedienstleister.',
      deal_type: 'Nachfolge', industry: 'Elektrotechnik / Energiedienstleistung',
    }),
    spalten({ id: 3, codename: 'Unbekannt', sprache: 'de', short_description: 'Etwas.', deal_type: 'x', industry: 'y' }),
  ];

  await migration.up(fakeKnex(zeilen));
  const [cav, far, unb] = zeilen;

  // ── Englisch erfasst: Umzug ───────────────────────────────────────────────
  gleich('Cavendish wird als englisch erfasst markiert', cav.sprache, 'en');
  ok('der englische Text ist in die englische Spalte gewandert',
    /German deep-tech developer/.test(cav.short_description_en || ''));
  ok('die Grundspalte fuehrt jetzt Deutsch',
    /Deutscher Deep-Tech-Entwickler/.test(cav.short_description || ''));
  ok('der englische Text ist nicht verloren gegangen',
    (cav.short_description_en || '').length > 100);
  gleich('auch die Transaktionsart ist umgezogen', cav.deal_type_en, 'Seed financing (equity)');
  gleich('und liegt auf Deutsch vor', cav.deal_type, 'Seed-Finanzierung (Eigenkapital)');
  ok('die Branche ebenso', /Green Hydrogen/.test(cav.industry_en || '') && /Wasserstoff/.test(cav.industry || ''));

  // ── Deutsch erfasst: nur ergaenzen ────────────────────────────────────────
  gleich('FARADAY bleibt deutsch erfasst', far.sprache, 'de');
  gleich('der deutsche Text bleibt unangetastet', far.short_description, 'Etablierter Elektrotechnik- und Energiedienstleister.');
  ok('die englische Fassung kam dazu', /Established electrical engineering/.test(far.short_description_en || ''));
  gleich('die deutsche Transaktionsart bleibt', far.deal_type, 'Nachfolge');
  gleich('die englische kam dazu', far.deal_type_en, 'Succession');

  // ── Status ────────────────────────────────────────────────────────────────
  gleich('Cavendish steht als Entwurf', cav.uebersetzung_status, 'entwurf');
  gleich('FARADAY steht als Entwurf', far.uebersetzung_status, 'entwurf');
  ok('nichts steht ungeprueft auf freigegeben',
    zeilen.every((z) => z.uebersetzung_status !== 'freigegeben'));

  // ── Unbekanntes Mandat ────────────────────────────────────────────────────
  gleich('ein Mandat ohne hinterlegte Uebersetzung bleibt unberuehrt', unb.uebersetzung_status, 'fehlt');
  gleich('und behaelt seinen Text', unb.short_description, 'Etwas.');

  // ── Zweiter Durchlauf darf nichts verschieben ─────────────────────────────
  const vorher = JSON.stringify(zeilen);
  await migration.up(fakeKnex(zeilen));
  gleich('ein zweiter Durchlauf aendert nichts mehr', JSON.stringify(zeilen), vorher);

  // ── Was schon von Hand dasteht, bleibt ────────────────────────────────────
  const eigene = [spalten({
    id: 9, codename: 'FARADAY', sprache: 'de',
    short_description: 'Deutsch.', deal_type: 'Nachfolge', industry: 'Technik',
    short_description_en: 'My own English text.',
  })];
  await migration.up(fakeKnex(eigene));
  gleich('eine eigene Fassung wird nicht ueberschrieben', eigene[0].short_description_en, 'My own English text.');

  console.log(fail ? `\n${fail} Fehler` : '\nAlle Prüfungen bestanden');
  process.exit(fail ? 1 : 0);
})();
