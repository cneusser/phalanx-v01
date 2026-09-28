/** Changelog v0.419 (Startprüfung der öffentlichen Adressen). */
const ENTRY = {
  version: 'v0.419', released_on: '2026-09-28',
  title: 'Startprüfung der öffentlichen Adressen',
  items: [
    'Beim Hochfahren wird geprüft, ob die öffentliche Adresse der Plattform auf die Adresse zeigt, die Ihre Kunden kennen, und nicht auf die interne Adresse des Hosters',
    'Anlass war der Login über Phalanx OS. Dieselbe Einstellung baut aber auch jeden Link in jeder Mail, dort wäre es erst viel später und viel unangenehmer aufgefallen',
    'Geprüft wird außerdem, ob die Rückkehradresse des Logins unter derselben Adresse liegt wie die Oberfläche. Sonst landet man nach dem Login auf einem Rechnernamen, unter dem man gar nicht unterwegs ist, und ist hier weiterhin abgemeldet',
    'Die Prüfung meldet nur, sie bricht den Start nicht ab. Eine Plattform, die wegen einer Adresse gar nicht läuft, wäre schlimmer',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
