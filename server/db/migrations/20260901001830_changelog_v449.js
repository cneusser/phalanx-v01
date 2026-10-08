/** Changelog v0.449 (Warum ein Kontakt kein Nutzerkonto hat). */
const ENTRY = {
  version: 'v0.449', released_on: '2026-10-08',
  title: 'Warum ein Kontakt kein Nutzerkonto hat',
  items: [
    'Ein Kontakt kann in drei Mandaten mitarbeiten und trotzdem "kein Nutzerkonto" tragen. Beides stimmt gleichzeitig: Die Mitarbeit hängt am Mandat und braucht keine E-Mail, das Konto wird aber über die E-Mail gesucht',
    'Die Meldung sagte wahrheitsgemäß, was fehlt, und verschwieg den Ausweg. Jetzt steht dabei, warum die Suche nichts findet und was zu tun ist, mit einem Knopf, der die Kontosuche mit dem Nachnamen öffnet',
    'Neu im Verwaltungsbereich: ein Bericht über alle Kontakte, die an Mandaten hängen und kein verknüpftes Konto haben. Je Fall steht dort der Grund, wie viele Mandate betroffen sind und wie viele davon schon beim Datenraum angekommen sind',
    'Wo ein Konto mit demselben Nachnamen existiert, steht es als Vorschlag daneben, mit dem Vermerk, ob auch der Vorname passt. Verknüpft wird nichts automatisch: Zwei Menschen können denselben Namen tragen, und eine falsche Verknüpfung gibt jemandem fremde Unterlagen',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
