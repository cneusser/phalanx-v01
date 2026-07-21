/** Changelog v0.309 (Firma am Nutzer über die stabile CRM-Verknüpfung). */
const ENTRY = {
  version: 'v0.309', released_on: '2026-07-21',
  title: 'Firma am Nutzer über die stabile Verknüpfung',
  items: [
    'Die Admin-Nutzerliste zeigt die Firma jetzt aus der CRM-Verknüpfung, nicht mehr aus dem bei der Registrierung getippten Text',
    'Der Klick öffnet das Unternehmen direkt über seine ID, Namensänderungen wirken damit überall',
    'Arbeitgeberwechsel bleiben korrekt, weil die Zuordnung Kontakt zu Unternehmen historisiert ist',
    'Weicht der getippte Name von der verknüpften Firma ab, wird das sichtbar angezeigt',
    'Ohne Verknüpfung bleibt der bisherige Weg über die Namenssuche, erkennbar an der gepunkteten Unterstreichung',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
