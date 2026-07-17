// Prüft, was als echte Reaktion auf ein Mailing zählt.
// DB wird gestubbt, da campaigns.js sie beim Laden einbindet.
const dbPath = require.resolve('../db/database');
require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: {
  get: async () => null, all: async () => [], run: async () => {}, insert: async () => 1, auditLog: () => {},
} };
const { reactionOf } = require('../utils/campaigns');

let fail = 0;
const ok = (n, c) => { console.log((c ? '✓' : '✗ FEHLER') + ' ' + n); if (!c) fail++; };

ok('Einwilligung zählt als Reaktion', reactionOf({ invite_status: 'consented' }) === 'Einwilligung erteilt');
ok('Registrierung zählt als Reaktion', reactionOf({ invite_status: 'registered' }) === 'Einwilligung erteilt');
ok('Absage zählt als Reaktion', reactionOf({ invite_status: 'declined' }) === 'abgelehnt');
ok('Mailantwort zählt als Reaktion', reactionOf({ replied: 1 }) === 'Antwort erhalten');
ok('Widerspruch zählt (als Widerspruch)', reactionOf({ consent_status: 'opt_out' }) === 'Widerspruch');

// Der springende Punkt: „aktiv im Funnel" ist KEINE Reaktion auf die Mail
ok('aktive Funnel-Partei zählt NICHT als Reaktion', reactionOf({ party_status: 'active' }) === null);
ok('ausgestiegene Partei zählt NICHT als Reaktion', reactionOf({ party_status: 'dropped' }) === null);
ok('nur angeschrieben, nichts weiter → keine Reaktion', reactionOf({}) === null);

console.log(fail ? `\n${fail} FEHLER` : '\nAlle Tests grün');
process.exit(fail ? 1 : 0);
