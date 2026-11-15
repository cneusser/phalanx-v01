/** Changelog v0.478 (Datenraum 2.0, Sprint 1 Teil 2: Stufe und Stand). */
const ENTRY = {
  version: 'v0.478', released_on: '2026-11-15',
  title: 'Der Datenraum hat jetzt Stufen statt eines Schalters',
  items: [
    'Bisher kannte der Datenraum für einen Käufer nur zwei Zustände: zu oder ganz offen. Ein Teaser, der auf die öffentliche Stufe gehört, hatte darin keinen Platz, an dem er sichtbar gewesen wäre. Genau daran scheiterte das Abnahmekriterium von Sprint 1',
    'Jede Datei im Datenraum trägt jetzt eine Sichtbarkeitsstufe: öffentlich, ab Vertraulichkeitsvereinbarung, oder erst mit Datenraum-Freigabe. Der Käufer sieht, was seine Stufe erreicht, und nicht mehr',
    'Dazu ein Veröffentlichungsstand je Datei: Entwurf, geprüft, freigegeben, zurückgezogen. Nach aussen geht nur, was freigegeben ist. Ein Entwurf bleibt im Haus, auch wenn die Stufe passt',
    'Ein Ordner erscheint nur, wenn unter ihm etwas liegt, das der Käufer sehen darf. Sonst stünde der Teaser in einem Ordner, den der Käufer nicht öffnen kann',
    'Der Bestand verhält sich unverändert: Alle vorhandenen Objekte stehen auf Datenraum-Stufe und freigegeben, also genau so wie bisher. Neu Hochgeladenes beginnt dagegen als Entwurf, ausser es kommt mit einer Stufe herein',
    'Vertraulichkeit und Einzelfreigaben entscheiden unverändert dieselbe Stelle wie zuvor. Die Stufe nimmt nur vorher weg, was ohnehin nicht in Frage kommt',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
