/** Changelog v0.367 (Nachfolge-Einladung je Kontakt, Einladungs-Übersicht, Successor-Vorbelegung). */
const ENTRY = {
  version: 'v0.367', released_on: '2026-07-21',
  title: 'Nachfolge-Einladung je Kontakt, Einladungs-Übersicht',
  items: [
    'Neuer Button „Ins Nachfolge-Netzwerk" im Kontakt: sendet die DSGVO-Einladung, markiert den Kontakt als Nachfolge-Interessent und zeigt einen kopierbaren Direktlink. Funktioniert auch bei bereits eingewilligten Kontakten',
    'Über den Link willigt die Person ein, legt ein Konto an (Käufertyp „Nachfolger" ist vorbelegt) und füllt danach ihren Nachfolge-Fragebogen aus',
    'Neue Übersicht „Einladungen" im CRM: zeigt je Einladung den Status (Eingeladen, Geöffnet, Eingewilligt, Registriert, Abgelehnt, Abgelaufen) und den Zweck. Erklärt, warum Eingeladene erst nach Registrierung im Netzwerk und Funnel erscheinen',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
