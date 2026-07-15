// Prüft den Parser für eingehende Marktplatz-Anfragen an der echten DUB-Mail.
const { parseLead, splitName, detectSource } = require('../utils/leadParser');

let fail = 0;
const ok = (n, c) => { console.log((c ? '✓' : '✗ FEHLER') + ' ' + n); if (!c) fail++; };

const DUB = `Deutsche Unternehmerbörse

Sehr geehrte(r) Christian Neusser,
Sie haben eine neue Nachricht auf folgendes Inserat erhalten.
Betreff: Kaufinteresse: Anfrage zu Ihrem Inserat Nr. 17392
Text: Sehr geehrte Damen und Herren,
ich habe ernsthaftes Interesse, Ihr Unternehmen zu kaufen.
Bitte senden Sie mir die Vertraulichkeitsvereinbarung (NDA) zu oder kontaktieren Sie mich direkt für ein erstes Telefonat.
Mit freundlichen Grüßen,
Simon Geserer
Kontaktdaten:
Name: Simon Geserer
Investortyp: Privatperson
Firma:
Adresse: Alferting 1, 83377 Vachendorf, DE
E-Mail: geserer.simon@gmail.com
Telefon: +4917635644618
Interne Referenz: 5381 Betongold
Um vertraulich zu antworten melden Sie sich bitte unter https://www.dub.de/myboerse/nachrichten/ an.
Ihr Team der Deutschen Unternehmerbörse DUB.de`;

const r = parseLead(DUB);
ok('Quelle DUB erkannt', r.source === 'dub' && /Unternehmerb/.test(r.sourceLabel));
ok('E-Mail korrekt (nicht die Portal-Adresse)', r.contact.email === 'geserer.simon@gmail.com');
ok('Telefon erkannt', r.contact.phone.replace(/\s/g, '') === '+4917635644618');
ok('Vorname/Nachname getrennt', r.contact.first_name === 'Simon' && r.contact.last_name === 'Geserer');
ok('Investortyp erkannt', r.contact.investor_type === 'Privatperson');
ok('Adresse erkannt', /Vachendorf/.test(r.contact.location));
ok('Firma leer bleibt leer', r.contact.company === '');
ok('Inseratsnummer erkannt', r.inserat === '17392');
ok('interne Referenz erkannt', /5381/.test(r.ref) && /Betongold/.test(r.ref));
ok('Mandats-Hinweis = Betongold', r.projectHint === 'Betongold');
ok('Herkunftstext nennt Quelle und Inserat', /Deutsche Unternehmerb/.test(r.provenance) && /17392/.test(r.provenance));
ok('als vollständig markiert', r.complete === true);

// Titel-Erkennung
const dr = splitName('Dr. Anna von Berg');
ok('Titel Dr. erkannt', dr.title === 'Dr.' && dr.first_name === 'Anna von' && dr.last_name === 'Berg');

// Unbekanntes Portal → generische, aber höfliche Herkunft
const other = parseLead('Name: Max Mustermann\nE-Mail: max@example.com\nTelefon: 0170 1234567');
ok('unbekannte Quelle → generische Bezeichnung', other.source === 'other' && /Marktplatz/.test(other.sourceLabel));
ok('E-Mail-Fallback ohne Portal', other.contact.email === 'max@example.com');

// nexxt-change erkannt
ok('nexxt-change erkannt', detectSource('... nexxt-change.org ...').key === 'nexxt');

console.log(fail ? `\n${fail} FEHLER` : '\nAlle Tests grün');
process.exit(fail ? 1 : 0);
