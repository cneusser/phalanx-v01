/**
 * Changelog-Eintrag für v0.236 (Sprint-10-Rest + Kontakt/Robot-Schutz).
 * Idempotent: nur einfügen, wenn die Version noch nicht existiert.
 */
const ENTRY = {
  version: 'v0.236',
  released_on: '2026-07-05',
  title: 'Käufer-Cockpit, Merkliste & Kontakt',
  items: [
    'Marktplatz: Tabellenansicht, Suchprofile mit Umsatz-/EBITDA-Filter',
    'Merkliste mit eigenen Tags und Notizen je Mandat',
    'Digest-Mails (täglich/wöchentlich) für passende neue Mandate',
    'Neue Kontaktseite und Robot-/Spam-Schutz für Nachrichten',
    'Links in E-Mails auf capitalmatch.de umgestellt',
  ],
};

exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) {
    await knex('changelog').insert({
      tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on,
      title: ENTRY.title, items_json: JSON.stringify(ENTRY.items),
    });
  }
};

exports.down = async function (knex) {
  await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {});
};
