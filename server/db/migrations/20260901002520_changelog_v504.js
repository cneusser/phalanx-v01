/** Changelog v0.504 (der per Mail unterschriebene NDA bekommt einen Platz). */
const ENTRY = {
  version: 'v0.504', released_on: '2026-11-24',
  title: 'Vertraulichkeitsvereinbarungen aus dem Postfach werden dokumentiert statt vermerkt',
  items: [
    'Viele NDAs laufen weiterhin über E-Mail und kommen als unterschriebenes PDF zurück. Bis hierher hatte die Plattform dafür nur ein Auswahlfeld mit dem Wert „liegt vor". Ein Wert, der etwas behauptet, ohne es zu belegen, und ein geöffneter Datenraum, dessen Grundlage im Postfach lag',
    'Am Kontakt steht jetzt unter jedem Mandat „NDA hochlegen". Hinterlegt werden Datei, Unterzeichnungsdatum, Name des Unterzeichners, Vertragspartei mit Sitz und Register, die Herkunft und eine freiwillige Bemerkung. Fehlt eine Pflichtangabe, wird nichts gespeichert: Ein unvollständiger Nachweis ist schlechter als keiner, weil er aussieht, als wäre die Sache erledigt',
    'Zu jeder Datei wird eine Prüfsumme gebildet, dieselbe wie beim Online-Weg. Damit lässt sich ein Jahr später zeigen, dass die abgelegte Fassung die unterschriebene ist',
    'Mit dem Hinterlegen springt das Kennzeichen auf „liegt vor" und die Ampel auf dem ersten Schritt auf Grün. Daneben steht künftig, ob dazu eine Datei vorliegt oder ob der Stand nur vermerkt wurde',
    'Die Datei liegt außerhalb des Datenraums. Der Datenraum ist das, was ein Käufer sehen darf; eine Urkunde über die Verwaltung gehört nicht in denselben Baum. Abrufbar ist sie für die Verwaltung des Mandats und für den Unterzeichner selbst, der sie in seinem Konto beim Mandat findet. Jeder Abruf steht im Protokoll',
    'Gelöscht wird nichts. Kommt eine neue Fassung, wird sie hochgelegt und die alte als ersetzt gekennzeichnet. Beide bleiben lesbar',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
