/** Changelog v0.456 (Erinnerung an eine offene Einladung). */
const ENTRY = {
  version: 'v0.456', released_on: '2026-10-10',
  title: 'Erinnerung an eine offene Einladung',
  items: [
    'Wer eingewilligt, die Anmeldung aber nicht abgeschlossen hat, steckte bisher fest: Eine neue Einladung lehnt der Server ab, weil eine offene vorliegt, und einen Weg, die offene noch einmal zu schicken, gab es nicht',
    'In der Zugriffsprüfung stehen jetzt zwei Knöpfe: "Erinnerung senden" und "Nur Link zeigen". Benutzt wird derselbe Link wie beim ersten Mal, seine Frist läuft neu. Ein zweiter Link hätte den ersten im Postfach der Person entwertet',
    'Eine neue Einwilligung wird dabei nicht eingeholt. Sie liegt vor, mit Datum, IP und Textfassung. Sie erneut abzufragen wäre nicht gründlicher, sondern verwirrend',
    'Die Erinnerung wird abgelehnt bei Widerspruch, fehlender Adresse und wenn längst ein Konto besteht. Klemmt der Versand, kommt der Link trotzdem zurück und lässt sich von Hand verschicken',
    'Zwei Anzeigefehler behoben: Eine offene Stufe stand als "Nutzerkonto vorhanden" da, las sich also wie ihr Gegenteil, und der ausführliche Befund wiederholte sich bei jedem Mandat',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
