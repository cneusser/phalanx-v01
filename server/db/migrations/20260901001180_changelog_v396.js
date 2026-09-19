/** Changelog v0.396 (Hinweise auf neue Unterlagen bündeln). */
const ENTRY = {
  version: 'v0.396', released_on: '2026-08-01',
  title: 'Hinweise auf neue Unterlagen werden gebündelt',
  items: [
    'Bisher ging je hochgeladener Datei sofort eine E-Mail an alle berechtigten Interessenten. Bei einem Massenimport wurde daraus eine Flut. Jetzt werden die Hinweise gesammelt und je Mandat zu einer Nachricht zusammengefasst',
    'Jeder Empfänger stellt im Profil selbst ein, wie oft er informiert werden möchte: sofort, einmal am Tag, einmal in der Woche oder gar nicht. Voreingestellt ist einmal am Tag',
    'Die Nachricht nennt nur noch Mandat und Anzahl, nicht mehr den Dateinamen. Ein Name wie „Gehaltserhöhung Geschäftsführer" verrät sonst schon im Postfach zu viel',
    'Als vertraulich eingestufte Unterlagen lösen gar keinen Hinweis mehr aus; wer sie sehen soll, erhält eine Einzelfreigabe',
    'Sicherheitsmaßnahme: Unterlagen in Clean-Team-Ordnern wurden auf „nur mit Einzelfreigabe sichtbar" gesetzt',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
