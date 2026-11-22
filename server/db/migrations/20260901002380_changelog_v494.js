/** Changelog v0.494 (ein Entwurf sagt, dass er einer ist). */
const ENTRY = {
  version: 'v0.494', released_on: '2026-11-22',
  title: 'Ein Entwurf sagt jetzt, dass er einer ist, und wie es weitergeht',
  items: [
    'Ein neu angelegtes Mandat steht auf Entwurf, und der Marktplatz zeigt nur aktive Mandate. Das ist richtig so, stand aber an keiner Stelle: Die Karte im Verkäuferbereich trug das Wort „Entwurf" und einen Knopf „Bearbeiten", mehr nicht. Wer ein Mandat anlegte und es nicht wiederfand, hatte nichts falsch gemacht und konnte es trotzdem nicht wissen',
    'Jetzt steht am Entwurf, warum nichts zu sehen ist, und daneben der Weg nach vorn: Verkäufer reichen zur Prüfung ein, die Verwaltung veröffentlicht unmittelbar. Vor dem Veröffentlichen wird gefragt, denn damit geht der Teaser live und passende Interessenten werden benachrichtigt',
    'Beide Wege gab es am Server längst, angeboten hat sie die Oberfläche nie. Unvollständige Entwürfe weist die Einreichung weiterhin ab und nennt dabei die fehlenden Angaben',
    'Die Begrüssung im Verkäuferbereich sagte „Ihr Unternehmen ist eingereicht", sobald überhaupt ein Mandat bestand, auch wenn es im Entwurf lag. Sie nennt jetzt die Entwürfe beim Namen',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
