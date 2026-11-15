/** Changelog v0.479 (Klarnamen im Datenraum pruefen). */
const ENTRY = {
  version: 'v0.479', released_on: '2026-11-15',
  title: 'Die Prüfung auf Klarnamen sieht jetzt in die Dateien',
  items: [
    'Die Prüfung auf Klarnamen gibt es seit v0.427, aber sie sah nur Mandatstexte, Exposé und Dateinamen an. Was in den Dateien steht, hat nie jemand geprüft, und genau dort stehen Arbeitsverträge, Gehaltslisten und Personallisten',
    'Je Mandat lässt sich der gesamte Datenraum jetzt auf Personendaten prüfen: bekannte Namen aus dem Kontaktbestand, Anreden, Titel, Adressen, Rufnummern und Unterschriftenzeilen, dazu eine Sperrliste, die sich mitgeben lässt',
    'Drei Stufen im Bericht: Treffer, Verdacht und ungeprüft. Ungeprüft heisst, dass aus der Datei kein Text zu gewinnen war, etwa bei einem Scan. Das gilt ausdrücklich nicht als sauber, denn eine Prüfung, die Ungeprüftes für sauber erklärt, erzeugt Vertrauen, das nichts trägt',
    'Der Verdacht greift auch ohne Fund: Eine Datei, die "Gehaltsliste" oder "Personal" im Namen oder Ordner trägt, gehört hinter die höhere Stufe, auch wenn in ihr zufällig kein Name im Klartext steht',
    'Die Prüfung ändert nichts. Aus dem Bericht heraus lassen sich Dateien als vertraulich kennzeichnen, und die gefundenen Begriffe stehen zum Schwärzen bereit. Beides stösst ein Mensch an',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
