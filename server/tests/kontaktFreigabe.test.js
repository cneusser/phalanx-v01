// ─────────────────────────────────────────────────────────────────────────────
// Kontaktdaten erst nach Freigabe, frühestens nach beidseitiger Unterschrift
// (v0.468)
//
// Die Regel, die hier festgehalten wird, stammt wörtlich aus dem Auftrag:
// „ein Kontakt wird erst offengelegt, wenn wir das freigegeben haben, also
// frühestens mit Unterschrift NDA von allen Seiten."
//
// Zwei Fehler wären möglich, und beide wären teuer:
//
//   · zu früh offenlegen. Dann steht die Adresse des Verkäufers bei einem
//     Interessenten, der nichts unterschrieben hat.
//   · zu viel sperren. Dann sehen sich auch zwei Investoren nicht mehr, die
//     sich im Netzwerk verbunden haben und nichts miteinander zu tun haben,
//     was ein Mandat anginge.
//
// Deshalb prüft diese Datei beide Richtungen.
//
// Die Datenbank wird untergeschoben, nicht gestartet. Geprüft wird die Regel,
// nicht Postgres.
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');

let fail = 0;
const ok = (n, c) => { console.log((c ? '✓' : '✗ FEHLER') + ' ' + n); if (!c) fail++; };

// ── Datenbank-Attrappe ───────────────────────────────────────────────────────
// Eine kleine, erklärbare Welt: Mandat 1 gehört Verkäufer 10, Interessent 20
// hat angefragt. Nutzer 30 ist niemandes Gegenpartei.
const welt = {
  projekt: { id: 1, status: 'active', mandate_type: 'ma', created_by: 10, codename: 'FARADAY' },
  nda: null,              // null | { status }
  freigaben: [],          // [{ project_id, a_user_id, b_user_id, widerrufen_am }]
  gegenparteien: [[10, 20]],
  protokoll: [],
};

const dbPfad = require.resolve('../db/database');
require.cache[dbPfad] = {
  id: dbPfad, filename: dbPfad, loaded: true, exports: {
    async get(sql, p) {
      if (/FROM projects WHERE id/.test(sql)) return welt.projekt;
      if (/FROM nda_requests/.test(sql)) return welt.nda;
      if (/FROM kontakt_freigaben/.test(sql)) {
        const [pid, a, b] = p;
        return welt.freigaben.find((f) => f.project_id === pid && f.a_user_id === a
          && f.b_user_id === b && (!/widerrufen_am IS NULL/.test(sql) || !f.widerrufen_am)) || null;
      }
      return null;
    },
    async all(sql, p) {
      if (/FROM projects p/.test(sql)) {
        const [a, , b] = p;
        const treffer = welt.gegenparteien.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
        return treffer ? [{ id: welt.projekt.id }] : [];
      }
      return [];
    },
    async run() { return { changes: 1 }; },
    async insert(sql, p) { welt.freigaben.push({ project_id: p[0], a_user_id: p[1], b_user_id: p[2], widerrufen_am: null }); return 1; },
    auditLog(actor, action, typ, id, text) { welt.protokoll.push({ actor, action, typ, id, text }); },
  },
};

const kf = require('../utils/kontaktFreigabe');

// ── 1. Das Paar ──────────────────────────────────────────────────────────────
console.log('\n── Ein Paar, eine Zeile ──');
ok('die kleinere Nutzer-Id steht vorn', JSON.stringify(kf.paar(20, 10)) === '[10,20]');
ok('und zwar in beiden Aufrufrichtungen', JSON.stringify(kf.paar(10, 20)) === JSON.stringify(kf.paar(20, 10)));

// ── 2. Die Voraussetzungen ───────────────────────────────────────────────────
(async () => {
  console.log('\n── Wann darf überhaupt freigegeben werden ──');
  welt.nda = null;
  let v = await kf.voraussetzungen(1, 20);
  ok('ohne Vereinbarung nicht', !v.erfuellt);
  ok('und die Meldung sagt, dass keine vorliegt', /keine Vertraulichkeitsvereinbarung/.test(v.fehlend.join(' ')));

  welt.nda = { status: 'sent' };
  v = await kf.voraussetzungen(1, 20);
  ok('versendet, aber nicht unterschrieben: nein', !v.erfuellt);

  welt.nda = { status: 'signed' };
  v = await kf.voraussetzungen(1, 20);
  ok('einseitig unterschrieben reicht nicht', !v.erfuellt);
  ok('und es steht da, dass die Gegenzeichnung fehlt', /Gegenzeichnung/.test(v.fehlend.join(' ')));

  welt.nda = { status: 'approved' };
  v = await kf.voraussetzungen(1, 20);
  ok('von allen Seiten unterschrieben: ja', v.erfuellt);

  welt.projekt.status = 'in_review';
  v = await kf.voraussetzungen(1, 20);
  ok('ein nicht freigeschaltetes Mandat genügt nicht', !v.erfuellt);
  welt.projekt.status = 'active';

  welt.nda = null;
  welt.projekt.mandate_type = 'fundraising';
  v = await kf.voraussetzungen(1, 20);
  ok('bei Startup-Finanzierungen ersetzt die Freigabe die Unterschrift', v.erfuellt);
  welt.projekt.mandate_type = 'ma';

  // ── 3. Die Sicht ───────────────────────────────────────────────────────────
  console.log('\n── Wer sieht was ──');
  welt.nda = { status: 'approved' };
  welt.freigaben = [];
  const verkaeufer = { id: 10, role: 'seller' };
  const interessent = { id: 20, role: 'buyer' };
  const fremder = { id: 30, role: 'buyer' };

  ok('Gegenpartei ohne Freigabe sieht nichts', !(await kf.darfSehen(verkaeufer, 20)).frei);
  ok('und auch nicht in der Gegenrichtung', !(await kf.darfSehen(interessent, 10)).frei);
  ok('wer keine Gegenpartei ist, bleibt unberührt', (await kf.darfSehen(verkaeufer, 30)).frei);
  ok('die eigenen Daten sieht man immer', (await kf.darfSehen(verkaeufer, 10)).frei);
  ok('die Verwaltung sieht alles', (await kf.darfSehen({ id: 99, role: 'super_admin' }, 20)).frei);
  ok('ein Fremder ist kein Sonderfall', (await kf.darfSehen(fremder, 10)).frei);

  const r = await kf.freigeben({ projectId: 1, interessentId: 20, gegenseiteId: 10, actorId: 99 });
  ok('die Freigabe gelingt, wenn alles vorliegt', r.ok === true);
  ok('danach sieht die Gegenpartei die Daten', (await kf.darfSehen(verkaeufer, 20)).frei);
  ok('die Freigabe steht im Protokoll', welt.protokoll.some((p) => p.action === 'KONTAKT_FREIGEGEBEN'));

  welt.nda = { status: 'signed' };
  const r2 = await kf.freigeben({ projectId: 1, interessentId: 21, gegenseiteId: 10, actorId: 99 });
  ok('ohne Gegenzeichnung wird nicht freigegeben', r2.ok === false);
  ok('und es wird gesagt, woran es liegt', (r2.fehlend || []).length > 0);

  // ── 4. Die Oberfläche fragt wirklich nach ──────────────────────────────────
  console.log('\n── Die Routen fragen die Regel ──');
  const wurzel = path.join(__dirname, '..', '..');
  const lies = (...p) => fs.readFileSync(path.join(wurzel, ...p), 'utf8');
  const nachrichten = lies('server', 'routes', 'messages.js');
  const verwaltung = lies('server', 'routes', 'admin.js');

  ok('die Adresse haengt nicht mehr allein an der angenommenen Anfrage',
    !/email: accepted \? c\.adr_email : null/.test(nachrichten));
  ok('die Kontaktliste fragt die Regel', /kontaktFreigabe\.darfSehen/.test(nachrichten));
  ok('es gibt eine Liste der Freigaben je Mandat', /kontakt-freigaben'/.test(verwaltung));
  ok('es gibt das Widerrufen', /router\.delete\('\/projects\/:projectId\/kontakt-freigaben/.test(verwaltung));
  ok('die Ablehnung nennt den Grund', /dürfen noch nicht offengelegt werden/.test(verwaltung));

  const migration = lies('server', 'db', 'migrations', '20260901002070_kontakt_freigabe.js');
  ok('die Tabelle wird angelegt', /createTable\('kontakt_freigaben'/.test(migration));
  ok('mit Mandantentrennung', /FORCE ROW LEVEL SECURITY/.test(migration));
  ok('eine Freigabe je Mandat und Paar', /unique\(\['project_id', 'a_user_id', 'b_user_id'\]\)/.test(migration));
  ok('der Widerruf loescht nichts', /widerrufen_am = now\(\)/.test(lies('server', 'utils', 'kontaktFreigabe.js')));

  console.log(fail ? `\n${fail} Fehler` : '\nAlles grün');
  process.exit(fail ? 1 : 0);
})();
