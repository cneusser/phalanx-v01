// Prüft die Zugriffs-Auflösung der Safe-Freigaben (Vererbung, Gruppen, Stufen).
const { resolveLevel, grantMatchesUser } = require('../utils/safeAccess');

let fail = 0;
const ok = (n, c) => { console.log((c ? '✓' : '✗ FAIL') + ' ' + n); if (!c) fail++; };

const user = { userId: 7, buyerType: 'strategic', isParty: true, groupIds: new Set([3, 5]) };

// Einzelne Treffer je Subjekt-Typ
ok('user-Grant trifft', grantMatchesUser({ subject_type: 'user', subject_ref: 7 }, user) === true);
ok('fremder user-Grant trifft nicht', grantMatchesUser({ subject_type: 'user', subject_ref: 8 }, user) === false);
ok('buyer_group trifft', grantMatchesUser({ subject_type: 'buyer_group', subject_ref: 'strategic' }, user) === true);
ok('falsche buyer_group trifft nicht', grantMatchesUser({ subject_type: 'buyer_group', subject_ref: 'financial' }, user) === false);
ok('party_all trifft Beteiligte', grantMatchesUser({ subject_type: 'party_all' }, user) === true);
ok('group trifft Mitglied', grantMatchesUser({ subject_type: 'group', subject_ref: 5 }, user) === true);
ok('group trifft Nicht-Mitglied nicht', grantMatchesUser({ subject_type: 'group', subject_ref: 9 }, user) === false);

// Auflösung: höchste Stufe gewinnt (download > read)
ok('keine Grants → kein Zugriff', resolveLevel([], user) === null);
ok('nur read', resolveLevel([{ subject_type: 'party_all', level: 'read' }], user) === 'read');
ok('download schlägt read', resolveLevel([
  { subject_type: 'party_all', level: 'read' },
  { subject_type: 'user', subject_ref: 7, level: 'download' },
], user) === 'download');
ok('Vererbung: Ordner-Grant zählt mit', resolveLevel([
  { subject_type: 'group', subject_ref: 3, level: 'download' }, // vom Elternordner
], user) === 'download');
ok('nicht zutreffende Grants ignoriert', resolveLevel([
  { subject_type: 'user', subject_ref: 99, level: 'download' },
  { subject_type: 'buyer_group', subject_ref: 'venture_capital', level: 'download' },
], user) === null);

// Nutzer ohne Kontext (kein Beteiligter, keine Gruppe)
const outsider = { userId: 1, buyerType: 'financial', isParty: false, groupIds: new Set() };
ok('Außenstehender ohne passende Freigabe', resolveLevel([
  { subject_type: 'party_all', level: 'download' },
  { subject_type: 'group', subject_ref: 3, level: 'download' },
], outsider) === null);
ok('Außenstehender mit passender buyer_group', resolveLevel([
  { subject_type: 'buyer_group', subject_ref: 'financial', level: 'read' },
], outsider) === 'read');

console.log(fail ? `\n${fail} FEHLER` : '\nAlle Tests grün');
process.exit(fail ? 1 : 0);
