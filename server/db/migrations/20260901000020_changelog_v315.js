/** Changelog v0.315 (Herkunft am Kontakt pflegbar, Einladung ohne Mandat klarer). */
const ENTRY = {
  version: 'v0.315', released_on: '2026-07-21',
  title: 'Herkunft manuell pflegen, Einladung ohne Mandat',
  items: [
    'Herkunft und Referenz eines Kontakts sind jetzt von Hand pflegbar, im Kontakt und beim Anlegen',
    'So lässt sich ein Lead, der nicht automatisch eingelesen wurde (z. B. DUB.de zu einem alten Projekt), sauber als solcher kennzeichnen',
    'Die Quelle hat Vorschläge (DUB.de, Recherche, Empfehlung, Netzwerk) und die Referenz nimmt die Inserats-Nummer auf',
    'Klargestellt: Die Einladung zur Plattform funktioniert unabhängig von einem Mandat. Der Knopf heißt jetzt „Zur Plattform einladen"',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
