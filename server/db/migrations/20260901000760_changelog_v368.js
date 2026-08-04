/** Changelog v0.368 (Nachfolge markieren, Kontakt-Suche mit Stichwort, Funnel-Karte klickbar). */
const ENTRY = {
  version: 'v0.368', released_on: '2026-07-21',
  title: 'Nachfolge markieren, Kontakt-Suche mit Stichwörtern, Funnel-Karte klickbar',
  items: [
    'Der Button „Ins Nachfolge-Netzwerk" markiert jetzt auch bereits registrierte Nutzer direkt als Nachfolge-Interessent (dann ohne neue Einladung), damit sie sofort im Nachfolge-Netzwerk und -Funnel erscheinen',
    'Die Kontakt-Suche filtert jetzt die Liste: Stichwörter wie „Einwilligung", „nicht kontaktieren" oder „Entscheider" zeigen gezielt die passenden Kontakte, sonst freie Suche über Name, E-Mail und Unternehmen',
    'Im Deal-Funnel öffnet ein Klick auf die ganze Karte den Kontakt (vorher nur der Name)',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
