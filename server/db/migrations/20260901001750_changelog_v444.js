/** Changelog v0.444 (Ansicht prüfen auf dem Marktplatz). */
const ENTRY = {
  version: 'v0.444', released_on: '2026-10-02',
  title: 'Ansicht prüfen auf dem Marktplatz',
  items: [
    'Neu auf dem Marktplatz, nur für Verwaltende: "Ansicht prüfen". Zwei Wege, und beide zeigen Echtes statt eines Nachbaus',
    'Als nicht angemeldeter Besucher: Ihr Zugang bleibt bestehen, wird aber nicht mitgeschickt. Der Server antwortet dann so, wie er es einem fremden Besucher gegenüber täte. Ein Hinweisbalken steht auf jeder Seite, und die Ansicht endet mit dem Schließen des Fensters',
    'Als eine bestimmte Person: Auswahl nach Rolle, dann die Birdview, die es schon gab. In der Liste steht zu jeder Person, wie viele Mandate sie verfolgt und bei wie vielen der Datenraum freigegeben ist',
    'Eine Ansicht "als Käufer" gibt es bewusst nicht. Was ein Käufer sieht, hängt nicht an seiner Rolle, sondern an unterschriebener Vereinbarung, Datenraum-Freigabe und Einzelfreigaben. Zwei Käufer sehen Verschiedenes, und eine gespielte Rolle gäbe eine Auskunft, die niemandem entspricht',
    'In beiden Fällen entscheidet der Server. Eine Vorschau, die im Browser nachbaut, was jemand sehen dürfte, prüft die Oberfläche gegen sich selbst und übersieht genau die Lücken, um die es geht',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
