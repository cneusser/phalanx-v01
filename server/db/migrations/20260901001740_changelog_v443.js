/** Changelog v0.443 (Zitieren, kopieren, Fragen ins Q&A übernehmen). */
const ENTRY = {
  version: 'v0.443', released_on: '2026-10-02',
  title: 'Zitieren, kopieren, Fragen ins Q&A übernehmen',
  items: [
    'Unter jeder Nachricht stehen jetzt "Zitieren" und "Kopieren". Das Zitat erscheint über dem Eingabefeld und geht als eingerückter Block mit hinaus, damit der Empfänger sieht, worauf sich die Antwort bezieht. Lange Zitate werden gekürzt, denn ein ganzer Absatz vor jeder Antwort macht den Verlauf unlesbar',
    'Eine Frage aus dem Gespräch lässt sich für das Q&A vormerken. Vormerken ist eine Notiz, kein Veröffentlichen: Die vorgemerkten Fragen sammeln sich oben in den Nachrichten und warten dort',
    'Im zweiten Schritt schreiben Sie die Frage um, ergänzen die Antwort, wählen das Mandat und entscheiden, ob sie für alle freigegebenen Interessenten sichtbar wird',
    'Davor steht "Auf Namen prüfen". Geprüft werden Frage und Antwort gegen die Kontakte des Mandats und gegen Muster, die fast immer eine Person bezeichnen. Geändert wird nichts automatisch: Eine Automatik, die Text stillschweigend verändert, wäre hier gefährlicher als keine',
    'Die Prüfung ist ein Hinweis, keine Gewähr. Umschreibungen erkennt sie nicht, und veröffentlicht sieht die Frage jeder freigegebene Interessent',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
