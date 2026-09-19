/** Changelog v0.395 (Struktur aufräumen). */
const ENTRY = {
  version: 'v0.395', released_on: '2026-07-31',
  title: 'Struktur aufräumen: zwei Gliederungen zu einer zusammenführen',
  items: [
    'Neuer Knopf „Struktur aufräumen" im Safe: Über einen Plan mit Zeilen der Form „Quelle => Ziel" wandern die Inhalte eines Ordners in einen anderen, der leere Quellordner geht in den Papierkorb',
    'Beim Vergleich der Ordnernamen spielen Nummernpräfixe sowie Groß- und Kleinschreibung keine Rolle, „1.3 Finanzen" trifft also auf „Finanzen"',
    'Anschließend wird automatisch verschlankt: nichts liegt tiefer als zwei Ebenen, und Unterordner mit weniger als drei Dateien lösen sich in ihren übergeordneten Ordner auf',
    'Vorschau vor dem Anwenden: Sie sehen jede geplante Aktion und die Zahl der Ordner auf oberster Ebene, bevor etwas verschoben wird. Dateien gehen nie verloren',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
