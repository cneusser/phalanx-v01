/** Changelog v0.273 (Copy-and-paste als Standardweg, Weiterleitung zurückgestellt). */
const ENTRY = {
  version: 'v0.273', released_on: '2026-08-03',
  title: 'Anfragen per Einfügen: der Standardweg',
  items: [
    'Das Einlesen von Marktplatz-Anfragen läuft per Copy-and-paste direkt in der Plattform, ohne Zusatztarif bei einem Maildienst',
    'Die E-Mail-Weiterleitung über Brevo (Inbound Parsing) ist zurückgestellt: sie setzt bei Brevo den Professional-Tarif voraus. Der Webhook bleibt im Code und ist einsatzbereit, sobald der Tarif vorliegt',
    'Klarstellung: Das Versenden der Ansprache-Mails nutzt die Transactional-Funktion und funktioniert unabhängig vom Inbound-Tarif',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
