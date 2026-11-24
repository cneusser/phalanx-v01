/** Changelog v0.497 (niemand bleibt an der Tür stehen). */
const ENTRY = {
  version: 'v0.497', released_on: '2026-11-24',
  title: 'Der Roboter-Test sperrt niemanden mehr aus, und die Abweisung sagt, was zu tun ist',
  items: [
    'Anlass war die Rückmeldung eines Empfängers der Mandatsmail: anmelden gehe nicht, registrieren auch nicht, die Sicherheitsprüfung funktioniere nicht. Beides stimmte, und beides lag an uns',
    'Das Anmelde- und das Registrierungsformular schickten los, sobald jemand auf den Knopf drückte, auch wenn der Roboter-Test noch gar nicht fertig war. Dann ging ein leeres Merkmal hinaus, und der Server wies es ab mit der Bitte, den Sicherheitscheck zu bestätigen. Jetzt warten die Formulare auf den Test, bis zu zehn Sekunden, und schicken erst dann',
    'War die Auskunft über den Schlüssel nicht erreichbar, stand auf der Seite überhaupt nichts zum Bestätigen, und die Abweisung kam trotzdem. Jetzt gilt der Test in diesem Fall als nicht verfügbar, die Anmeldung läuft weiter und der Vorgang wird protokolliert',
    'Die Abweisung sagt jetzt, was zu tun ist, statt nur „kein Roboter". Und wenn Cloudflare ablehnt, steht der Grund im Protokoll, statt dass man zwischen abgelaufenem Merkmal, falscher Domain und verbrauchtem Merkmal raten muss',
    'Die Anmeldung antwortete auf eine falsche Eingabe mit „Ungültige Anmeldedaten". Der Empfänger las daraus, seine Adresse sei unbekannt, und versuchte sich zu registrieren. Jeder, der die Mandatsmail bekommt, hat aber ein Konto; es fehlte nur das Passwort. Die Meldung verweist jetzt auf „Passwort vergessen" und verrät weiterhin nicht, welche der beiden Angaben falsch war',
  ],
};
exports.up = async function (knex) {
  const exists = await knex('changelog').where({ version: ENTRY.version }).first().catch(() => null);
  if (!exists) await knex('changelog').insert({ tenant_id: 1, version: ENTRY.version, released_on: ENTRY.released_on, title: ENTRY.title, items_json: JSON.stringify(ENTRY.items) });
};
exports.down = async function (knex) { await knex('changelog').where({ version: ENTRY.version }).del().catch(() => {}); };
