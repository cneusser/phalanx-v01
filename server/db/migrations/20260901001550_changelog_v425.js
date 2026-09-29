/** Changelog v0.425 (Mein Bereich und gesperrte Bereiche stürzen nicht mehr ab). */
const ENTRY = {
  version: 'v0.425', released_on: '2026-09-29',
  title: 'Mein Bereich und gesperrte Bereiche stürzen nicht mehr ab',
  items: [
    'Wer mindestens einen Deal hatte, bekam unter "Mein Bereich" eine Fehlerseite statt seiner Übersicht. Wer keinen hatte, sah nie einen Fehler. Deshalb ist es intern niemandem aufgefallen',
    'Dasselbe im Mandat: Der Hinweis für noch gesperrte Bereiche stürzte ab, also genau die Ansicht, die ein Interessent ohne Freigabe zu sehen bekommt',
    'Ursache in beiden Fällen: eine Unterkomponente benutzte die Übersetzung, ohne sie selbst anzufordern. Eine Prüfung verlangt das jetzt von jeder Komponente einzeln, nicht mehr nur von jeder Datei',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
