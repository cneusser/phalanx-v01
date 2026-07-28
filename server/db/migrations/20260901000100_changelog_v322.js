/** Changelog v0.322 (Nachfolge-Netzwerk, Schritt 1). */
const ENTRY = {
  version: 'v0.322', released_on: '2026-07-21',
  title: 'Nachfolge-Netzwerk, Schritt 1',
  items: [
    'Registrierung als Käufer fragt jetzt: Nachfolge-Interessent (mit oder ohne Kapitalbeteiligung) oder professioneller Käufer (Stratege, Finanzinvestor, Business Angel, Venture Capital, Family Office, M&A-Berater mit Suchmandat)',
    'Auch im Onboarding nach einer Einladung wird die Nachfolge-Richtung erfasst und ins CRM übernommen',
    'Neue Einladungs-Vorlage „Nachfolge-Netzwerk": eine ansprechende, persönlich gehaltene E-Mail. Im Einladungsdialog wählbar zwischen Standard (M&A) und Nachfolge-Netzwerk',
    'Neue öffentliche Menü-Seite „Nachfolge": erklärt das Netzwerk, Matching, Matching-Events und Veranstaltungen, kostenfrei für Nachfolge-Interessierte, mit Registrieren-Knopf',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
