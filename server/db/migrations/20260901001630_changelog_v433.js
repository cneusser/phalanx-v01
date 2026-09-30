/** Changelog v0.433 (Erst lesen, dann senden). */
const ENTRY = {
  version: 'v0.433', released_on: '2026-09-30',
  title: 'Erst lesen, dann senden',
  items: [
    'Das Protokoll aus v0.432 hat die Ursache eingegrenzt. Zwei Uploads von je einem Megabyte: die Anfrage erreicht den Server, vom Körper kommt nichts an, nach 0,6 Sekunden ist die Verbindung zu, und der Server hat nichts geantwortet. Es bricht also nicht der Server ab, sondern die Seite, die sendet',
    'Eine ausgewählte Datei ist für den Browser zunächst nur ein Verweis auf die Platte. Gelesen wird erst beim Senden. Liegt dort ein Platzhalter statt einer Datei, etwa weil der Ordner mit einer Cloud abgeglichen wird, bricht der Browser mitten im Senden ab und nennt als Grund nur einen Abriss',
    'Jetzt wird die Datei zuerst vollständig gelesen und dann gesendet. Scheitert das Lesen, steht der Dateiname in der Meldung samt Hinweis, dass die Datei lokal heruntergeladen werden muss',
    'Das Upload-Protokoll misst jetzt über den Zähler der Verbindung statt über einen Horcher am Datenstrom. Der Horcher hätte den Strom vorzeitig in Fluss gebracht und damit den Upload selbst beschädigen können',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
