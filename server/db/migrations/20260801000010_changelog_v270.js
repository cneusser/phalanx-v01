/** Changelog-Eintrag v0.270 (Anrede registrierter Nutzer, NDA-Stufe im Funnel). */
const ENTRY = {
  version: 'v0.270', released_on: '2026-07-21',
  title: 'Anrede auch für registrierte Nutzer, NDA-Stufe präzisiert',
  items: [
    'Mails an registrierte Nutzer sprechen jetzt mit der bei der Registrierung erfassten Anrede an („Sehr geehrter Herr Dr. Malessa,"); die Anrede wird zentral über die E-Mail-Adresse nachgeschlagen, keine Aufrufstelle muss sie mehr mitgeben',
    'Deal-Funnel: Eine freigegebene, aber noch nicht unterschriebene NDA hält den Interessenten in der Spalte „NDA". Erst die Unterschrift hebt ihn auf „IM / Unterlagen"',
    'Hinweis: Die Anrede wird bei der Registrierung bereits als Pflichtfeld erhoben (Herr, Frau, Divers) samt optionalem Titel',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
