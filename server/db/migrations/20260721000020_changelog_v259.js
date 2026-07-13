/** Changelog-Eintrag v0.259 (Mail-Ausgang, Vorlagen für Pflege-Link und Einladung, Doppelversand-Sperre). */
const ENTRY = {
  version: 'v0.259', released_on: '2026-07-21',
  title: 'Jede Mail nachvollziehbar — und Texte selbst ändern',
  items: [
    'Neuer Admin-Bereich „Mail-Ausgang": jede versendete Mail mit Empfänger, Betreff, Art und dem Original zum Nachlesen',
    'Der Audit-Trail nennt jetzt die Art der Mail (MAIL_SENT: Einladung, Pflege-Link, Mandats-Mailing …)',
    'Pflege-Link und DSGVO-Einladung sind jetzt Vorlagen — Text unter „Mailvorlagen" frei änderbar',
    'Doppelversand-Sperre: Läuft bereits ein Pflege-Link aus den letzten 14 Tagen, wird nachgefragt statt einfach erneut zu senden',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
