/** Changelog v0.403 (Konten und Kontakte abgleichen). */
const ENTRY = {
  version: 'v0.403', released_on: '2026-08-07',
  title: 'Warum ein Käufer trotz NDA nicht in den Datenraum kam',
  items: [
    'In der Kontaktakte zeigt der Datenraum-Bereich jetzt die drei Bedingungen als Kette: NDA unterschrieben, Nutzerkonto vorhanden, Datenraum freigegeben, und nennt in einem Satz, woran es hängt',
    'Das CRM-Häkchen heißt jetzt „Eigener Vermerk (nur Notiz)", weil es nie einen Zugang geöffnet hat',
    'Neue Prüfung über den NDA-Anfragen: findet alle Interessenten, die in einem Mandat stehen, aber kein verknüpftes Plattform-Konto haben',
    'Zu jedem Fall werden passende Konten vorgeschlagen, mit Begründung. Verknüpft wird erst nach Ihrer Bestätigung',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
