/** Changelog-Eintrag v0.268 (Anrede + Mandat-Spalte im Mail-Ausgang). */
const ENTRY = {
  version: 'v0.268', released_on: '2026-07-21',
  title: 'Anrede per Sie, Mandat im Mail-Ausgang',
  items: [
    'Alle Mails sprechen jetzt förmlich an: Ist eine Anrede hinterlegt, „Sehr geehrter Herr Dr. Meier,", inklusive Titel; sonst „Guten Tag Vorname Nachname,". Immer per Sie, nie mehr „Hallo Alexander"',
    'Die Spalte Mandat im Mail-Ausgang zeigt bei neuen Kampagnen- und Vorlagenmails den Codename (Betongold, FARADAY) statt „k. A."',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
