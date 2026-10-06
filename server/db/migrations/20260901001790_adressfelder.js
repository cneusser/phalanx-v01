/**
 * Adressfelder nach deutschem Standard (v0.447).
 *
 * Bisher stand die Anschrift in `street`, `postal_code`, `city`, `country`, und
 * die Hausnummer klebte am Straßennamen. Das reicht für einen Brief und für
 * nichts sonst: Man kann nicht nach Straßen sortieren, keine Hausnummer
 * korrigieren und keine Adresse mit einem anderen System vergleichen.
 *
 * Die Feldnamen sind verbindlich, weil Phalanx OS und Expert Network dieselben
 * verwenden. Drei Festlegungen, die dabei leicht falsch gemacht werden:
 *
 *   · `plz` ist Text, keine Zahl. 01067 wäre als Zahl 1067, und Dresden läge
 *     dann in der Nähe von Bad Salzdetfurth.
 *   · `hausnummer` ist Text, keine Zahl. „28a", „12 bis 14" und „5/7" sind
 *     Hausnummern und keine Zahlen.
 *   · `land` ist zwei Zeichen nach ISO 3166-1 alpha-2. „Deutschland",
 *     „Germany" und „GER" meinen dasselbe und lassen sich nicht vergleichen;
 *     „DE" schon.
 *
 * Die alten Spalten bleiben. Sie sind die Quelle für die spätere Zerlegung und
 * zugleich der Rückweg, falls eine Zerlegung schiefgeht. Gelöscht wird erst,
 * wenn jede Adresse bestätigt ist, und das entscheidet ein Mensch.
 */
exports.up = async function (knex) {
  const spalten = [
    ['strasse', (t) => t.string('strasse', 200)],
    ['hausnummer', (t) => t.string('hausnummer', 20)],
    ['adresszusatz', (t) => t.string('adresszusatz', 200)],
    ['plz', (t) => t.string('plz', 10)],
    ['ort', (t) => t.string('ort', 120)],
    ['land', (t) => t.string('land', 2).defaultTo('DE')],
    ['adresse_quelle', (t) => t.string('adresse_quelle', 40)],
    ['adresse_am', (t) => t.timestamp('adresse_am', { useTz: true })],
  ];
  for (const [name, bauen] of spalten) {
    if (!(await knex.schema.hasColumn('crm_companies', name))) {
      await knex.schema.alterTable('crm_companies', bauen);
    }
  }
  // Nach Ort und Postleitzahl wird gesucht, nach dem Land gefiltert.
  await knex.raw('CREATE INDEX IF NOT EXISTS crm_companies_ort_idx ON crm_companies (ort)').catch(() => {});
  await knex.raw('CREATE INDEX IF NOT EXISTS crm_companies_plz_idx ON crm_companies (plz)').catch(() => {});
};

exports.down = async function (knex) {
  await knex.raw('DROP INDEX IF EXISTS crm_companies_plz_idx').catch(() => {});
  await knex.raw('DROP INDEX IF EXISTS crm_companies_ort_idx').catch(() => {});
  for (const name of ['adresse_am', 'adresse_quelle', 'land', 'ort', 'plz', 'adresszusatz', 'hausnummer', 'strasse']) {
    if (await knex.schema.hasColumn('crm_companies', name)) {
      await knex.schema.alterTable('crm_companies', (t) => t.dropColumn(name));
    }
  }
};
