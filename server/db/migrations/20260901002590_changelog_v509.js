/** Changelog v0.509 (Historie nach Phalanx OS, Lücken sichtbar, Vorschläge auf Klick). */
const ENTRY = {
  version: 'v0.509', released_on: '2026-11-26',
  title: 'Die Historie wandert nach Phalanx OS, und fehlende Angaben werden sichtbar',
  items: [
    'CapitalMatch meldete an Phalanx OS bisher nur Stammdaten zurück: Name, Adresse, Telefon, Position, Firma. Das ist ein Adressbuchabgleich, keine Historie. Ab jetzt geht zusätzlich der Stand mit: die Rolle, also unter anderem „Nachfolger", die erreichte Stufe, die Liste der Mandate mit Stand je Mandat, und die Vertraulichkeitsvereinbarung mit Datum, Herkunft und Prüfsumme',
    'Phalanx OS musste dafür nicht angefasst werden. Der Kanal dafür besteht dort seit Langem und wurde bisher nicht benutzt. Gemeldet wird bei jeder Unterschrift, bei jedem hinterlegten Dokument, bei jeder Freigabe des Datenraums und bei jedem Wechsel der Funnel-Stufe',
    'Die Urkunde selbst bleibt in CapitalMatch. Dieselbe Datei an zwei Orten ist eine Datei, die auseinanderlaufen kann; gemeldet wird, dass sie vorliegt, mit Link dorthin',
    'Neu unter Berichte: „Wo Angaben fehlen". Keine Prozentzahl, sondern die fehlenden Felder beim Namen, für Kontakte und für Firmen, mit der Zählung, was am häufigsten fehlt, und einem Suchfeld. Dazu die Zahl derer, die man überhaupt fragen kann: eingewilligt, Adresse bekannt, und es fehlt etwas, das sie selbst wissen',
    'Am Kontakt steht jetzt ein Vorschlag, zu welcher Firma er vermutlich gehört, wenn eine andere Person dieselbe Adressdomäne hat oder die Webseite der Firma darauf läuft. Freimail-Adressen zählen dabei nicht. Zugeordnet wird nichts von selbst, der Grund steht dabei',
    'An der Firma lassen sich maschinelle Vorschläge für Branche, Größenordnung, Region und Webseite holen. Sie stehen mit Quelle, Begründung und Selbsteinschätzung neben dem Feld, nie darin, und werden erst auf Klick übernommen. In ein Feld, in dem bereits etwas steht, wird nicht übernommen. Ohne eingerichteten Dienst passiert nichts: Geraten wird nicht',
    'Die Telefonnummer der Ansprechperson zählt jetzt zu den Stammdaten und lässt sich auf der Pflegeseite ohne Anmeldung selbst nachtragen. Sie fehlt in der Praxis am häufigsten und ist die eine Angabe, die sich nicht recherchieren lässt',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
