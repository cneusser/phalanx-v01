/** Changelog v0.460 (Q&A: Kategorie, Verantwortlicher, interne Notiz). */
const ENTRY = {
  version: 'v0.460', released_on: '2026-10-14',
  title: 'Q&A mit Kategorie, Verantwortlichem und interner Notiz',
  items: [
    'Jede Frage trägt jetzt eine Kategorie, einen Verantwortlichen und eine interne Notiz. Dazu die Herkunft, also ob sie über die Plattform, per E-Mail oder im Gespräch kam',
    'Die interne Notiz sieht nur Phalanx. Die Käuferansicht holt ihre Felder einzeln und nicht als ganze Zeile; eine Prüfung hält das fest. Eine Notiz wie "vor Antwort mit dem Mandanten abstimmen" beim Interessenten anzuzeigen, wäre der teuerste denkbare Fehler dieses Moduls',
    'Zwei neue Stände: "in Bearbeitung" und "zurückgestellt". Vorher gab es nur offen und beantwortet, und eine zurückgestellte Frage stand neben einer, auf deren Zulieferung man wartet',
    'Dabei zählen die Übersichten ab sofort "nicht beantwortet" statt "offen". Sonst wäre eine Frage in Bearbeitung aus jeder Zählung verschwunden, obwohl sie offener ist als je zuvor',
    'Neu im Q&A-Reiter: "Fragen erfassen" für alles, was nicht über die Plattform kam, mehrere Fragen in einem Durchgang. Es wird dabei nichts versendet und niemand benachrichtigt, und alle Einträge sind zunächst nur für den jeweiligen Interessenten sichtbar',
    'Eine Frage lässt sich nicht auf "beantwortet" setzen, solange kein Antworttext vorliegt. Sonst steht in der Liste erledigt, und beim Interessenten steht nichts',
    'Wer nicht als Interessent des Mandats geführt ist, bekommt keine Frage zugeordnet, sondern eine Meldung. Fragen hängen am Nutzerkonto, nicht am CRM-Kontakt',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
