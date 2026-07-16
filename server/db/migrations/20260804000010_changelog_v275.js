/** Changelog v0.275 (Automatik bis zur NDA, Plattform-Herkunft sichtbar). */
const ENTRY = {
  version: 'v0.275', released_on: '2026-08-04',
  title: 'Automatik bis zur NDA, Plattform-Herkunft sichtbar',
  items: [
    'Die Einladung erklärt CapitalMatch als eigene Abwicklungsplattform, lädt zur Registrierung ein und nennt die automatische NDA nach der Registrierung',
    'Registriert sich ein angesprochener Kontakt zu einem Mandat, gehen Interesse, NDA-Anfrage und die NDA-Einladung automatisch raus; die Datenraum-Freigabe bleibt manuell',
    'Im Deal-Funnel zeigt jede Karte die Herkunftsplattform, oben eine Übersicht „Plattform-Leads" je Quelle',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
