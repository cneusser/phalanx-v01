/** Changelog v0.381 (LinkedIn-Kandidaten: Import, Verknüpfung, CLI). */
const ENTRY = {
  version: 'v0.381', released_on: '2026-07-21',
  title: 'LinkedIn-Kandidaten: Import und automatische Verknüpfung',
  items: [
    'Kontakt-Import erkennt jetzt LinkedIn, Käufertyp, Mandat, Passung, Prio, Quelle und Notiz; Dubletten werden über E-Mail, LinkedIn-URL und eindeutigen Namensschlüssel erkannt und angereichert statt doppelt angelegt',
    'Je Mandat entsteht ein Funnel-Eintrag auf Stufe „Ansprache" mit Quelle linkedin_import; Kontakte mit Plattformkonto werden als „Konto vorhanden" markiert und ohne Funnel-Eintrag geführt',
    'Registriert sich ein vorbereiteter Kontakt über den allgemeinen Link, wird der CRM-Kontakt automatisch verknüpft (E-Mail, LinkedIn-Feld, eindeutiger Name), Käufertyp und vorbereitetes Suchprofil werden übernommen',
    'Neues optionales Feld „LinkedIn-Profil" bei der Registrierung und ein Art.-13-Hinweis zur Zusammenführung vorbereiteter Kontaktdaten; CLI-Skript und README für die Erstbefüllung',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
