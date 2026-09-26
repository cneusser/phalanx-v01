// ─────────────────────────────────────────────────────────────────────────────
// Rundmail an registrierte Konten (v0.409).
//
// Geprüft wird das, was teuer wäre: dass niemand ohne bestätigtes und
// freigeschaltetes Konto angeschrieben wird, dass Widerspruch und Sperrliste
// greifen, und dass zwei gleichzeitige Läufe keine Mail doppelt verschicken.
// ─────────────────────────────────────────────────────────────────────────────
const rm = require('../utils/rundmail');

let fail = 0;
const ok = (n, c) => { console.log((c ? '✓' : '✗ FEHLER') + ' ' + n); if (!c) fail++; };
const gleich = (n, a, b) => ok(n + (a === b ? '' : `  (war: ${JSON.stringify(a)}, erwartet: ${JSON.stringify(b)})`), a === b);

// ── Text ────────────────────────────────────────────────────────────────────
gleich('Anrede formell mit Herr', rm.anrede({ salutation: 'Herr', last_name: 'Helm' }), 'Sehr geehrter Herr Helm');
gleich('Anrede formell mit Frau', rm.anrede({ salutation: 'Frau', title: 'Dr.', last_name: 'Berg' }), 'Sehr geehrte Frau Dr. Berg');
gleich('ohne Anrede der volle Name', rm.anrede({ first_name: 'Anna', last_name: 'Berg' }), 'Guten Tag Anna Berg');

gleich('Platzhalter wird ersetzt', rm.fuelle('{{anrede}},\n\nText', { anrede: 'Guten Tag' }), 'Guten Tag,\n\nText');
ok('unbekannte Platzhalter verschwinden', !rm.fuelle('{{unbekannt}} Rest', {}).includes('{{'));

const html = rm.alsHtml('Erster Absatz.\n\nZweiter Absatz.\nMit Umbruch.');
gleich('zwei Absaetze', (html.match(/<p>/g) || []).length, 2);
ok('einfacher Umbruch bleibt im Absatz', html.includes('<br/>'));
ok('spitze Klammern werden entschaerft', rm.alsHtml('<script>x</script>').includes('&lt;script&gt;'));

ok('die Vorlage nennt den Anlass', /Feedback/.test(rm.STANDARD_TEXT));
ok('die Vorlage lädt zum Marktplatz ein', /Marktplatz/.test(rm.STANDARD_TEXT));
ok('die Vorlage bietet ein Gespräch an', /Gespräch/.test(rm.STANDARD_TEXT));
ok('die Vorlage hat eine Anrede', rm.STANDARD_TEXT.startsWith('{{anrede}}'));

// ── Empfängerauswahl ────────────────────────────────────────────────────────
// Eine Ablage im Speicher, die sich wie die Datenbank verhält, aber ohne
// Postgres auskommt.
function fakeDb(nutzer, sperren = [], optOut = []) {
  return {
    async all(sql) {
      if (/information_schema/.test(sql)) {
        return [{ column_name: 'email_verified' }, { column_name: 'anonymized_at' }];
      }
      if (/FROM users/.test(sql)) {
        return nutzer.filter((u) => u.is_active === 1 && u.is_approved === 1
          && u.email && u.email_verified === 1 && !u.anonymized_at);
      }
      if (/crm_contacts/.test(sql)) return optOut.map((e) => ({ email: e }));
      if (/pflege_sperren/.test(sql)) return sperren.map((e) => ({ email: e }));
      return [];
    },
    async get() { return null; },
    async run() { return 1; },
    async insert() { return 1; },
  };
}

const basis = { is_active: 1, is_approved: 1, email_verified: 1, anonymized_at: null, role: 'buyer' };
const nutzer = [
  { id: 1, email: 'ja@example.de', last_name: 'Ja', salutation: 'Herr', ...basis },
  { id: 2, email: 'nicht-frei@example.de', last_name: 'Wartet', ...basis, is_approved: 0 },
  { id: 3, email: 'nicht-bestaetigt@example.de', last_name: 'Unbest', ...basis, email_verified: 0 },
  { id: 4, email: 'inaktiv@example.de', last_name: 'Weg', ...basis, is_active: 0 },
  { id: 5, email: 'widerspruch@example.de', last_name: 'Nein', ...basis },
  { id: 6, email: 'gesperrt@example.de', last_name: 'Bounce', ...basis },
  { id: 7, email: 'geloescht@example.de', last_name: 'Anon', ...basis, anonymized_at: '2026-01-01' },
];

(async () => {
  const r = await rm.empfaenger(fakeDb(nutzer, ['gesperrt@example.de'], ['widerspruch@example.de']), {});
  const adressen = r.zeilen.map((z) => z.email);
  gleich('genau ein Empfaenger bleibt uebrig', adressen.length, 1);
  gleich('und zwar der richtige', adressen[0], 'ja@example.de');
  ok('nicht freigeschaltet wird nicht angeschrieben', !adressen.includes('nicht-frei@example.de'));
  ok('unbestaetigte Adresse wird nicht angeschrieben', !adressen.includes('nicht-bestaetigt@example.de'));
  ok('inaktives Konto wird nicht angeschrieben', !adressen.includes('inaktiv@example.de'));
  ok('Widerspruch im CRM wird beachtet', !adressen.includes('widerspruch@example.de'));
  ok('die Sperrliste wird beachtet', !adressen.includes('gesperrt@example.de'));
  ok('geloeschte Konten werden nicht angeschrieben', !adressen.includes('geloescht@example.de'));
  gleich('zwei Ausschluesse werden gemeldet', r.ausgeschlossen.length, 2);
  gleich('die Anrede steht schon bereit', r.zeilen[0].anrede, 'Sehr geehrter Herr Ja');

  // ── Kein Doppelversand ────────────────────────────────────────────────────
  function versandDb() {
    const zeilen = [
      { id: 1, rundmail_id: 1, user_id: 1, email: 'a@x.de', status: 'offen', belegt_am: null },
      { id: 2, rundmail_id: 1, user_id: 2, email: 'b@x.de', status: 'offen', belegt_am: null },
    ];
    let sperre = null;
    return {
      async get(sql) {
        if (/FROM rundmails WHERE id/.test(sql)) {
          return { id: 1, status: 'laeuft', ration: 10, pause_sekunden: 0, fenster_von: '00:00', fenster_bis: '23:59', titel: 'T', betreff: 'B', text: '{{anrede}}' };
        }
        if (/lauf_kennung FROM rundmails/.test(sql)) return { lauf_kennung: sperre };
        if (/FROM users WHERE id/.test(sql)) return { last_name: 'X' };
        return null;
      },
      async all(sql) {
        if (/FROM rundmail_empfaenger/.test(sql)) return zeilen.filter((z) => z.status === 'offen').map((z) => ({ ...z }));
        return [];
      },
      async run(sql, p = []) {
        if (/UPDATE rundmails SET lauf_seit = now\(\)/.test(sql)) {
          if (sperre) return 0;
          sperre = p[0]; return 1;
        }
        if (/UPDATE rundmails SET lauf_seit = NULL/.test(sql)) { if (sperre === p[1]) sperre = null; return 1; }
        if (/SET belegt_am = now\(\)/.test(sql)) {
          const z = zeilen.find((x) => x.id === p[0]);
          if (!z || z.status !== 'offen') return 0;
          z.status = 'belegt'; z.belegt_am = 'jetzt'; return 1;
        }
        if (/status = 'versendet'/.test(sql)) {
          const z = zeilen.find((x) => x.id === p[0]); if (z) z.status = 'versendet'; return 1;
        }
        return 1;
      },
      async insert() { return 1; },
    };
  }

  let gesendet = 0;
  const senden = async () => { gesendet += 1; };
  const q = versandDb();
  const [a, b] = await Promise.all([
    rm.versendeRation(q, { rundmailId: 1, appUrl: 'https://x', senden }),
    rm.versendeRation(q, { rundmailId: 1, appUrl: 'https://x', senden }),
  ]);
  const zusammen = (a.versendet || 0) + (b.versendet || 0);
  ok(`zwei gleichzeitige Laeufe senden hoechstens zwei Mails (${zusammen})`, zusammen <= 2);
  ok('einer der beiden Laeufe wird abgewiesen', !!(a.uebersprungen || b.uebersprungen));
  gleich('jede Mail ging genau einmal hinaus', gesendet, zusammen);

  const c = await rm.versendeRation(q, { rundmailId: 1, appUrl: 'https://x', senden });
  gleich('danach ist nichts mehr offen', c.versendet || 0, 0);

  // Ein Entwurf verschickt nichts.
  const entwurf = {
    ...versandDb(),
    async get(sql) {
      if (/FROM rundmails WHERE id/.test(sql)) return { id: 1, status: 'entwurf' };
      return null;
    },
  };
  const d = await rm.versendeRation(entwurf, { rundmailId: 1, appUrl: 'https://x', senden });
  ok('ein Entwurf verschickt nichts', !!d.uebersprungen);

  console.log(fail ? `\n${fail} Fehler` : '\nAlle Prüfungen bestanden');
  process.exit(fail ? 1 : 0);
})();
