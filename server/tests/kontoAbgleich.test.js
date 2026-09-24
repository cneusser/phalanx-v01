// Konten und Kontakte abgleichen (v0.403).
//
// Eine falsche Verknüpfung würde einem Fremden den Datenraum öffnen. Deshalb
// wird hier nicht nur geprüft, dass richtige Paare gefunden werden, sondern vor
// allem, dass falsche Paare unter der Schwelle bleiben.
const { bewerte, namensschluessel, firmenschluessel } = require('../utils/kontoAbgleich');

let fail = 0;
const ok = (n, c) => { console.log((c ? '✓' : '✗ FEHLER') + ' ' + n); if (!c) fail++; };
const SCHWELLE = 60;

// ── Namen und Firmen vergleichbar machen ────────────────────────────────────
ok('Umlaute werden aufgelöst', namensschluessel('Jürgen', 'Müller') === namensschluessel('Juergen', 'Mueller'));
ok('Reihenfolge der Namen egal', namensschluessel('Anna', 'Berg') === namensschluessel('Berg', 'Anna'));
ok('verschiedene Namen bleiben verschieden', namensschluessel('Anna', 'Berg') !== namensschluessel('Anna', 'Bergmann'));
ok('Rechtsform fällt weg', firmenschluessel('Kernwerk Gruppe GmbH') === firmenschluessel('Kernwerk'));
ok('verschiedene Firmen bleiben verschieden', firmenschluessel('Kernwerk') !== firmenschluessel('Steinwerk'));

// ── Der Fall, der den Anlass gab ────────────────────────────────────────────
const kontakt = { first_name: 'Kernwerk', last_name: 'Gruppe', email: '', company: 'Kernwerk Gruppe' };
const konto = { first_name: 'Christopher', last_name: 'Helm', email: 'info@kernwerk-gruppe.de', company: 'Kernwerk Gruppe' };
const r1 = bewerte(kontakt, konto);
ok('Firmenkontakt und persönliches Konto werden erkannt', r1.punkte >= SCHWELLE);
ok('mit nachvollziehbarer Begründung', r1.gruende.length > 0);

// ── Gleiche Adresse ist der sichere Fall ────────────────────────────────────
const r2 = bewerte({ email: 'a.berg@firma.de', last_name: 'Berg' }, { email: 'A.Berg@Firma.de', last_name: 'Berg' });
ok('gleiche Adresse ergibt volle Sicherheit', r2.punkte === 100);
ok('Groß- und Kleinschreibung egal', r2.gruende[0] === 'gleiche E-Mail-Adresse');

// ── Was auf keinen Fall zusammengehören darf ────────────────────────────────
const fremd = [
  [{ first_name: 'Anna', last_name: 'Berg', email: 'anna@gmail.com', company: '' },
   { first_name: 'Tom', last_name: 'Klein', email: 'tom@gmail.com', company: '' },
   'zwei Fremde bei Freemail'],
  [{ first_name: 'Anna', last_name: 'Berg', email: 'anna.berg@gmail.com', company: 'Berg GmbH' },
   { first_name: 'Paul', last_name: 'Weiss', email: 'paul@gmx.de', company: 'Weiss AG' },
   'verschiedene Namen und Firmen'],
  [{ first_name: '', last_name: '', email: '', company: '' },
   { first_name: 'Tom', last_name: 'Klein', email: 'tom@firma.de', company: 'Firma' },
   'leerer Kontakt trifft auf niemanden'],
  [{ first_name: 'Anna', last_name: 'Berg', email: 'anna@web.de', company: '' },
   { first_name: 'Bert', last_name: 'Hahn', email: 'bert@web.de', company: '' },
   'gleiche Freemail-Domain zählt nicht'],
];
for (const [k, u, was] of fremd) {
  const r = bewerte(k, u);
  ok(`${was}: bleibt unter der Schwelle (${r.punkte})`, r.punkte < SCHWELLE);
}

// ── Gleiche Firmendomain ist ein Hinweis, aber allein zu wenig ──────────────
const r3 = bewerte({ first_name: 'Anna', last_name: 'Berg', email: 'anna@spezialbau-nord.de', company: '' },
  { first_name: 'Tom', last_name: 'Klein', email: 'tom@spezialbau-nord.de', company: '' });
ok('gleiche Firmendomain allein reicht nicht für einen Vorschlag', r3.punkte < SCHWELLE);
ok('sie wird aber als Grund genannt', r3.gruende.some((g) => /Firmendomain/.test(g)));

// ── Gleicher Name plus Firmendomain reicht ──────────────────────────────────
const r4 = bewerte({ first_name: 'Anna', last_name: 'Berg', email: 'info@spezialbau-nord.de', company: '' },
  { first_name: 'Anna', last_name: 'Berg', email: 'a.berg@spezialbau-nord.de', company: '' });
ok('gleicher Name und Firmendomain ergeben einen Vorschlag', r4.punkte >= SCHWELLE);

// ── Nachname in der Konto-Adresse ───────────────────────────────────────────
const r5 = bewerte({ first_name: 'Christopher', last_name: 'Helm', email: '', company: 'Kernwerk' },
  { first_name: 'Christopher', last_name: 'Helm', email: 'helm@kernwerk.de', company: '' });
ok('Nachname in der Adresse stützt den Vorschlag', r5.punkte >= SCHWELLE);

// Kurze Nachnamen dürfen nicht zufällig überall passen.
const r6 = bewerte({ first_name: 'Otto', last_name: 'Alt', email: '', company: '' },
  { first_name: 'Peter', last_name: 'Neu', email: 'kontakt@altbau-service.de', company: '' });
ok('kurzer Nachname löst keinen Zufallstreffer aus', r6.punkte < SCHWELLE);

console.log(fail ? `\n${fail} Fehler` : '\nAlle Prüfungen bestanden');
process.exit(fail ? 1 : 0);
