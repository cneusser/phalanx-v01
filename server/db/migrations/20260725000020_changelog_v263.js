/** Changelog-Eintrag v0.263 (Aktivitäten im Klartext, Absprünge, Deal-Status „Ansprache"). */
const ENTRY = {
  version: 'v0.263', released_on: '2026-07-21',
  title: 'Aktivitäten im Klartext: und ein Schritt „Ansprache" in der Pipeline',
  items: [
    'Letzte Aktivitäten stehen jetzt im Klartext: wer was in welchem Mandat getan hat, statt ACCESS_DOCLIST · documents #7',
    'Absprung aus jeder Aktivität: Klick auf den Namen öffnet den Kontakt, Klick auf das Mandat die Mandatsseite; das Unternehmen steht daneben',
    'Neuer Pipeline-Schritt „Ansprache" zwischen „Teaser live" und „In Diligence", der Teaser steht, die Käuferansprache läuft',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
