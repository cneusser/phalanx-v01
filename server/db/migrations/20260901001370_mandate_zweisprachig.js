/**
 * Mandatstexte zweisprachig (v0.410).
 *
 * Auf dem Marktplatz standen deutsche und englische Teaser nebeneinander, weil
 * jeder Text nur in der Sprache vorlag, in der er erfasst wurde. Eine
 * Sprachumschaltung allein löst das nicht: Was es nur einmal gibt, lässt sich
 * nicht umschalten.
 *
 * Deshalb bekommt jedes sichtbare Textfeld eine zweite Fassung. Die bisherigen
 * Spalten bleiben die deutsche Fassung und werden nicht angefasst, damit der
 * Bestand unverändert bleibt und nichts nachträglich verschoben wird.
 *
 * `uebersetzung_status` sagt, woher die englische Fassung stammt:
 *   fehlt      es gibt keine, das Feld wird in der Datenpflege ausgewiesen
 *   entwurf    maschinell vorbelegt, noch nicht freigegeben
 *   freigegeben  von einem Menschen geprüft
 *
 * Gezeigt wird einem Besucher nur, was freigegeben ist. Ein maschineller
 * Entwurf bleibt intern. Bei einem Unternehmensverkauf ist ein schiefer Satz
 * kein Schönheitsfehler, sondern ein Sachfehler.
 */
const FELDER = [
  ['projects', ['short_description', 'highlights', 'deal_type']],
  ['project_details', ['full_description', 'growth_strategy', 'key_risks']],
];

exports.up = async function (knex) {
  for (const [tabelle, spalten] of FELDER) {
    const da = await knex.schema.hasTable(tabelle).catch(() => false);
    if (!da) continue;
    for (const spalte of spalten) {
      const hat = await knex.schema.hasColumn(tabelle, spalte).catch(() => false);
      if (!hat) continue;
      const neu = `${spalte}_en`;
      const schon = await knex.schema.hasColumn(tabelle, neu).catch(() => false);
      if (!schon) await knex.schema.alterTable(tabelle, (t) => { t.text(neu); });
    }
    const hatStatus = await knex.schema.hasColumn(tabelle, 'uebersetzung_status').catch(() => false);
    if (!hatStatus) {
      await knex.schema.alterTable(tabelle, (t) => {
        t.text('uebersetzung_status').notNullable().defaultTo('fehlt');
        t.timestamp('uebersetzt_am', { useTz: true });
      });
    }
  }

  // Die Ausgangssprache je Mandat. Bisher war sie nur implizit, und genau
  // deshalb fiel niemandem auf, dass ein Teaser auf Englisch erfasst war.
  const hatSprache = await knex.schema.hasColumn('projects', 'sprache').catch(() => false);
  if (!hatSprache) {
    await knex.schema.alterTable('projects', (t) => { t.text('sprache').notNullable().defaultTo('de'); });
  }

  // Wer erkennbar englisch erfasst hat, wird als solcher markiert. Erkannt wird
  // nur, was eindeutig ist; im Zweifel bleibt es bei Deutsch.
  const zeilen = await knex('projects').select('id', 'short_description').catch(() => []);
  let englisch = 0;
  for (const z of zeilen) {
    const t = String(z.short_description || '').toLowerCase();
    if (!t) continue;
    const enWorte = (t.match(/\b(the|and|with|company|market|growth|revenue|founder|stacks|signed)\b/g) || []).length;
    const deWorte = (t.match(/\b(und|der|die|das|mit|Unternehmen|Umsatz|Inhaber|Marke|Nachfolge)\b/gi) || []).length;
    if (enWorte >= 3 && enWorte > deWorte) {
      await knex('projects').where({ id: z.id }).update({ sprache: 'en' }).catch(() => {});
      englisch += 1;
    }
  }
  console.log(`🌍 Mandate zweisprachig vorbereitet: ${zeilen.length} geprüft, ${englisch} als englisch erfasst erkannt.`);
};

exports.down = async function (knex) {
  for (const [tabelle, spalten] of FELDER) {
    const da = await knex.schema.hasTable(tabelle).catch(() => false);
    if (!da) continue;
    for (const spalte of spalten) {
      const neu = `${spalte}_en`;
      const hat = await knex.schema.hasColumn(tabelle, neu).catch(() => false);
      if (hat) await knex.schema.alterTable(tabelle, (t) => t.dropColumn(neu));
    }
    for (const s of ['uebersetzung_status', 'uebersetzt_am']) {
      const hat = await knex.schema.hasColumn(tabelle, s).catch(() => false);
      if (hat) await knex.schema.alterTable(tabelle, (t) => t.dropColumn(s));
    }
  }
  const hatSprache = await knex.schema.hasColumn('projects', 'sprache').catch(() => false);
  if (hatSprache) await knex.schema.alterTable('projects', (t) => t.dropColumn('sprache'));
};

exports.FELDER = FELDER;
