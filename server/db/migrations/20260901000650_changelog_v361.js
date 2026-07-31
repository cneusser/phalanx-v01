/** Changelog v0.361 (Eigener Nachfolge-Bereich für Nachfolge-Interessenten). */
const ENTRY = {
  version: 'v0.361', released_on: '2026-07-21',
  title: 'Eigener Nachfolge-Bereich statt Käufer-Ansicht',
  items: [
    'Nachfolge-Interessenten sehen unter „Mein Bereich" jetzt einen eigenen Nachfolge-Bereich: Fortschritt des Fragebogens, passende Nachfolge-Mandate mit Match-Wert und eine Schritt-für-Schritt-Anleitung statt des generischen Käufer-Dashboards',
    'Der Nachfolge-Fragebogen ist jetzt gut auffindbar: Einstieg im Dashboard sowie im Menü (auch mobil). Ein zusätzlicher Hinweis im Käufer-Dashboard führt ebenfalls dorthin',
    'Wer den Fragebogen ausfüllt, wird automatisch als Nachfolge-Interessent geführt (sofern noch kein Käufertyp gesetzt war). Nachfolge-Einladungen belegen den Typ von Anfang an vor',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
