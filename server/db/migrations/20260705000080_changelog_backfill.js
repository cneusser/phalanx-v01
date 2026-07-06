/**
 * Fehlende Changelog-Einträge nachziehen (v0.232, v0.233, v0.235), damit die
 * In-App-Historie lückenlos ist. Idempotent je Version.
 */
const ENTRIES = [
  ['v0.235', '2026-07-05', 'Feedback, Changelog & Suchprofile', [
    'Feedback-Seite (Käufer/Verkäufer) mit öffentlicher Roadmap',
    'Admin-Tabs Feedback und Changelog',
    'Suchprofile/gespeicherte Suchen + Sofort-Match-Benachrichtigung',
  ]],
  ['v0.233', '2026-07-05', 'Q&A, Verkäufer-Pflege & Teaser-PDF', [
    'Q&A für Admin/Pfleger nutzbar',
    'Exposé-/Safe-Einstiege für Verkäufer',
    'Teaser als PDF mit Briefbogen, Markierung und Audit-Trail',
  ]],
  ['v0.232', '2026-07-05', 'Briefbogen-Footer & Exposé-Fixes', [
    'Firmen-Briefbogen-Footer in allen PDFs',
    'Web-Exposé-Leerzustand behoben; Teaser-Ableitung aus Exposé',
  ]],
];

exports.up = async function (knex) {
  for (const [version, date, title, items] of ENTRIES) {
    const exists = await knex('changelog').where({ version }).first().catch(() => null);
    if (!exists) {
      await knex('changelog').insert({ tenant_id: 1, version, released_on: date, title, items_json: JSON.stringify(items) });
    }
  }
};

exports.down = async function (knex) {
  for (const [version] of ENTRIES) await knex('changelog').where({ version }).del().catch(() => {});
};
