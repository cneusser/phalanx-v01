/** Changelog v0.391 (Erinnerung an ausstehende NDA-Unterschriften). */
const ENTRY = {
  version: 'v0.391', released_on: '2026-07-27',
  title: 'Erinnerung an ausstehende NDA-Unterschriften',
  items: [
    'Bleibt eine Unterschrift aus, erinnert die Plattform den Käufer automatisch nach 3 und nach 7 Tagen. Danach endet die Serie, das weitere Nachfassen bleibt Ihnen überlassen',
    'In der NDA-Liste steht jetzt, seit wie vielen Tagen eine Unterschrift aussteht, und ein Knopf „Erinnern" schickt jederzeit von Hand eine Erinnerung; die Zahl der bereits versendeten Erinnerungen wird mitgeführt',
    'Die letzte Erinnerung bietet dem Empfänger höflich an, aus dem Prozess genommen zu werden',
    'Keine zwei Erinnerungen am selben Tag; sobald unterschrieben, abgelehnt oder freigegeben ist, hören die Erinnerungen auf. Rhythmus über NDA_REMINDER_TAGE einstellbar, ganz abschaltbar über NDA_REMINDERS_ENABLED=0',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
