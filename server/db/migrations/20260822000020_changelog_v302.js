/** Changelog v0.302 (Funnel verdichtet, Papierkorb, Mailings-Archiv, eigener Reiter). */
const ENTRY = {
  version: 'v0.302', released_on: '2026-07-21',
  title: 'Funnel aufgeräumt: neun Stufen, Papierkorb, eigener Reiter',
  items: [
    'Neun statt vierzehn Stufen: Longlist zur Freigabe, Shortlist freigegeben, Ansprache, NDA, Datenraum-Zugang, LOI, Verhandlung, Closing/Signing, Abschluss',
    'Papierkorb: Karten hineinziehen oder je Karte entfernen, jetzt auch bei Beteiligten. Der Kontakt bleibt im CRM',
    'Rolle eines Beteiligten direkt an der Karte änderbar',
    'Versendete Mailings auf die fünf aktuellsten begrenzt, abgeschlossene wandern per Klick ins Archiv',
    'Deal-Funnel als eigener Punkt im Hauptmenü: Team sieht alles, Verkäufer nur Name und Firma ohne Kontaktdaten',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
