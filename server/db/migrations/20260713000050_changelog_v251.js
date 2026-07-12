/** Changelog-Eintrag v0.251 (Birdview + CRM-Zusammenführung & Kontaktpflege). */
const ENTRY = {
  version: 'v0.251', released_on: '2026-07-13',
  title: 'Birdview, Unternehmen zusammenführen & Kontaktpflege',
  items: [
    'Birdview: Administratoren können die Plattform aus Sicht eines Nutzers ansehen — streng schreibgeschützt und revisionssicher protokolliert',
    'Deutlich sichtbares Banner während der Ansicht, Rückkehr jederzeit mit einem Klick',
    'CRM: doppelte Unternehmen zusammenführen (Kontakte, Funnel-Einträge und Angaben wandern mit)',
    'CRM: Kontakte direkt aus der Unternehmensansicht pflegen; Unternehmens-Kontaktdaten auf einen Blick',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
