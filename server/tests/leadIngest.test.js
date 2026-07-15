// Prüft die gemeinsame Ingest-Logik (Admin-Dialog UND Brevo-Webhook nutzen sie).
// DB wird als einfaches Objekt gestubbt.
const { parseLead } = require('../utils/leadParser');
const { ingestLead, findProjectByHint } = require('../utils/leadIngest');

let fail = 0;
const ok = (n, c) => { console.log((c ? '✓' : '✗ FEHLER') + ' ' + n); if (!c) fail++; };

function makeQ({ contact = null, project = null, party = null } = {}) {
  const calls = { inserts: [], updates: [] };
  const q = {
    get: async (sql) => {
      if (/FROM projects/.test(sql)) return project;
      if (/FROM crm_contacts/.test(sql)) return contact;
      if (/FROM crm_companies/.test(sql)) return null;
      if (/FROM crm_company_contacts/.test(sql)) return null;
      if (/FROM crm_deal_parties/.test(sql)) return party;
      return null;
    },
    all: async () => [],
    run: async (sql, p) => { calls.updates.push({ sql, p }); },
    insert: async (sql, p) => { calls.inserts.push({ sql, p }); return /crm_contacts/.test(sql) ? 55 : 88; },
  };
  return { q, calls };
}

const DUB = `Deutsche Unternehmerbörse DUB.de
Betreff: Kaufinteresse: Anfrage zu Ihrem Inserat Nr. 17392
Name: Simon Geserer
Investortyp: Privatperson
Adresse: Alferting 1, 83377 Vachendorf, DE
E-Mail: geserer.simon@gmail.com
Telefon: +4917635644618
Interne Referenz: 5381 Betongold`;

(async () => {
  // Projekt wird über den Hinweis „Betongold" gefunden
  const { q, calls } = makeQ({ contact: null, project: { id: 9, codename: 'Betongold' } });
  const lead = parseLead(DUB);
  const res = await ingestLead(q, { tenant: 1, lead, actorId: null, auditLog: null });

  ok('Projekt über Codename gefunden', res.project_id === 9);
  ok('neuer Kontakt angelegt', res.created === true && res.contact_id === 55);
  ok('Herkunft gesetzt (DUB)', /Unternehmerb/.test(res.lead_source) && /17392/.test(res.lead_ref));
  const partyIns = calls.inserts.find(c => /crm_deal_parties/.test(c.sql));
  ok('Funnel-Partei auf Stufe 2 (Rückmeldung)', !!partyIns && /'buyer', 2,/.test(partyIns.sql));
  ok('Partei ist inbound/marketplace', /'inbound'/.test(partyIns.sql) && /'marketplace'/.test(partyIns.sql));

  // Ohne Mandats-Treffer: Kontakt trotzdem anlegen, keine Partei
  const { q: q2, calls: c2 } = makeQ({ contact: null, project: null });
  const res2 = await ingestLead(q2, { tenant: 1, lead: parseLead('Name: Max Mustermann\nE-Mail: max@x.de'), actorId: null });
  ok('ohne Mandat: Kontakt ja, Partei nein', res2.contact_id === 55 && res2.project_id === null && !c2.inserts.some(c => /crm_deal_parties/.test(c.sql)));

  // Bestehender Kontakt → Update, kein zweiter Kontakt
  const { q: q3, calls: c3 } = makeQ({ contact: { id: 55 }, project: { id: 9, codename: 'Betongold' } });
  const res3 = await ingestLead(q3, { tenant: 1, lead: parseLead(DUB), actorId: null });
  ok('bestehender Kontakt wird aktualisiert', res3.created === false && !c3.inserts.some(c => /crm_contacts/.test(c.sql)));

  // findProjectByHint ohne Hinweis → null
  ok('leerer Hinweis → kein Projekt', (await findProjectByHint(q, '')) === null);

  console.log(fail ? `\n${fail} FEHLER` : '\nAlle Tests grün');
  process.exit(fail ? 1 : 0);
})();
