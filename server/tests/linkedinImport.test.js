// Prüft die reinen Hilfsfunktionen des LinkedIn-Kandidaten-Imports.
const { normalizeLinkedin, nameKey, mapBuyerType, buildTags } = require('../utils/linkedinImport');

let fail = 0;
const ok = (n, c) => { console.log((c ? '✓' : '✗ FEHLER') + ' ' + n); if (!c) fail++; };

// normalizeLinkedin
ok('LinkedIn: Query und Slash entfernt', normalizeLinkedin('https://www.LinkedIn.com/in/Max-Muster/?trk=abc') === 'linkedin.com/in/max-muster');
ok('LinkedIn: Prozent-Kodierung dekodiert', normalizeLinkedin('https://linkedin.com/in/anna%2Dmeier') === 'linkedin.com/in/anna-meier');
ok('LinkedIn: leer -> null', normalizeLinkedin('   ') === null);
ok('LinkedIn: Anker entfernt', normalizeLinkedin('linkedin.com/in/x#foo') === 'linkedin.com/in/x');

// nameKey
ok('Name: Titel entfernt, Umlaute normalisiert', nameKey('Dr. Jörg', 'Müller') === 'joerg mueller');
ok('Name: Prof. Dipl.-Ing. entfernt', nameKey('Prof. Dipl.-Ing. Ute', 'Groß') === 'ute gross');
ok('Name: gleiche Person, gleicher Schlüssel', nameKey('Anna', 'Meier') === nameKey('anna', 'MEIER'));

// mapBuyerType
ok('Käufertyp: pe -> financial', mapBuyerType('pe') === 'financial');
ok('Käufertyp: vc_angel -> venture_capital', mapBuyerType('vc_angel') === 'venture_capital');
ok('Käufertyp: family_office -> family_office', mapBuyerType('family_office') === 'family_office');
ok('Käufertyp: strategic -> strategic', mapBuyerType('strategic') === 'strategic');
ok('Käufertyp: advisor_mandate bleibt', mapBuyerType('advisor_mandate') === 'advisor_mandate');
ok('Käufertyp: investor_generisch -> null', mapBuyerType('investor_generisch') === null);
ok('Käufertyp: unbekannt -> null', mapBuyerType('irgendwas') === null);
ok('Käufertyp: leer -> null', mapBuyerType('') === null);

// buildTags
const tags = buildTags({ passung: 'Stratege (Branche)', prio: 'a', buyerTypeRaw: 'pe' });
ok('Tags: enthält linkedin', tags.includes('linkedin'));
ok('Tags: prio großgeschrieben', tags.includes('prio:A'));
ok('Tags: passung übernommen', tags.includes('passung:Stratege (Branche)'));
ok('Tags: käufertyp-rohwert', tags.includes('kaeufertyp:pe'));
ok('Tags: bestehende bleiben erhalten', buildTags({ existing: ['vip'] }).includes('vip'));
ok('Tags: ungültige Prio ignoriert', !buildTags({ prio: 'X' }).some(t => t.startsWith('prio:')));

console.log(fail ? `\n${fail} FEHLER` : '\nAlle Tests grün');
process.exit(fail ? 1 : 0);
