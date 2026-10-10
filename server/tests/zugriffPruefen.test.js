// ─────────────────────────────────────────────────────────────────────────────
// Zugriff eines Kontakts prüfen: Birdview im CRM (v0.455)
//
// Anlass: „Ich bekomme bei Herrn Eder den Hinweis, dass er die Dokumente nicht
// anklicken kann. Ich würde das gerne in seinem Blick nachvollziehen."
//
// Zwei Dinge werden hier geprüft, und das zweite ist das wichtigere:
//
//   1. Die Zählung stimmt. Ein Baum mit vertraulichen Zweigen, Einzelfreigaben
//      und Gruppen ergibt genau die Zahlen, die oben stehen.
//   2. Es gibt keine zweite Fassung der Regeln. Der Datenraum und die Prüfung
//      rufen dieselbe Funktion auf. Eine Nachbildung würde prüfen, was sie
//      selbst annimmt, und am Tag, an dem beide auseinanderlaufen, sieht
//      jemand etwas, was er nicht sehen sollte.
//
// Die Bäume sind bewusst keine Kurzfassungen: vertraulich unter vertraulich,
// Einzelfreigabe tief im gesperrten Zweig, Gruppenfreigabe auf einem Ordner.
// Genau daran scheitert es in der Praxis, nicht an zwei Dateien nebeneinander.
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');

let fail = 0;
const ok = (n, c) => { console.log((c ? '✓' : '✗ FEHLER') + ' ' + n); if (!c) fail++; };

const wurzel = path.join(__dirname, '..', '..');
const lies = (...p) => fs.readFileSync(path.join(wurzel, ...p), 'utf8');

const sichtbarkeit = require('../utils/safeVisibility');
const admin = lies('server', 'routes', 'admin.js');
const safe = lies('server', 'routes', 'safe.js');
const modul = lies('server', 'utils', 'datenraumSicht.js');
const komp = lies('client', 'src', 'components', 'ZugriffPruefen.jsx');
const drawer = lies('client', 'src', 'components', 'ContactDrawer.jsx');
const docs = lies('server', 'routes', 'documents.js');

// ── 1. Eine Fassung der Regeln, nicht zwei ─────────────────────────────────
console.log('\n── Eine Fassung der Regeln ──');
ok('Das Modul datenraumSicht existiert', modul.length > 0);
ok('Der Datenraum ruft es auf', /require\('\.\.\/utils\/datenraumSicht'\)/.test(safe));
ok('Die Prüfroute ruft es auf', /require\('\.\.\/utils\/datenraumSicht'\)/.test(admin));
ok('Das Modul nutzt safeVisibility, baut nichts nach', /require\('\.\/safeVisibility'\)/.test(modul));
ok('safe.js baut den Käufer-Kontext nicht mehr selbst', !/stageAllows\(stage, 'dataroom'\)/.test(safe));
ok('Die Prüfung nutzt checkDownloadAccess aus documents.js', /checkDownloadAccess/.test(admin));
ok('documents.js gibt die Prüfung heraus', /module\.exports\.checkDownloadAccess\s*=/.test(docs));
ok('Die Prüfung rechnet die Stage nicht selbst aus', !/stage\s*===\s*'dataroom_granted'/.test(admin.split('/contacts/:id/zugriff')[1] || ''));

// ── 2. Die Zählung gegen einen echten Baum ─────────────────────────────────
//
//  1 Allgemein (Ordner)
//    2 Jahresabschluss.pdf
//  3 Clean Team (Ordner, vertraulich)
//    4 Kundenliste.xlsx
//    5 Vertraege (Ordner)
//      6 Grossvertrag.pdf        ← Einzelfreigabe nur lesen für Nutzer 7
//  8 Personal (Ordner, vertraulich)
//    9 Gehaelter.xlsx
console.log('\n── Zählung gegen einen echten Baum ──');
const items = [
  { id: 1, parent_id: null, is_folder: 1, confidential: 0, name: 'Allgemein' },
  { id: 2, parent_id: 1, is_folder: 0, confidential: 0, name: 'Jahresabschluss.pdf' },
  { id: 3, parent_id: null, is_folder: 1, confidential: 1, name: 'Clean Team' },
  { id: 4, parent_id: 3, is_folder: 0, confidential: 0, name: 'Kundenliste.xlsx' },
  { id: 5, parent_id: 3, is_folder: 1, confidential: 0, name: 'Vertraege' },
  { id: 6, parent_id: 5, is_folder: 0, confidential: 0, name: 'Grossvertrag.pdf' },
  { id: 8, parent_id: null, is_folder: 1, confidential: 1, name: 'Personal' },
  { id: 9, parent_id: 8, is_folder: 0, confidential: 0, name: 'Gehaelter.xlsx' },
];
const grants = [{ item_id: 6, subject_type: 'user', subject_ref: 7, level: 'read' }];
const bew = sichtbarkeit.bewerteBaum({ items, grants, userId: 7, buyerType: null, groupIds: [] });

const { zusammenfassen } = require('../utils/datenraumSicht');
const z = zusammenfassen(items, bew);
ok('Vier Dateien im Baum', z.dateien_gesamt === 4);
ok('Vier Ordner im Baum', z.ordner_gesamt === 4);
ok('Zwei Dateien sichtbar (Jahresabschluss und der freigegebene Grossvertrag)', z.dateien_sichtbar === 2);
ok('Nur eine davon ladbar: die Lesefreigabe erlaubt keinen Download', z.dateien_ladbar === 1);
ok('Der Personal-Ordner erscheint gesperrt', z.eintraege_gesperrt >= 1);
ok('Die Gehaelter bleiben unsichtbar, nicht nur gesperrt', !bew.has(9));
ok('Die Kundenliste im vertraulichen Zweig bleibt unsichtbar', !bew.has(4));
ok('Der Weg zur Einzelfreigabe öffnet sich', bew.has(5) && !bew.get(5).gesperrt);
ok('Der freigegebene Vertrag ist sichtbar, aber ohne Download', bew.get(6) && bew.get(6).download === false);

// Ohne jede Freigabe: alles Vertrauliche zu, der Rest offen
const bewOhne = sichtbarkeit.bewerteBaum({ items, grants: [], userId: 99, buyerType: null, groupIds: [] });
const zOhne = zusammenfassen(items, bewOhne);
ok('Ohne Freigabe bleibt nur die eine offene Datei', zOhne.dateien_sichtbar === 1);
ok('Ohne Freigabe ist diese eine ladbar', zOhne.dateien_ladbar === 1);
ok('Ohne Freigabe sind beide vertraulichen Ordner gesperrt', zOhne.eintraege_gesperrt === 2);

// Gruppenfreigabe auf dem vertraulichen Ordner: der ganze Zweig öffnet sich
const bewGruppe = sichtbarkeit.bewerteBaum({
  items, grants: [{ item_id: 3, subject_type: 'group', subject_ref: 4, level: 'download' }],
  userId: 11, buyerType: null, groupIds: [4],
});
const zGruppe = zusammenfassen(items, bewGruppe);
ok('Gruppenfreigabe öffnet den Clean-Team-Zweig vollständig', zGruppe.dateien_sichtbar === 3);
ok('Und erlaubt dort auch den Download', zGruppe.dateien_ladbar === 3);
ok('Der andere vertrauliche Ordner bleibt davon unberührt', zGruppe.eintraege_gesperrt === 1);

// ── 3. Die Route sagt beim fehlenden Konto, was zu tun ist ─────────────────
console.log('\n── Fehlendes Konto ist eine Antwort, keine Leerstelle ──');
const abschnitt = admin.split("router.get('/contacts/:id/zugriff'")[1] || '';
ok('Die Route existiert', abschnitt.length > 0);
ok('Ohne Konto wird geantwortet statt geschwiegen', /kein Nutzerkonto/.test(abschnitt));
ok('Der Hinweis nennt den Ausweg (einladen oder verknüpfen)', /einladen/.test(abschnitt) && /verknüpf/i.test(abschnitt));
ok('Der Fall ohne E-Mail wird eigens behandelt', /keine E-Mail hinterlegt/.test(abschnitt));
ok('Das Konto wird wie in der Kontaktakte gesucht: Verknüpfung, dann Adresse',
  /WHERE id = \?/.test(abschnitt) && /lower\(email\) = lower\(\?\)/.test(abschnitt));

// ── 4. Nur lesen, und protokolliert ────────────────────────────────────────
console.log('\n── Nur lesen ──');
ok('Die Route schreibt nichts in die Datenbank',
  !/INSERT INTO|UPDATE\s+\w+\s+SET|DELETE FROM/i.test(abschnitt.split("router.get('/projects'")[0]));
ok('Der Abruf selbst wird protokolliert', /ZUGRIFF_GEPRUEFT/.test(abschnitt));
ok('Es ist eine GET-Route, keine POST', /router\.get\('\/contacts\/:id\/zugriff'/.test(admin));
ok('Die Wache steht davor', /router\.get\('\/contacts\/:id\/zugriff', \.\.\.isAdmin/.test(admin));

// ── 5. Die Oberfläche zeigt das Urteil des Servers ─────────────────────────
console.log('\n── Oberfläche ──');
ok('Die Komponente holt das Urteil vom Server', /\/admin\/contacts\/\$\{contactId\}\/zugriff/.test(komp));
ok('Sie rechnet nichts selbst aus', !/stageAllows|dataroom_granted/.test(komp));
ok('Vier Urteile werden unterschieden',
  ['laden', 'nur_ansicht', 'gesperrt', 'unsichtbar'].every((u) => komp.includes(u)));
ok('Der erste offene Punkt der Kette wird benannt', /ersteLuecke/.test(komp));
ok('Ein Fehler erscheint als Fehler, nicht als leere Liste', /fehler &&/.test(komp));
ok('Die Kontaktakte bindet sie ein', /<ZugriffPruefen/.test(drawer));
ok('Ohne Konto führt ein Knopf zur Prüfung', /Zugriff prüfen/.test(drawer));
ok('Mit Konto bleibt der Weg zur Birdview', /onBirdview/.test(drawer) && /startBirdview/.test(drawer));

console.log(fail ? `\n${fail} Fehler` : '\nAlles grün');
process.exit(fail ? 1 : 0);
