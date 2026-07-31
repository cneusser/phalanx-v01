/** Changelog v0.363 (Nachfolge-Reaktivierungseinladung mit Löschoption, Match-Lesbarkeit). */
const ENTRY = {
  version: 'v0.363', released_on: '2026-07-21',
  title: 'Nachfolge-Einladung mit Löschoption, Match-Kachel lesbar, Hinweis nach oben',
  items: [
    'Neue Einladungsvorlage „Nachfolge-Netzwerk (Reaktivierung)": fragt nett nach, ob noch Interesse an einer Nachfolge besteht, und erklärt die Professionalisierung von Phalanx. DSGVO-konform mit Double-Opt-in-Button',
    'Kein Interesse mehr: Auf der Einladungsseite kann der Empfänger mit einem Klick die Löschung seiner Daten wählen, der Kontakt wird dann vollständig entfernt',
    'Match-Kachel im Nachfolge-Profil ist jetzt auch bei niedrigem Wert gut lesbar (dunkler Text auf hellem Grund). Bei nur Basiswert erscheint ein Hinweis, wie der Wert steigt',
    'Der Nachfolge-Hinweis im Käufer-Dashboard steht jetzt prominent oben',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
