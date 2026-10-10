/** Changelog v0.459 (Birdview führte auf die Anmeldeseite). */
const ENTRY = {
  version: 'v0.459', released_on: '2026-10-10',
  title: 'Birdview führte auf die Anmeldeseite',
  items: [
    'Die Ansicht als eine bestimmte Person endete auf der Anmeldeseite, und zwar ohne die eigene Sitzung. Das sah nach einem Anmeldeproblem aus, war aber keines',
    'Ursache: Das ausgestellte Token trug die Token-Version des Zielnutzers nicht mit und galt damit als Version 0. Sobald jemand einmal sein Passwort zurückgesetzt hatte, steht dort eine höhere Zahl, und die Anmeldeprüfung wies das frisch ausgestellte Token als abgelaufene Sitzung ab. Die Funktion arbeitete also nur bei Personen, die ihr Passwort nie geändert hatten',
    'Zusätzlich ein Rückweg: Scheitert ein Birdview-Token, wird das danebenliegende eigene Token wiederhergestellt, statt den Betrachter abzumelden. Dass eine fremde Ansicht nicht aufgeht, ist kein Grund, die eigene Sitzung zu verlieren',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
