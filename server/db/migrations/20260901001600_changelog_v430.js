/** Changelog v0.430 (Upload meldet, was wirklich angelegt wurde). */
const ENTRY = {
  version: 'v0.430', released_on: '2026-09-30',
  title: 'Upload meldet, was wirklich angelegt wurde',
  items: [
    'Der Datenraum meldete "20 Datei(en) hochgeladen", und es lag keine einzige da. Ursache war eine Zeile in der Zählung der Vorversion: bei einer leeren Bestätigungsliste nahm sie die Paketgröße an. Damit sah ein vollständiger Ausfall aus wie ein vollständiger Erfolg',
    'Gezählt wird jetzt ausschließlich, was der Server bestätigt. Meldet er null angelegte Dateien, steht genau das dort, zusammen mit seiner Antwort',
    'Die Erfolgsmeldung nennt die ersten angelegten Dateinamen. Ein Name ist ein Beleg, eine Zahl nur eine Behauptung',
    'Pakete mit unklarer Antwort werden in der Meldung aufgeführt statt stillschweigend als Erfolg verbucht',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
