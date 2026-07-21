/** Changelog v0.296 (Freigabe Verkäufer, Namen im Verkäuferblick, Pflege-Spalte). */
const ENTRY = {
  version: 'v0.296', released_on: '2026-07-21',
  title: 'Freigabe durch den Verkäufer, Namen im Verkäuferblick',
  items: [
    'Neuer Funnelschritt „Freigabe Verkäufer" zwischen Longlist und Angesprochen: recherchierte Kandidaten werden dem Mandanten vorgelegt',
    'Freigabe-Karte im Verkäufer-Cockpit: Kandidaten mit Namen freigeben oder ablehnen, weiterhin ohne Kontaktdaten',
    'Nexora: alle recherchierten Kandidaten liegen jetzt beim zugeordneten Verkäufer zur Freigabe',
    'Der Verkäufer sieht die Namen seiner Interessenten wieder, Kontaktdaten bleiben verborgen',
    'Admin-Projektliste zeigt die Pflegeberechtigten je Mandat; ein Klick öffnet den Kontakt im CRM, dort Bearbeiten und Birdview',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
