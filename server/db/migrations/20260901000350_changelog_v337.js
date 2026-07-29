/** Changelog v0.337 (Datensafe Stufe 1: Zugriffsbericht und sichere Vorschau). */
const ENTRY = {
  version: 'v0.337', released_on: '2026-07-21',
  title: 'Datensafe: Zugriffsbericht und sichere Vorschau',
  items: [
    'Jede Ansicht und jeder Download einer Safe-Datei wird revisionssicher protokolliert (wer, welches Dokument, wann, welche Aktion)',
    'Neuer Zugriffsbericht im Safe (nur für Pfleger): nach Person und nach Dokument, mit Ansichten, Downloads und letztem Zugriff. Grundlage für die Interessen-Heatmap je Bieter',
    'Sichere Vorschau: PDFs werden mit einem Wasserzeichen auf den Betrachter gestempelt und nur zur Ansicht geöffnet, statt sie herunterzuladen',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
