/** Changelog v0.454 (Korrespondenz aus Phalanx OS, live und ohne Kopie). */
const ENTRY = {
  version: 'v0.454', released_on: '2026-10-10',
  title: 'Korrespondenz aus Phalanx OS, live und ohne Kopie',
  items: [
    'Im Mandat gibt es den Reiter "Korrespondenz" mit dem vollständigen Schriftwechsel zu diesem Mandat, eingehend und ausgehend, mit allen Beteiligten. In der Kontaktakte steht derselbe Abschnitt für den Schriftwechsel mit genau dieser Person',
    'CapitalMatch speichert davon nichts. Die Ansichten holen die Daten bei jedem Aufruf aus Phalanx OS, mit fünf Minuten Zwischenspeicher im Arbeitsspeicher. Der Grund ist Löschbarkeit: Ein zweiter Bestand müsste jede Löschung nach Artikel 17 und jede zurückgenommene Zuordnung nachvollziehen, und in der Praxis tut er das nie vollständig',
    'Ist Phalanx OS nicht erreichbar, steht dort der Grund und keine leere Liste. Eine leere Liste sähe aus wie "keine Korrespondenz" und führte zu der Aussage, es sei nichts geschrieben worden',
    'Die Mandatsansicht ist der Verwaltung vorbehalten, serverseitig geprüft. In der Korrespondenz stehen Klarnamen und die Namen aller Interessenten; ein Käufer, der den Schriftwechsel mit einem anderen Käufer sähe, erführe, wer sonst noch bietet',
    'Dabei ist aufgefallen, dass die bestehende Wache im Verwaltungsbereich zwar isAdmin heisst, aber alle Mitarbeitenden durchlässt. Für die Mandatskorrespondenz gibt es deshalb eine zweite, enger gefasste Prüfung; der bestehende Name bleibt unangetastet, weil er an über hundert Routen hängt',
    'Anhänge werden nur mit Namen und Grösse genannt. Die Dateien bleiben in Phalanx OS',
    'In der Verwaltung zeigt eine Zeile Scope, letzten Abruf und letzten Fehler. Die Variable PHALANX_MAILS_AUS schaltet beide Ansichten ab, ohne Veröffentlichung',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
