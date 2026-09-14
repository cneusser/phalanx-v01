/** Changelog v0.387 (NDA-Prozess: Unterschrift vor Datenraum-Freigabe). */
const ENTRY = {
  version: 'v0.387', released_on: '2026-07-23',
  title: 'NDA: Unterschrift vor Datenraum-Freigabe',
  items: [
    'Der Button „Freigeben" (Datenraum) erscheint erst, wenn der Käufer den NDA online unterschrieben hat. Für M&A-Mandate ist die Direktfreigabe ohne Unterschrift nicht mehr möglich',
    'Klarer Ablauf: „Versenden" schickt dem Käufer die Signier-Mail, der Käufer zeichnet online (§10), danach steht die Freigabe zur Verfügung; ein Status „Wartet auf Unterschrift" macht das sichtbar',
    'Neu „Unterschrift anfordern": für Altfälle, die ohne Unterschrift direkt freigegeben wurden, lässt sich die Signatur nachträglich einholen; der bestehende Zugang bleibt dabei erhalten',
    'Startup-Finanzierungen bleiben ausgenommen, dort ersetzt die ausdrückliche Freigabe die Unterschrift wie bisher',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
