/**
 * Strukturierte Anschrift am Kontakt (v0.400).
 *
 * Bisher gab es am Kontakt nur `location`, ein Freitextfeld. Was aus einem
 * Marktplatz hereinkam („Albrecht-Dürer-Straße 42, 15732 Schulzendorf,
 * Deutschland"), stand dort als ein Satz und war für Serienbriefe, für die
 * Sortierung nach Region und für eine spätere Übergabe an den Datenpool nicht
 * zu gebrauchen.
 *
 * Die Firmentabelle hat street, postal_code, city und country längst. Der
 * Kontakt bekommt sie jetzt auch, mit denselben Namen. `location` bleibt als
 * lesbare Zeile bestehen und wird aus den Feldern gebaut, damit bestehende
 * Ansichten und Exporte weiterlaufen.
 */
const SPALTEN = ['street', 'postal_code', 'city', 'country'];

exports.up = async function (knex) {
  for (const name of SPALTEN) {
    const da = await knex.schema.hasColumn('crm_contacts', name).catch(() => false);
    if (!da) await knex.schema.alterTable('crm_contacts', (t) => t.text(name));
  }
  await knex.raw('CREATE INDEX IF NOT EXISTS crm_contacts_city_idx ON crm_contacts (lower(city))').catch(() => {});
  await knex.raw('CREATE INDEX IF NOT EXISTS crm_contacts_country_idx ON crm_contacts (country)').catch(() => {});
};

exports.down = async function (knex) {
  await knex.raw('DROP INDEX IF EXISTS crm_contacts_country_idx').catch(() => {});
  await knex.raw('DROP INDEX IF EXISTS crm_contacts_city_idx').catch(() => {});
  for (const name of SPALTEN) {
    const da = await knex.schema.hasColumn('crm_contacts', name).catch(() => false);
    if (da) await knex.schema.alterTable('crm_contacts', (t) => t.dropColumn(name));
  }
};
