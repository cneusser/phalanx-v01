// Stammdaten auftrennen und Aktualisierungsmailing (v0.405).
//
// Geprüft werden die Stellen, an denen ein Fehler teuer wäre: die Umsetzung der
// Bestandsdaten, die Abhängigkeit zwischen Sektor und Schwerpunkt, der Einmal-
// Token und der Schutz vor Doppelversand.
const vok = require('../utils/vokabular');
const voll = require('../utils/vollstaendigkeit');
const mail = require('../utils/pflegeMailing');
const migration = require('../db/migrations/20260901001290_firmenart_auftrennen');

let fail = 0;
const ok = (n, c) => { console.log((c ? '✓' : '✗ FEHLER') + ' ' + n); if (!c) fail++; };
const gleich = (n, a, b) => ok(n + (a === b ? '' : `  (war: ${JSON.stringify(a)}, erwartet: ${JSON.stringify(b)})`), a === b);

// ── Sektoren wortgleich zu Phalanx OS ───────────────────────────────────────
const ERWARTET = ['Industrie und verarbeitendes Gewerbe', 'Bau und Handwerk', 'Handel', 'Dienstleistungen',
  'Finanz- und Beteiligungswirtschaft', 'Informationstechnik und Software', 'Gesundheit und Soziales', 'Sonstige'];
gleich('acht Sektoren', vok.SEKTOREN.length, 8);
for (const s of ERWARTET) ok(`Sektor wortgleich: ${s}`, vok.SEKTOREN.includes(s));

// ── Schwerpunkt hängt am Sektor ─────────────────────────────────────────────
gleich('Finanzwirtschaft hat acht Schwerpunkte', vok.schwerpunkteZu('Finanz- und Beteiligungswirtschaft').length, 8);
ok('Venture Capital steht neben Private Equity', vok.schwerpunkteZu('Finanz- und Beteiligungswirtschaft').includes('Venture Capital'));
ok('Venture Capital gilt nur in der Finanzwirtschaft', !vok.schwerpunktPasst('Handel', 'Venture Capital'));
ok('Venture Capital passt zur Finanzwirtschaft', vok.schwerpunktPasst('Finanz- und Beteiligungswirtschaft', 'Venture Capital'));
gleich('Dienstleistungen haben neun', vok.schwerpunkteZu('Dienstleistungen').length, 9);
gleich('Industrie hat sieben', vok.schwerpunkteZu('Industrie und verarbeitendes Gewerbe').length, 7);
gleich('Handel hat bewusst keine', vok.schwerpunkteZu('Handel').length, 0);
ok('Interim Management steht bei den Dienstleistungen', vok.schwerpunkteZu('Dienstleistungen').includes('Interim Management'));

ok('passender Schwerpunkt wird angenommen', vok.schwerpunktPasst('Finanz- und Beteiligungswirtschaft', 'Private Equity'));
ok('unpassender Schwerpunkt wird abgelehnt', !vok.schwerpunktPasst('Handel', 'Private Equity'));
ok('Schwerpunkt aus dem falschen Sektor wird abgelehnt', !vok.schwerpunktPasst('Dienstleistungen', 'Maschinen- und Anlagenbau'));
ok('leerer Schwerpunkt ist immer zulässig', vok.schwerpunktPasst('Handel', ''));
ok('Schwerpunkt ohne Sektor wird abgelehnt', !vok.schwerpunktPasst('', 'Private Equity'));

// ── Rollen sind mehrfach vergebbar und werden bereinigt ─────────────────────
gleich('sechs Rollen', vok.TRANSAKTIONSROLLEN.length, 6);
ok('Stratege ist eine Rolle, kein Sektor', vok.istRolle('Stratege') && !vok.istSektor('Stratege'));
const r = vok.rollenBereinigen(['Stratege', 'Käufer', 'Stratege', 'Unfug', '']);
gleich('Doppelungen und Unbekanntes fallen weg', r.join('|'), 'Stratege|Käufer');

// ── Migration der Bestandsdaten, Regel für Regel ────────────────────────────
const regelFuer = (alt) => migration.REGELN.find((x) => x.alt === migration.normal(alt));
const pruefeRegel = (alt, sektor, schwerpunkt, rollen) => {
  const g = regelFuer(alt);
  ok(`Regel vorhanden: ${alt}`, !!g);
  if (!g) return;
  gleich(`  ${alt} → Sektor`, g.sektor, sektor);
  gleich(`  ${alt} → Schwerpunkt`, g.schwerpunkt, schwerpunkt);
  gleich(`  ${alt} → Rollen`, g.rollen.join('|'), (rollen || []).join('|'));
};
pruefeRegel('Stratege', 'Industrie und verarbeitendes Gewerbe', null, ['Stratege']);
pruefeRegel('Private Equity', 'Finanz- und Beteiligungswirtschaft', 'Private Equity', []);
pruefeRegel('Family Office', 'Finanz- und Beteiligungswirtschaft', 'Family Office', []);
pruefeRegel('Bank/Finanzierer', 'Finanz- und Beteiligungswirtschaft', 'Bank und Finanzierung', []);
pruefeRegel('Berater', 'Dienstleistungen', 'Unternehmensberatung', ['Berater']);
pruefeRegel('MBI/MBO-Kandidat', null, null, ['MBI/MBO-Kandidat']);
pruefeRegel('Zielunternehmen', null, null, ['Zielunternehmen']);
pruefeRegel('k. A.', null, null, []);
pruefeRegel('Sonstige', null, null, []);

ok('Schreibweise mit Leerzeichen um den Schrägstrich wird erkannt', !!regelFuer('Bank / Finanzierer'));
ok('Großschreibung spielt keine Rolle', !!regelFuer('STRATEGE'));
ok('jede Regel erzeugt einen gültigen Sektor oder gar keinen',
  migration.REGELN.every((x) => x.sektor === null || vok.istSektor(x.sektor)));
ok('jede Regel erzeugt einen passenden Schwerpunkt',
  migration.REGELN.every((x) => vok.schwerpunktPasst(x.sektor, x.schwerpunkt)));
ok('jede Regel erzeugt gültige Rollen',
  migration.REGELN.every((x) => x.rollen.every(vok.istRolle)));
ok('ein unbekannter Wert hat keine Regel und bleibt damit leer', !regelFuer('Irgendwas Neues'));

// ── Vollständigkeit ─────────────────────────────────────────────────────────
const leer = voll.pruefe({}, []);
gleich('leere Firma: alle elf Felder fehlen', leer.fehlend.length, 11);
ok('zurück kommen Namen, keine Prozentzahl', leer.labels.includes('Sektor') && leer.labels.includes('Ort'));

const halb = voll.pruefe(
  { name: 'Muster GmbH', sektor: 'Handel', region: 'Bayern', employees: 42, street: 'Weg 1', postal_code: '91056', city: 'Erlangen', country: 'Deutschland' },
  [{ last_name: 'Berg', email: 'berg@muster.de', responsibility: '' }]);
gleich('nur die Rolle der Ansprechperson fehlt', halb.fehlend.join('|'), 'ansprechperson_rolle');
ok('damit nicht vollständig', !halb.vollstaendig);

const ganz = voll.pruefe(
  { name: 'Muster GmbH', sektor: 'Handel', region: 'Bayern', employees: 42, street: 'Weg 1', postal_code: '91056', city: 'Erlangen', country: 'Deutschland' },
  [{ last_name: 'Berg', email: 'berg@muster.de', responsibility: 'Geschäftsführung' }]);
ok('vollständige Firma wird als vollständig erkannt', ganz.vollstaendig);

ok('Mitarbeiterzahl null gilt als fehlend', voll.fehlt(0, 'employees'));
ok('Mitarbeiterzahl als Text gilt als fehlend', voll.fehlt('keine Angabe', 'employees'));
ok('Leerzeichen gelten als fehlend', voll.fehlt('   ', 'city'));

gleich('Aufzählung im Satz', voll.alsSatz(['Sektor', 'Ort', 'Land']), 'Sektor, Ort und Land');
gleich('ein einzelnes Feld ohne und', voll.alsSatz(['Sektor']), 'Sektor');
gleich('nichts fehlt, nichts steht da', voll.alsSatz([]), '');

ok('der Firmenname ist nicht selbst pflegbar', !voll.selbstPflegbar(['name', 'sektor']).includes('name'));
ok('der Sektor schon', voll.selbstPflegbar(['name', 'sektor']).includes('sektor'));

// ── Token ───────────────────────────────────────────────────────────────────
const t1 = mail.neuerToken(); const t2 = mail.neuerToken();
ok('zwei Token sind verschieden', t1 !== t2);
ok('Token ist lang genug', t1.length >= 30);
ok('Token enthält keine Zeichen, die eine URL zerlegen', !/[/+=?&#]/.test(t1));
gleich('derselbe Token ergibt denselben Hash', mail.tokenHash(t1), mail.tokenHash(t1));
ok('verschiedene Token ergeben verschiedene Hashes', mail.tokenHash(t1) !== mail.tokenHash(t2));
ok('der Hash gibt den Token nicht preis', !mail.tokenHash(t1).includes(t1));

// ── Versandfenster ──────────────────────────────────────────────────────────
const um = (h, m = 0) => { const d = new Date('2026-09-24T00:00:00'); d.setHours(h, m, 0, 0); return d; };
ok('mitten im Fenster wird gesendet', mail.imFenster('08:00', '18:00', um(12)));
ok('vor dem Fenster nicht', !mail.imFenster('08:00', '18:00', um(7, 59)));
ok('nach dem Fenster nicht', !mail.imFenster('08:00', '18:00', um(18)));
ok('genau zum Start schon', mail.imFenster('08:00', '18:00', um(8)));
ok('unbrauchbare Angabe sperrt nicht', mail.imFenster('', '', um(3)));

// ── Anrede und Platzhalter ──────────────────────────────────────────────────
gleich('Anrede mit Herr', mail.anrede({ salutation: 'Herr', last_name: 'Helm' }), 'Sehr geehrter Herr Helm');
gleich('Anrede mit Frau', mail.anrede({ salutation: 'Frau', last_name: 'Berg' }), 'Sehr geehrte Frau Berg');
gleich('ohne Anrede der volle Name', mail.anrede({ first_name: 'Anna', last_name: 'Berg' }), 'Guten Tag Anna Berg');
gleich('ohne alles ein neutraler Gruß', mail.anrede({}), 'Guten Tag');

const text = mail.fuelle(mail.STANDARD_TEXT, {
  anrede: 'Sehr geehrter Herr Helm', firma: 'Kernwerk Gruppe',
  fehlende_felder: 'Sektor, Ort und Land', link: 'https://x/stammdaten/abc',
});
ok('kein Platzhalter bleibt stehen', !/\{\{\w+\}\}/.test(text));
ok('die fehlenden Felder stehen im Text', text.includes('Sektor, Ort und Land'));
ok('der Link steht im Text', text.includes('https://x/stammdaten/abc'));
ok('der Betreff ist der abgestimmte', mail.STANDARD_BETREFF === 'Kurz zu Ihren Angaben bei CapitalMatch');
ok('die Erinnerung nutzt denselben Link', mail.fuelle(mail.STANDARD_ERINNERUNG, { link: 'L' }).includes('L'));

// ── Doppelversand: die Belegung muss atomar greifen ─────────────────────────
// Ein kleiner Ersatz für die Datenbank, der mitzählt, wie oft eine Zeile
// tatsächlich belegt werden konnte. Zwei Läufe nebeneinander dürfen zusammen
// nicht mehr Mails erzeugen als es Einladungen gibt.
function fakeDb() {
  const einladungen = [
    { id: 1, kampagne_id: 1, company_id: 1, contact_id: 1, email: 'a@b.de', status: 'offen', belegt_am: null, fehlend_json: '[]' },
    { id: 2, kampagne_id: 1, company_id: 1, contact_id: 2, email: 'c@d.de', status: 'offen', belegt_am: null, fehlend_json: '[]' },
  ];
  let sperre = null;
  return {
    einladungen,
    get: async (sql, p) => {
      if (/FROM pflege_kampagnen/.test(sql) && /lauf_kennung/.test(sql)) return { lauf_kennung: sperre };
      if (/FROM pflege_kampagnen/.test(sql)) {
        return { id: 1, status: 'laeuft', ration: 10, pause_sekunden: 0, fenster_von: '00:00', fenster_bis: '23:59', erinnerung_nach_tagen: 7, betreff: 'x', text: 'y' };
      }
      if (/FROM crm_companies/.test(sql)) return { name: 'Muster GmbH' };
      if (/FROM crm_contacts/.test(sql)) return { first_name: 'A', last_name: 'B', salutation: 'Herr' };
      return null;
    },
    all: async (sql) => (/FROM pflege_einladungen/.test(sql) ? einladungen.filter((e) => e.status === 'offen') : []),
    run: async (sql, p) => {
      if (/UPDATE pflege_kampagnen SET lauf_seit = now\(\)/.test(sql)) {
        if (sperre) return 0;
        sperre = p[0]; return 1;
      }
      if (/UPDATE pflege_kampagnen SET lauf_seit = NULL/.test(sql)) { if (sperre === p[1]) sperre = null; return 1; }
      if (/UPDATE pflege_einladungen SET belegt_am/.test(sql)) {
        const e = einladungen.find((x) => x.id === p[0]);
        if (!e || e.belegt_am) return 0;
        e.belegt_am = new Date(); e.status = 'belegt'; return 1;
      }
      if (/UPDATE pflege_einladungen SET status = 'versendet'/.test(sql)) {
        const e = einladungen.find((x) => x.id === p[0]); if (e) e.status = 'versendet'; return 1;
      }
      if (/UPDATE pflege_einladungen SET token_hash/.test(sql)) return 1;
      return 1;
    },
    insert: async () => 1,
  };
}

(async () => {
  // Versand ohne echten Mailversand: die Sendefunktion wird eingesetzt.
  let gesendet = 0;
  const senden = async () => { gesendet += 1; };

  const q = fakeDb();
  const [a, b] = await Promise.all([
    mail.versendeRation(q, { kampagneId: 1, appUrl: 'https://x', senden }),
    mail.versendeRation(q, { kampagneId: 1, appUrl: 'https://x', senden }),
  ]);
  const zusammen = (a.versendet || 0) + (b.versendet || 0);
  ok(`zwei gleichzeitige Läufe senden nicht mehr als es Einladungen gibt (${zusammen} von 2)`, zusammen <= 2);
  ok('einer der beiden Läufe wird abgewiesen', !!(a.uebersprungen || b.uebersprungen));
  gleich('jede Mail ging genau einmal hinaus', gesendet, zusammen);

  // Ein zweiter Lauf danach findet nichts mehr.
  const c = await mail.versendeRation(q, { kampagneId: 1, appUrl: 'https://x', senden });
  gleich('nach dem Versand ist nichts mehr offen', c.versendet || 0, 0);

  // Außerhalb des Fensters wird nicht gesendet.
  const q2 = fakeDb();
  q2.get = async (sql) => (/FROM pflege_kampagnen/.test(sql) && !/lauf_kennung/.test(sql)
    ? { id: 1, status: 'laeuft', ration: 10, pause_sekunden: 0, fenster_von: '08:00', fenster_bis: '09:00' }
    : { lauf_kennung: null });
  const d = await mail.versendeRation(q2, { kampagneId: 1, appUrl: 'https://x', jetzt: um(22), senden });
  ok('außerhalb des Fensters wird nichts versendet', !!d.uebersprungen);

  console.log(fail ? `\n${fail} Fehler` : '\nAlle Prüfungen bestanden');
  process.exit(fail ? 1 : 0);
})();
