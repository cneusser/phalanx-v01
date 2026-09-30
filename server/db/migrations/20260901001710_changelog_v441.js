/** Changelog v0.441 (Übernehmen repariert, passende Mandate je Interessent). */
const ENTRY = {
  version: 'v0.441', released_on: '2026-09-30',
  title: 'Übernehmen repariert, passende Mandate je Interessent',
  items: [
    'Das Übernehmen eines eingelesenen Anschreibens brach mit "Interner Serverfehler" ab. Zwei Werte standen in Feldern, in die sie nicht gehören',
    'Der Sektor einer Firma ist das, was sie selbst ist, nicht das, worin sie investiert. Dort stand der gesuchte Sektor als Taxonomie-Code. Damit wären alle Investoren als Dienstleister im Bestand gelandet und jede Auswertung wertlos geworden. Jetzt wird die Art der Gesellschaft aus dem Anschreiben erkannt und gegen das Vokabular geprüft',
    'Auch der Käufertyp war erfunden: Die Liste kennt "financial", nicht "finanzinvestor"',
    'Scheitert das Übernehmen künftig, nennt die Meldung den Grund im Klartext statt "Interner Serverfehler". Ohne diese Auskunft beginnt das Raten',
    'Neu im Kontakt unter Mandate: "Suchprofil abgleichen" zeigt, welche laufenden Mandate zum hinterlegten Suchprofil passen, mit Begründung je Treffer. Daraus lässt sich ein Nachrichtenentwurf mit den öffentlichen Kurzprofilen vorbereiten. Versendet wird nichts, bevor Sie ihn gelesen und abgeschickt haben',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
