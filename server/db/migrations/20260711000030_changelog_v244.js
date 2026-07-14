/** Changelog-Eintrag v0.244 (Dokument-Upload, vollständige Exposés, Exposé-PDF-Upload). */
const ENTRY = {
  version: 'v0.244', released_on: '2026-07-11',
  title: 'Dokumente hochladen, vollständige Exposés & Exposé-PDF-Upload',
  items: [
    'Dateien lassen sich jetzt auch an bereits angelegte Dokumente hängen (Teaser, IM), inkl. Ersetzen',
    'Exposés für „Betongold" und „Cudd" vollständig ausgefüllt (DUB-Eckdaten + alle Sektionen)',
    'Fertiges Exposé als PDF hochladbar: landet im Safe und wird statt des generierten PDFs ausgeliefert',
    'Dokumentliste zeigt an, wenn zu einem Eintrag noch keine Datei hinterlegt ist',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
