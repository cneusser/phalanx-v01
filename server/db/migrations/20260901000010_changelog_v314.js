/** Changelog v0.314 (Käuferbereich neu: Meine Deals als Prozesskarten). */
const ENTRY = {
  version: 'v0.314', released_on: '2026-07-21',
  title: 'Käuferbereich neu: Meine Deals als Prozesskarten',
  items: [
    'Der Käufer sieht jetzt „Meine Deals": genau die Unternehmen, in denen er engagiert ist, nicht mehr fremde Marktplatz-Mandate',
    'Jede Deal-Karte zeigt eine Prozess-Timeline (Interesse, NDA, Unterlagen, Datenraum) und wo der Käufer gerade steht',
    'Zeile „Für Sie freigegeben": Kurzprofil, Exposé, Unterlagen, Datenraum und Q&A, jeweils freigegeben oder gesperrt auf einen Blick',
    'Klarer nächster Schritt je Deal mit passendem Knopf (NDA anfordern, NDA unterschreiben, Unterlagen ansehen, Datenraum öffnen)',
    'Die Kennzahlen zeigen jetzt aktive Deals, freigegebene Unterlagen und offene Datenräume statt reiner NDA-Zahlen',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
