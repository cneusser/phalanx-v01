/** Changelog v0.472 (Hinweis statt Leerstelle beim Übersetzungsdienst). */
const ENTRY = {
  version: 'v0.472', released_on: '2026-11-14',
  title: 'Wenn der Knopf fehlt, soll dastehen warum',
  items: [
    'In der Datenpflege stand bisher nur, dass kein Übersetzungsdienst eingerichtet ist. Was zu tun wäre, stand nirgends, und der Knopf "Vorbelegen" war einfach weg',
    'Jetzt nennt der Hinweis die beiden Einstellungen, mit denen der Dienst läuft, und sagt dazu, dass Vorbelegtes Entwurf bleibt und nie ungeprüft nach aussen geht',
    'Am Verhalten ändert sich nichts: ohne Schlüssel keine Vorbelegung, vorhandene englische Fassungen werden nie überschrieben',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
