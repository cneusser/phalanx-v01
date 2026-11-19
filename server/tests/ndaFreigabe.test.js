// ─────────────────────────────────────────────────────────────────────────────
// Freigeben und Vereinbarung in einem Schritt (v0.480)
//
// Anlass, wörtlich: „Ich habe beim letzten den Fall, dass er FARADAY angefragt
// hat und jetzt nochmal hier ein separater Prozessschritt notwendig ist."
//
// So war es gebaut: Wer ein Mandat anfragt und sich dabei registriert, legt
// zwei Dinge an, ein Konto zum Freischalten und eine Anfrage zum Versenden.
// Zwei Knöpfe an zwei Stellen, und dazwischen wartet jemand.
//
// Die riskante Hälfte dieser Änderung ist nicht das Zusammenlegen. Sie ist,
// dass dabei etwas freigegeben wird, was schon unterschrieben oder
// zurückgewiesen war. Deshalb prüft diese Datei vor allem, was NICHT
// angefasst wird.
// ─────────────────────────────────────────────────────────────────────────────
// Der Versand der Hinweismail zieht das Mailmodul nach sich und das die
// Datenbank. Verbunden wird nie: Diese Pruefung reicht ihre eigene
// Datenbank-Attrappe herein. Die Angabe steht nur da, damit der Start der
// Anwendung nicht abbricht.
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgres://pruefung:pruefung@127.0.0.1:1/pruefung';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'x'.repeat(48);

const fs = require('fs');
const path = require('path');

let fail = 0;
const ok = (n, c) => { console.log((c ? '✓' : '✗ FEHLER') + ' ' + n); if (!c) fail++; };

const wurzel = path.join(__dirname, '..', '..');
const lies = (...p) => fs.readFileSync(path.join(wurzel, ...p), 'utf8');

// ── Eine kleine Welt statt einer Datenbank ─────────────────────────────────
function welt(anfragen) {
  const protokoll = [];
  const stufen = [];
  const db = {
    async all(sql, p) {
      if (/status = 'requested'/.test(sql)) {
        return anfragen.filter((a) => a.user_id === p[0] && a.status === 'requested')
          .map((a) => ({ id: a.id, project_id: a.project_id, codename: a.codename }));
      }
      return [];
    },
    async get(sql, p) {
      if (/FROM nda_requests WHERE id/.test(sql)) return anfragen.find((a) => a.id === p[0]) || null;
      if (/FROM users WHERE id/.test(sql)) return { email: 'k@example.org', first_name: 'Kim', last_name: 'Kurz' };
      return null;
    },
    async run(sql, p) {
      if (/SET status = 'sent'/.test(sql)) {
        const a = anfragen.find((x) => x.id === p[0]);
        if (a) { a.status = 'sent'; a.sent_at = 'jetzt'; }
      }
      return { changes: 1 };
    },
    auditLog(actor, action, typ, id, text) { protokoll.push({ action, id, text }); },
  };
  const setStage = async (u, p, stufe) => { stufen.push({ u, p, stufe }); };
  return { db, setStage, protokoll, stufen, anfragen };
}

const freigabe = require('../utils/ndaFreigabe');

(async () => {
  console.log('\n── Eine offene Anfrage wird freigegeben ──');
  {
    const w = welt([{ id: 1, user_id: 9, project_id: 7, codename: 'FARADAY', status: 'requested' }]);
    const r = await freigabe.alleFreigeben({ userId: 9, actorId: 3, ip: null, db: w.db, setStage: w.setStage });
    ok('sie steht danach auf versendet', w.anfragen[0].status === 'sent');
    ok('das Mandat wird genannt', r.freigegeben[0].codename === 'FARADAY');
    ok('die Stufe wandert auf nda_pending', w.stufen[0].stufe === 'nda_pending');
    ok('und es steht im Protokoll', w.protokoll.some((p) => p.action === 'NDA_SENT'));
  }

  console.log('\n── Was nicht angefasst werden darf ──');
  {
    const w = welt([
      { id: 1, user_id: 9, project_id: 7, codename: 'FARADAY', status: 'signed' },
      { id: 2, user_id: 9, project_id: 8, codename: 'LUMEN', status: 'approved' },
      { id: 3, user_id: 9, project_id: 9, codename: 'UMAMI', status: 'sent' },
      { id: 4, user_id: 9, project_id: 4, codename: 'CUDD', status: 'rejected' },
    ]);
    const r = await freigabe.alleFreigeben({ userId: 9, actorId: 3, ip: null, db: w.db, setStage: w.setStage });
    ok('eine unterzeichnete bleibt unterzeichnet', w.anfragen[0].status === 'signed');
    ok('eine freigegebene bleibt freigegeben', w.anfragen[1].status === 'approved');
    ok('eine versendete wird nicht erneut versendet', w.anfragen[2].status === 'sent');
    ok('eine zurückgewiesene bleibt zurückgewiesen', w.anfragen[3].status === 'rejected');
    ok('es wird nichts gemeldet, was nicht geschah', r.freigegeben.length === 0);
    ok('und keine Stufe verschoben', w.stufen.length === 0);
  }

  console.log('\n── Mehrere Mandate auf einmal ──');
  {
    const w = welt([
      { id: 1, user_id: 9, project_id: 7, codename: 'FARADAY', status: 'requested' },
      { id: 2, user_id: 9, project_id: 10, codename: 'LUMEN', status: 'requested' },
      { id: 3, user_id: 11, project_id: 7, codename: 'FARADAY', status: 'requested' },
    ]);
    const r = await freigabe.alleFreigeben({ userId: 9, actorId: 3, ip: null, db: w.db, setStage: w.setStage });
    ok('beide Mandate dieses Nutzers sind dabei', r.freigegeben.length === 2);
    ok('die eines anderen Nutzers nicht', w.anfragen[2].status === 'requested');
  }

  console.log('\n── Ohne offene Anfrage passiert nichts ──');
  {
    const w = welt([]);
    const r = await freigabe.alleFreigeben({ userId: 9, actorId: 3, ip: null, db: w.db, setStage: w.setStage });
    ok('leer bleibt leer', r.freigegeben.length === 0 && r.uebersprungen.length === 0);
  }

  console.log('\n── Es gibt die Regel nur einmal ──');
  {
    const ndas = lies('server', 'routes', 'ndas.js');
    const admin = lies('server', 'routes', 'admin.js');
    ok('die Mandatsroute ruft den gemeinsamen Vorgang', /eineFreigeben/.test(ndas));
    ok('und schreibt den Stand nicht mehr selbst',
      !/UPDATE nda_requests SET status='sent'/.test(ndas));
    ok('die Kontofreigabe ruft denselben Vorgang', /alleFreigeben/.test(admin));
    ok('sie tut es nur auf ausdruecklichen Wunsch', /req\.body\.nda_freigeben/.test(admin));
    ok('die Liste zeigt, was offen ist', /as nda_offen/.test(admin) && /nda_offen_mandate/.test(admin));

    const seite = lies('client', 'src', 'pages', 'Admin.jsx');
    ok('der zweite Knopf erscheint nur bei offener Anfrage', /u\.nda_offen > 0/.test(seite));
    ok('und nennt das Mandat', /Freigeben und NDA/.test(seite));
    ok('der gewoehnliche Knopf gibt nichts mit frei', /approveUser\(u\.id\)\}/.test(seite));
  }

  console.log('\n── Eine Mail, nicht zwei ──');
  {
    const admin = lies('server', 'routes', 'admin.js');
    ok('die Kontomail entfaellt, wenn eine Vereinbarung hinausgeht',
      /if \(!ndas \|\| !ndas\.freigegeben\.length\) \{\s*\n\s*sendAccountApprovedEmail/.test(admin));
  }

  console.log(fail ? `\n${fail} Fehler` : '\nAlles grün');
  process.exit(fail ? 1 : 0);
})();
