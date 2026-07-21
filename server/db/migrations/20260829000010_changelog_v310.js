/** Changelog v0.310 (Lead-Herkunft im Detail, Freigabe vor dem Veröffentlichen). */
const ENTRY = {
  version: 'v0.310', released_on: '2026-07-21',
  title: 'Lead-Herkunft im Detail, Freigabe vor dem Veröffentlichen',
  items: [
    'Die Herkunft der Kontakte zeigt jetzt zusätzlich, was konkret hereinkam: Kontakt, Quelle, Eingangsreferenz, Mandat, Art und Datum',
    'Kontakt und Mandat sind aus der Liste direkt anspringbar',
    'Veröffentlichen eines Entwurfs verlangt jetzt eine ausdrückliche Freigabe mit Nennung der Folgen',
    'Fehlende Pflichtangaben werden vor der Freigabe benannt, ebenso die Erinnerung an die Anonymitätsprüfung',
    'Bei vertraulichen Mandaten weist die Freigabe darauf hin, dass weder Matching noch Newsletter ausgelöst werden',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
