// Prüft den Phalanx-OS-Datenpool-Sync gegen eine gemockte Pool-API und einen
// In-Memory-Store (ohne echte Datenbank, ohne Netz). Deckt ab: Anreicherung über
// E-Mail, LinkedIn und eindeutigen Namen; Neuanlage mit buyer_type-Heuristik;
// keine Funnel-Einträge; mehrdeutiger Name auf die Warteliste; Idempotenz;
// UWG-Ausschluss (Adressen ohne Einwilligung landen nicht in email); Rückmeldung.
//
// Die Module ziehen beim Laden db/database (wie andere Tests auch). Eine Dummy-URL
// erlaubt das Laden; es entsteht keine Verbindung, da der Test ausschließlich reine
// und injizierte Funktionen aufruft.
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgres://u:p@localhost:5432/testdb';
const pool = require('../sync/phalanxpool');
const li = require('../utils/linkedinImport');
const newsletter = require('../utils/newsletter');

let fail = 0;
const ok = (n, c) => { console.log((c ? '✓' : '✗ FEHLER') + ' ' + n); if (!c) fail++; };

// ── In-Memory-Store (bietet bewusst KEINE Funnel-Methode) ────────────────────
function makeStore(seed) {
  const contacts = seed.map((c) => ({ ...c }));
  const reviews = [];
  const created = [];
  let nextId = 1000;
  return {
    contacts, reviews, created,
    async findByPoolId(pid) { return contacts.find((c) => String(c.pool_contact_id) === String(pid)) || null; },
    async findByEmail(e) { return contacts.find((c) => c.email && c.email.toLowerCase() === String(e).toLowerCase()) || null; },
    async findByLinkedin(u) { return contacts.find((c) => c.linkedin_url && c.linkedin_url.toLowerCase() === String(u).toLowerCase()) || null; },
    async findByNameKey(k) { return contacts.filter((c) => li.nameKey(c.first_name, c.last_name) === k); },
    async enrich(id, patch) { const c = contacts.find((x) => x.id === id); Object.assign(c, patch); },
    async create(fields) { const c = { id: nextId++, ...fields }; contacts.push(c); created.push(c); return c.id; },
    // wie der DB-Unique-Index (tenant_id, pool_contact_id): ON CONFLICT DO NOTHING
    async addReview(entry) { if (!reviews.find((r) => r.pool_contact_id === entry.pool_contact_id)) reviews.push(entry); },
  };
}
function makeClient(byTag) {
  return { async getContacts({ tag, offset }) { if (offset > 0) return []; return byTag[tag] || []; } };
}

// ── Ausgangsbestand (bestehende CRM-Kontakte) ────────────────────────────────
const seed = [
  { id: 1, first_name: 'Erika', last_name: 'Ertl', email: 'erika@firma.de', linkedin_url: null, tags_json: '[]' },
  { id: 2, first_name: 'Lena', last_name: 'Lin', email: null, linkedin_url: 'linkedin.com/in/lena-lin', tags_json: '[]' },
  { id: 3, first_name: 'Klaus', last_name: 'Klar', email: null, linkedin_url: null, tags_json: '[]' },
  { id: 4, first_name: 'Max', last_name: 'Muster', email: 'max1@a.de', linkedin_url: null, tags_json: '[]' },
  { id: 5, first_name: 'Max', last_name: 'Muster', email: 'max2@a.de', linkedin_url: null, tags_json: '[]' },
];

// ── Pool-Kontakte je Segment ─────────────────────────────────────────────────
const byTag = {
  'LI:Investor/Kapital': [
    { id: 'p-erika', first_name: 'Erika', last_name: 'Ertl', emails: ['erika@firma.de'], tags: ['LI:Prio-A', 'LI:Investor/Kapital'] }, // Treffer per E-Mail
    { id: 'p-neu-inv', first_name: 'Ingo', last_name: 'Invest', emails: [], emails_ohne_werbeeinwilligung: ['ingo@noads.de'], tags: ['LI:Prio-B', 'LI:Investor/Kapital'], fields: { 'LinkedIn-Profil': 'https://www.linkedin.com/in/ingo-invest/' } }, // Neuanlage, keine Einwilligung
  ],
  'LI:Unternehmer/GF': [
    { id: 'p-lena', first_name: 'Lena', last_name: 'Lin', fields: { 'LinkedIn-Profil': 'https://www.LinkedIn.com/in/Lena-Lin/' }, tags: ['LI:Unternehmer/GF'] }, // Treffer per LinkedIn
    { id: 'p-klaus', first_name: 'Klaus', last_name: 'Klar', emails: ['klaus@neu.de'], tags: ['LI:Prio-C', 'LI:Unternehmer/GF'] }, // Treffer per Name (eindeutig)
    { id: 'p-max', first_name: 'Max', last_name: 'Muster', tags: ['LI:Unternehmer/GF'] }, // mehrdeutig -> Warteliste
  ],
  'LI:Bank/Finanzierer': [
    { id: 'p-bank', first_name: 'Bea', last_name: 'Bank', emails: ['bea@bank.de'], positions: [{ title: 'Firmenkundenberaterin', company: 'Nordbank' }], tags: ['LI:Bank/Finanzierer'] }, // Neuanlage financial
  ],
  'LI:StB/WP/RA/Insolvenz': [
    { id: 'p-adv', first_name: 'Rolf', last_name: 'Recht', emails: ['rolf@kanzlei.de'], tags: ['LI:StB/WP/RA/Insolvenz'] }, // Neuanlage advisor_mandate
  ],
};
const TAGS = ['LI:Investor/Kapital', 'LI:Unternehmer/GF', 'LI:Bank/Finanzierer', 'LI:StB/WP/RA/Insolvenz'];

(async () => {
  // ── Heuristik-Einheitstests ────────────────────────────────────────────────
  ok('Heuristik: Investor/Kapital -> leer', pool.segmentBuyerType('LI:Investor/Kapital') === null);
  ok('Heuristik: Bank/Finanzierer -> financial', pool.segmentBuyerType('LI:Bank/Finanzierer') === 'financial');
  ok('Heuristik: StB/WP/RA -> advisor_mandate', pool.segmentBuyerType('LI:StB/WP/RA/Insolvenz') === 'advisor_mandate');
  ok('Heuristik: Unternehmer/GF -> leer', pool.segmentBuyerType('LI:Unternehmer/GF') === null);
  ok('Prio aus Tags gelesen', pool.prioFromTags(['LI:Prio-A', 'x']) === 'A');

  // ── Erster Lauf ────────────────────────────────────────────────────────────
  const store = makeStore(seed);
  const client = makeClient(byTag);
  const stats = await pool.runSync({ client, store, tags: TAGS, updatedSince: null });

  ok('Gelesen = 7 Pool-Kontakte', stats.read === 7);
  ok('Angereichert = 3 (E-Mail, LinkedIn, Name)', stats.enriched === 3);
  ok('Neu = 3 (Investor, Bank, Berater)', stats.created === 3);
  ok('Mehrdeutig = 1 (Warteliste)', stats.ambiguous === 1);
  ok('Keine Fehler', stats.errors === 0);

  // Anreicherung per E-Mail: pool_contact_id gesetzt, Prio-Tag ergänzt
  const erika = store.contacts.find((c) => c.id === 1);
  ok('E-Mail-Treffer: pool_contact_id gesetzt', erika.pool_contact_id === 'p-erika');
  ok('E-Mail-Treffer: prio:A ergänzt', JSON.parse(erika.tags_json).includes('prio:A'));
  // Anreicherung per LinkedIn
  const lena = store.contacts.find((c) => c.id === 2);
  ok('LinkedIn-Treffer: pool_contact_id gesetzt', lena.pool_contact_id === 'p-lena');
  // Anreicherung per eindeutigem Namen
  const klaus = store.contacts.find((c) => c.id === 3);
  ok('Name-Treffer: pool_contact_id gesetzt', klaus.pool_contact_id === 'p-klaus');

  // Neuanlage Investor ohne Einwilligung (UWG)
  const ingo = store.created.find((c) => c.pool_contact_id === 'p-neu-inv');
  ok('Neuanlage Investor: email bleibt leer (UWG)', ingo && !ingo.email);
  ok('Neuanlage Investor: Adresse in pool_email', ingo && ingo.pool_email === 'ingo@noads.de');
  ok('Neuanlage Investor: consent_status unknown', ingo && ingo.consent_status === 'unknown');
  ok('Neuanlage Investor: buyer_type leer (generisch)', ingo && (ingo.buyer_type === null || ingo.buyer_type === undefined));
  ok('Neuanlage: relationship LinkedIn-Kontakt', ingo && ingo.relationship === 'LinkedIn-Kontakt');
  ok('Neuanlage: source phalanx-pool', ingo && ingo.source === 'phalanx-pool');
  ok('Neuanlage: kein Funnel-Feld gesetzt', ingo && ingo.funnel_stage === undefined && ingo.deal_id === undefined);

  // Neuanlage Bank -> financial, Berater -> advisor_mandate
  const bea = store.created.find((c) => c.pool_contact_id === 'p-bank');
  ok('Neuanlage Bank: buyer_type financial', bea && bea.buyer_type === 'financial');
  ok('Neuanlage Bank: consented email gesetzt', bea && bea.email === 'bea@bank.de');
  const rolf = store.created.find((c) => c.pool_contact_id === 'p-adv');
  ok('Neuanlage Berater: buyer_type advisor_mandate', rolf && rolf.buyer_type === 'advisor_mandate');

  // Mehrdeutiger Name -> Warteliste, KEINE Neuanlage
  ok('Warteliste: ein Eintrag', store.reviews.length === 1);
  ok('Warteliste: richtiger Pool-Kontakt', store.reviews[0].pool_contact_id === 'p-max');
  ok('Mehrdeutig: kein neuer Max Muster angelegt', !store.created.find((c) => c.pool_contact_id === 'p-max'));

  // ── Zweiter Lauf: Idempotenz ───────────────────────────────────────────────
  const beforeLen = store.contacts.length;
  const createdBefore = store.created.length;
  const stats2 = await pool.runSync({ client, store, tags: TAGS, updatedSince: null });
  ok('Idempotenz: keine neuen Kontakte im 2. Lauf', store.contacts.length === beforeLen && store.created.length === createdBefore);
  ok('Idempotenz: 2. Lauf legt keine weitere Warteliste an', store.reviews.length === 1);
  ok('Idempotenz: 2. Lauf erkennt alle per pool_contact_id', stats2.enriched >= 6);

  // ── UWG: Massenversände schließen fehlende Einwilligung aus ────────────────
  const consented = newsletter.recipientWhere('consented');
  const reconsent = newsletter.recipientWhere('reconsent');
  ok('UWG: consented verlangt opt_in', /consent_status\s*=\s*'opt_in'/.test(consented));
  ok('UWG: reconsent verlangt email IS NOT NULL (leere email ausgeschlossen)', /email IS NOT NULL/i.test(reconsent));
  ok('UWG: reconsent schließt opt_out aus', /opt_out/.test(reconsent));

  // ── Rückmeldung (A3) ───────────────────────────────────────────────────────
  const body = pool.buildWritebackBody({ id: 42, first_name: 'Test', last_name: 'Person', email: 't@p.de', responsibility: 'GF' }, { email: 'u@p.de' }, { id: 7, name: 'Muster GmbH' });
  ok('Rückmeldung: source_id = crm-42', body.source_id === 'crm-42');
  ok('Rückmeldung: Firma mit source_id', body.company && body.company.source_id === 'crmco-7' && body.company.name === 'Muster GmbH');
  ok('Rückmeldung: E-Mail übernommen', body.email === 't@p.de');

  console.log(fail ? `\n${fail} Test(s) fehlgeschlagen` : '\nAlle Phalanx-Pool-Tests grün');
  process.exit(fail ? 1 : 0);
})();
