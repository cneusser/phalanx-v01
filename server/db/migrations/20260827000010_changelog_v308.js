/** Changelog v0.308 (Suchprofile am Kontakt, Sprung in die Firma). */
const ENTRY = {
  version: 'v0.308', released_on: '2026-07-21',
  title: 'Suchprofile am Kontakt, Sprung in die Firma',
  items: [
    'Der Kontakt zeigt jetzt das Käuferprofil und die gespeicherten Suchen des verknüpften Plattform-Kontos',
    'Der Investitionsschwerpunkt aus dem CRM steht direkt daneben und ist dort pflegbar',
    'Unternehmensname in der Kontaktliste und im Kontakt ist klickbar und öffnet das Unternehmen',
    'Auch die Admin-Nutzerliste springt über die Firma ins CRM',
    'Neue Deeplinks: /crm?company= öffnet ein Unternehmen, /crm?q= sucht danach',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
