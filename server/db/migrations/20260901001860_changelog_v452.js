/** Changelog v0.452 (Antwort erfassen steht jetzt in der Konversation). */
const ENTRY = {
  version: 'v0.452', released_on: '2026-10-09',
  title: 'Antwort erfassen steht jetzt in der Konversation',
  items: [
    'Den Kasten "Antwort des Kontakts erfassen" gab es schon, aber unter dem Reiter "Wiedervorlagen". Dort sucht ihn niemand: Wer eine eingegangene Mail festhalten will, geht in die Konversation. Eine Funktion am falschen Ort gilt als nicht vorhanden, und das zu Recht',
    'Er steht jetzt oben in der Konversation, direkt über dem Verlauf',
    'Neu dazu eine Anleitung in docs/Posteingang_einrichten.md: der Weg von Hand, der ohne jede Einrichtung funktioniert, und daneben die Einrichtung des automatischen Eingangs über Brevo',
    'Die Anleitung nennt auch, was bewusst nicht passiert: Eine Mail von unbekannter Adresse legt keinen Kontakt an, eine zitierte Mail überschreibt keine direkte Antwort, und dass jemand schreibt, ist keine Einwilligung in Mailings',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
