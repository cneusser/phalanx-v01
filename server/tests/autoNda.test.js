// Prüft die automatische NDA-Einladung nach der Registrierung (Guards + Ablauf).
// DB und Nachbarmodule werden gestubbt, damit der Test ohne Postgres läuft.
const dbPath = require.resolve('../db/database');
const gatesPath = require.resolve('../middleware/gates');
const emailPath = require.resolve('../utils/email');

const calls = { mails: [], inserts: [], stages: [] };
let project = { id: 5, codename: 'BETONGOLD', status: 'active' };
let ndaRow = null;

require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: {
  get: async (sql) => {
    if (/FROM projects/.test(sql)) return project;
    if (/FROM users/.test(sql)) return { id: 7, email: 'g@x.de', salutation: 'Herr', last_name: 'Geserer' };
    if (/FROM nda_requests/.test(sql)) return ndaRow;
    return null;
  },
  insert: async (sql, p) => { calls.inserts.push({ sql, p }); return 1; },
  run: async () => {},
  auditLog: () => {},
} };
require.cache[gatesPath] = { id: gatesPath, filename: gatesPath, loaded: true, exports: {
  setStage: async (u, pid, stage) => { calls.stages.push({ u, pid, stage }); },
} };
require.cache[emailPath] = { id: emailPath, filename: emailPath, loaded: true, exports: {
  sendProcessUpdateEmail: async (m) => { calls.mails.push(m); return true; },
} };

const { sendNdaInviteAfterRegister } = require('../utils/outreach');
const db = require('../db/database');

let fail = 0;
const ok = (n, c) => { console.log((c ? '✓' : '✗ FEHLER') + ' ' + n); if (!c) fail++; };

(async () => {
  // Ohne Mandat: nichts passiert
  let r = await sendNdaInviteAfterRegister(db, { userId: 7, projectId: null });
  ok('ohne Mandat wird nichts gesendet', r.sent === false && calls.mails.length === 0);

  // Mit aktivem Mandat: Stage gesetzt, NDA-Anfrage angelegt, Mail raus
  calls.mails = []; calls.inserts = []; calls.stages = []; ndaRow = null;
  r = await sendNdaInviteAfterRegister(db, { userId: 7, projectId: 5 });
  ok('Interesse auf „requested" gesetzt (Funnel → NDA)', calls.stages.some(s => s.stage === 'requested'));
  ok('NDA-Anfrage wird angelegt', calls.inserts.some(i => /INSERT INTO nda_requests/.test(i.sql)));
  ok('NDA-Einladungsmail geht raus', calls.mails.length === 1);
  ok('Mail nennt das Mandat und die NDA', /BETONGOLD/.test(calls.mails[0].title) && /NDA/.test(calls.mails[0].title));
  ok('Mail-CTA führt zum Mandat', calls.mails[0].ctaPath === '/projekte/5');

  // Bestehende NDA-Anfrage: keine zweite anlegen
  calls.inserts = []; ndaRow = { id: 3, status: 'requested' };
  await sendNdaInviteAfterRegister(db, { userId: 7, projectId: 5 });
  ok('keine doppelte NDA-Anfrage', !calls.inserts.some(i => /INSERT INTO nda_requests/.test(i.sql)));

  // Nicht aktives Mandat: kein Versand
  calls.mails = []; project = { id: 5, codename: 'X', status: 'draft' };
  r = await sendNdaInviteAfterRegister(db, { userId: 7, projectId: 5 });
  ok('nur aktive Mandate lösen die NDA-Einladung aus', r.sent === false && calls.mails.length === 0);

  console.log(fail ? `\n${fail} FEHLER` : '\nAlle Tests grün');
  process.exit(fail ? 1 : 0);
})();
