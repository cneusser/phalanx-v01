// Prüft die Spiegelung von Nutzer-Interaktionen in den Deal-Funnel.
// Die Datenbank wird gestubbt, damit der Test ohne Postgres läuft.
const path = require('path');
const dbPath = require.resolve('../db/database');

const calls = { inserts: [], updates: [] };
let contactRow = null;   // was findet SELECT crm_contacts?
let partyRow = null;     // was findet SELECT crm_deal_parties?

require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: {
  get: async (sql) => {
    if (/FROM users/.test(sql)) return { id: 7, email: 'A.Malessa@familytrust.de', first_name: 'Alexander', last_name: 'Malessa' };
    if (/FROM projects/.test(sql)) return { tenant_id: 1 };
    if (/FROM crm_contacts/.test(sql)) return contactRow;
    if (/FROM crm_deal_parties/.test(sql)) return partyRow;
    return null;
  },
  all: async () => [],
  run: async (sql, params) => { calls.updates.push({ sql, params }); },
  insert: async (sql, params) => {
    calls.inserts.push({ sql, params });
    if (/INSERT INTO crm_contacts/.test(sql)) return 55;
    return 99;
  },
  auditLog: () => {}, activityLog: () => {},
} };

const { syncFromUser, planFor } = require('../utils/dealSync');

let fail = 0;
const ok = (n, c) => { console.log((c ? '✓' : '✗ FEHLER') + ' ' + n); if (!c) fail++; };

// 1) Stufen-Mapping
ok('NDA-Interesse landet auf Funnel-Stufe 3', planFor('interest', 'requested').stage === 3);
ok('Datenraum-Freigabe landet auf Stufe 4', planFor('interest', 'dataroom_granted').stage === 4);
ok('Beobachten landet im Eingang (Stufe 0)', planFor('watchlist').stage === 0 && planFor('watchlist').signal === 'watchlist');
ok('Mailing landet auf Angesprochen (Stufe 1)', planFor('mailing').stage === 1);

(async () => {
  // 2) Kontakt fehlt, Partei fehlt → beide werden angelegt
  contactRow = null; partyRow = null; calls.inserts = []; calls.updates = [];
  await syncFromUser(7, 3, { kind: 'interest', interestStage: 'dataroom_granted' });
  const contactIns = calls.inserts.find(c => /INSERT INTO crm_contacts/.test(c.sql));
  const partyIns = calls.inserts.find(c => /INSERT INTO crm_deal_parties/.test(c.sql));
  ok('neuer CRM-Kontakt wird angelegt', !!contactIns);
  ok('Kontakt bekommt opt_in (registrierter Nutzer)', /'opt_in'/.test(contactIns.sql));
  ok('neue Funnel-Partei wird angelegt', !!partyIns && partyIns.params.includes(4));
  ok('Partei ist als inbound markiert', /'inbound'/.test(partyIns.sql) && partyIns.params.includes('interest'));

  // 3) Kontakt existiert bereits (Match per E-Mail) → kein zweiter Kontakt
  contactRow = { id: 55 }; partyRow = null; calls.inserts = []; calls.updates = [];
  await syncFromUser(7, 3, { kind: 'watchlist' });
  ok('bestehender Kontakt wird wiederverwendet', !calls.inserts.some(c => /INSERT INTO crm_contacts/.test(c.sql)));

  // 4) Partei existiert → Update statt Insert, nur hochstufen
  contactRow = { id: 55 }; partyRow = { id: 99, funnel_stage: 3, party_status: 'active', source: 'outreach' };
  calls.inserts = []; calls.updates = [];
  await syncFromUser(7, 3, { kind: 'watchlist' });
  const upd = calls.updates.find(u => /UPDATE crm_deal_parties/.test(u.sql));
  ok('bestehende Partei wird aktualisiert, nicht doppelt angelegt', !!upd && !calls.inserts.some(c => /crm_deal_parties/.test(c.sql)));
  ok('Outreach-Herkunft bleibt erhalten (GREATEST/CASE im SQL)', /GREATEST/.test(upd.sql) && /outreach/.test(upd.sql));

  console.log(fail ? `\n${fail} FEHLER` : '\nAlle Tests grün');
  process.exit(fail ? 1 : 0);
})();
