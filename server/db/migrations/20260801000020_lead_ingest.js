/**
 * v0.271: Herkunftsfelder für eingehende Marktplatz-Anfragen.
 *
 * Wird eine Kaufanfrage aus einem Portal (DUB.de u. a.) eingelesen, halten wir am
 * Kontakt fest, woher er kommt. So kann die spätere Ansprache erklären, warum wir
 * schreiben und wo wir den Kontakt her haben.
 */
exports.up = async function (knex) {
  const addIfMissing = async (col, build) => {
    const has = await knex.schema.hasColumn('crm_contacts', col).catch(() => false);
    if (!has) await knex.schema.alterTable('crm_contacts', build);
  };
  await addIfMissing('lead_source', (t) => t.text('lead_source'));   // z. B. „Deutsche Unternehmerbörse (DUB.de)"
  await addIfMissing('lead_ref', (t) => t.text('lead_ref'));         // z. B. „Inserat 17392, Referenz 5381 Betongold"

  const ENTRY = {
    version: 'v0.271', released_on: '2026-08-01',
    title: 'Kaufanfragen aus Marktplätzen einlesen',
    items: [
      'Eingehende Anfragen von Portalen (DUB.de, nexxt-change u. a.) lassen sich per Einfügen in die Plattform holen: der Kontakt wird angelegt, dem Mandat zugeordnet und im Funnel geführt',
      'Die Herkunft (Portal und Inseratsnummer) wird am Kontakt gespeichert und in der späteren Ansprache genannt, damit der Angeschriebene weiß, woher der Kontakt stammt',
    ],
  };
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({
    tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on,
    title: ENTRY.title, items_json: JSON.stringify(ENTRY.items),
  });
};

exports.down = async function (knex) {
  await knex('changelog').where({ version: 'v0.271' }).del().catch(() => {});
  for (const col of ['lead_source', 'lead_ref']) {
    const has = await knex.schema.hasColumn('crm_contacts', col).catch(() => false);
    if (has) await knex.schema.alterTable('crm_contacts', (t) => t.dropColumn(col)).catch(() => {});
  }
};
