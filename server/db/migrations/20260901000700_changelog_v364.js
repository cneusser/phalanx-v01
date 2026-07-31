/** Changelog v0.364 (Abgleich CRM-Kontakte und registrierte Nutzer). */
const ENTRY = {
  version: 'v0.364', released_on: '2026-07-21',
  title: 'CRM: Abgleich Kontakte und registrierte Nutzer',
  items: [
    'Neuer Button „Nutzer abgleichen" im CRM zeigt die Abweichler zwischen CRM-Kontakten und registrierten Nutzern und erklärt, warum sich „Einwilligung" und „Registrierte Nutzer" unterscheiden',
    'Registrierte Nutzer ohne CRM-Kontakt lassen sich mit einem Klick als Kontakt anlegen (verknüpft)',
    'Kontakte, zu denen bereits ein Konto existiert, aber die Verknüpfung fehlt, werden per eindeutiger E-Mail auf einmal verknüpft',
    'Kontakte mit Einwilligung ohne Konto werden gelistet, das erklärt, dass es mehr Einwilligungen als Nutzer geben kann',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
