/** Changelog v0.450 (Endlosschleife beim Anmelden über Phalanx OS). */
const ENTRY = {
  version: 'v0.450', released_on: '2026-10-09',
  title: 'Endlosschleife beim Anmelden über Phalanx OS',
  items: [
    'Die Anmeldung über Phalanx OS lief im Kreis. Ursache war die Gastansicht aus v0.444: Dort wird das Token bewusst nicht mitgeschickt, damit man sieht, was ein nicht angemeldeter Besucher sieht',
    'Nach der Anmeldung lag das Token im Speicher, wurde aber nicht gesendet. Die Anwendung hielt den Angemeldeten für einen Besucher und schickte ihn zurück auf die Anmeldeseite, von dort ging es wieder über Phalanx OS, und so fort',
    'Jeder Schritt für sich war richtig. Zusammen ergaben sie einen Kreis, aus dem man ohne Kenntnis der Technik nicht herausfand',
    'Die Regel, die ihn aufbricht: Wer sich anmeldet, will keine Vorschau. Die Gastansicht endet jetzt beim Aufruf der Anmeldeseite, bei der Rückkehr aus Phalanx OS und bei jeder Anmeldung mit Passwort, zweitem Faktor oder Registrierung',
    'Die Gastansicht selbst bleibt unverändert: Sie endet weiterhin mit dem Schließen des Fensters und zeigt die ganze Zeit einen Hinweisbalken mit dem Weg zurück',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
