/** Changelog v0.400 (Anfragen aus Marktplätzen landen vollständig im CRM). */
const ENTRY = {
  version: 'v0.400', released_on: '2026-08-05',
  title: 'Anfragen aus Marktplätzen landen vollständig im CRM',
  items: [
    'Der Investortyp im Dialog „Anfrage einfügen" ist jetzt ein Auswahlfeld mit denselben Käufertypen wie in der Kontaktakte, und der Wert wird auch gespeichert',
    'Was das Portal schreibt, wird automatisch zugeordnet: aus „Privatperson" wird Privatperson, aus „MBI-Kandidat" wird Nachfolger. Der ursprüngliche Wortlaut bleibt sichtbar, Unklares bleibt leer statt falsch',
    'Die Anschrift wird in Straße, Postleitzahl, Ort und Land zerlegt; der Kontakt hat dafür jetzt eigene Felder',
    'Eine neu angelegte Firma bekommt die Anschrift gleich mit, eine vorhandene wird nur ergänzt und nie überschrieben',
    'Ist die E-Mail schon im CRM, sagt der Dialog das vorher: Der Kontakt wird ergänzt, nicht doppelt angelegt',
    'Käufertypen, Firmentypen und Länder stehen nur noch an einer Stelle und gelten überall gleich',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
