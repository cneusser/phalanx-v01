/** Changelog v0.489 (die Strecke bis zur Unterschrift). */
const ENTRY = {
  version: 'v0.489', released_on: '2026-11-21',
  title: 'Ein Klick statt zwei, und die Unterschrift öffnet den Datenraum',
  items: [
    'Das Plattform-NDA ist entfallen. Dahinter stand kein Dokument: Ein Klick setzte ein Datum, sonst nichts. Kein Text, keine Fassung, kein Nachweis, keine Mail. Das Gütesiegel stand damit auf einem Datum ohne Urkunde, und gegenüber einem Verkäufer trug es nichts. Verbindlich wird es dort, wo es hingehört, nämlich bei der Vereinbarung zum konkreten Mandat',
    '„Vereinbarung anfordern" legte bisher nur einen Satz in der Datenbank an, und wer sie lesen und unterzeichnen wollte, musste ein zweites Mal klicken. Dafür gab es keinen Grund, der Text liegt sofort bereit. Jetzt öffnet sich das Dokument mit demselben Klick',
    'Mit der Unterschrift geht auch der Datenraum auf. Bisher folgte darauf eine zweite, von Hand ausgelöste Freigabe, und der Interessent las „unterschrieben, Freigabe ausstehend". Als vertraulich gekennzeichnete Bereiche bleiben davon unberührt: Sie sind weiterhin gesperrt und brauchen die Einzelfreigabe je Person. Daran ändert sich nichts, und die Prüfung nagelt genau das fest',
    'Das unterzeichnete Dokument geht jetzt an beide Seiten. Der Unterzeichner bekommt es als Anhang, die Beratung bekommt dieselbe Urkunde mit Mandat, Name, Zeitpunkt, IP-Adresse und Fingerabdruck. Bisher bekam der Unterzeichner eine Hinweismail ohne Anhang und die Beratung gar nichts',
    'Bei Startup-Finanzierungen stand auf derselben Seite „ein NDA ist dafür nicht nötig" und daneben „NDA vorab ansehen und unterzeichnen". Der Widerspruch ist weg: Dort gibt es nichts zu unterschreiben, die Unterlagen werden nach kurzer Prüfung freigegeben',
    'Dazu zwei Statustexte, die nicht stimmten. „NDA angefordert, Prüfung ausstehend" heisst jetzt „Vertraulichkeitsvereinbarung liegt bereit", denn geprüft wird nichts. Und „unterschrieben, Freigabe ausstehend" heisst „Unterzeichnet, Unterlagen freigeschaltet"',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
