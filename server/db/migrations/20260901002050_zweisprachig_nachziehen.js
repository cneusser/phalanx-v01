/**
 * Die zweisprachigen Spalten nachziehen (v0.467).
 *
 * Anlass: Der Abschnitt „Übersetzungen der Mandate" in der Datenpflege fehlte
 * vollständig. Er fehlte nicht, er war kaputt: Die Abfrage dahinter antwortete
 * mit 500, und die Oberfläche fing das mit einem leeren catch ab. Niemand
 * konnte eine englische Fassung pflegen, und niemand sah einen Grund.
 *
 * Die Wanderung von v0.410 legt die _en-Spalten nur an, wenn die deutsche
 * Spalte zu diesem Zeitpunkt schon bestand, und das Statusfeld nur, wenn es
 * noch fehlte. Lief sie vor einer dieser Spalten oder brach sie mittendrin
 * ab, blieb der Rest aus, und zwar unbemerkt: Eine halb ausgeführte Wanderung
 * gilt als ausgeführt und läuft nie wieder.
 *
 * Diese Wanderung prüft den Endzustand statt den Verlauf. Sie legt an, was
 * fehlt, und lässt in Ruhe, was da ist. Mehrfaches Ausführen schadet nicht.
 */
const FELDER = [
  ['projects', ['short_description', 'highlights', 'deal_type', 'industry']],
  ['project_details', ['full_description', 'growth_strategy', 'key_risks']],
];

exports.up = async function (knex) {
  const nachgezogen = [];
  for (const [tabelle, spalten] of FELDER) {
    if (!(await knex.schema.hasTable(tabelle))) continue;
    for (const spalte of spalten) {
      // Die deutsche Spalte kann inzwischen bestehen, auch wenn sie es
      // damals nicht tat. Deshalb wird sie hier mitgeprüft und nicht
      // vorausgesetzt.
      if (!(await knex.schema.hasColumn(tabelle, spalte))) continue;
      const en = `${spalte}_en`;
      if (!(await knex.schema.hasColumn(tabelle, en))) {
        await knex.schema.alterTable(tabelle, (t) => { t.text(en); });
        nachgezogen.push(`${tabelle}.${en}`);
      }
    }
    if (!(await knex.schema.hasColumn(tabelle, 'uebersetzung_status'))) {
      await knex.schema.alterTable(tabelle, (t) => {
        t.text('uebersetzung_status').notNullable().defaultTo('fehlt');
      });
      nachgezogen.push(`${tabelle}.uebersetzung_status`);
    }
    if (!(await knex.schema.hasColumn(tabelle, 'uebersetzt_am'))) {
      await knex.schema.alterTable(tabelle, (t) => { t.timestamp('uebersetzt_am', { useTz: true }); });
      nachgezogen.push(`${tabelle}.uebersetzt_am`);
    }
  }
  if (!(await knex.schema.hasColumn('projects', 'sprache'))) {
    await knex.schema.alterTable('projects', (t) => { t.text('sprache').notNullable().defaultTo('de'); });
    nachgezogen.push('projects.sprache');
  }
  if (nachgezogen.length) {
    console.log(`🗣️  Zweisprachigkeit nachgezogen: ${nachgezogen.join(', ')}`);
  }
};

// Absichtlich ohne Rückweg: Diese Wanderung legt nur an, was ohnehin da sein
// sollte. Sie wieder zu entfernen hiesse, den Fehler wiederherzustellen.
exports.down = async function () {};
