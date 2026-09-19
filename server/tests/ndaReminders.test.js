// Prüft, wann eine Erinnerung an eine ausstehende NDA-Unterschrift fällig ist.
// Rhythmus: nach 3 und nach 7 Tagen, danach nichts mehr; nie zweimal am Tag;
// nie bei unterschriebenen, abgelehnten oder noch nicht versendeten NDAs.
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgres://u:p@localhost:5432/testdb';
const { istFaellig, planTage, nachricht } = require('../utils/ndaReminders');

let fail = 0;
const ok = (n, c) => { console.log((c ? '✓' : '✗ FEHLER') + ' ' + n); if (!c) fail++; };

const TAG = 24 * 60 * 60 * 1000;
const JETZT = new Date('2026-09-19T10:00:00Z');
const vorTagen = (n) => new Date(JETZT.getTime() - n * TAG);
const nda = (o = {}) => ({ status: 'sent', sent_at: vorTagen(10), online_consent_at: null, reminder_count: 0, last_reminder_at: null, ...o });
const TAGE = [3, 7];

// ── Rhythmus ────────────────────────────────────────────────────────────────
ok('nach 2 Tagen noch nicht faellig', istFaellig(nda({ sent_at: vorTagen(2) }), JETZT, TAGE) === false);
ok('nach 3 Tagen erste Erinnerung faellig', istFaellig(nda({ sent_at: vorTagen(3) }), JETZT, TAGE) === true);
ok('nach 5 Tagen, erste schon raus: noch nicht faellig',
  istFaellig(nda({ sent_at: vorTagen(5), reminder_count: 1, last_reminder_at: vorTagen(2) }), JETZT, TAGE) === false);
ok('nach 7 Tagen, erste schon raus: zweite faellig',
  istFaellig(nda({ sent_at: vorTagen(7), reminder_count: 1, last_reminder_at: vorTagen(4) }), JETZT, TAGE) === true);
ok('nach 30 Tagen, beide raus: Serie beendet',
  istFaellig(nda({ sent_at: vorTagen(30), reminder_count: 2, last_reminder_at: vorTagen(20) }), JETZT, TAGE) === false);

// ── Sperren ─────────────────────────────────────────────────────────────────
ok('heute bereits erinnert: nicht nochmal',
  istFaellig(nda({ sent_at: vorTagen(8), reminder_count: 1, last_reminder_at: new Date(JETZT.getTime() - 3 * 60 * 60 * 1000) }), JETZT, TAGE) === false);
ok('gestern erinnert und faellig: geht',
  istFaellig(nda({ sent_at: vorTagen(8), reminder_count: 1, last_reminder_at: vorTagen(1.5) }), JETZT, TAGE) === true);

// ── Zustaende, die keine Erinnerung bekommen ────────────────────────────────
ok('bereits unterschrieben: keine Erinnerung', istFaellig(nda({ online_consent_at: vorTagen(1) }), JETZT, TAGE) === false);
ok('Status angefordert (noch nicht versendet): keine Erinnerung', istFaellig(nda({ status: 'requested' }), JETZT, TAGE) === false);
ok('Status unterschrieben: keine Erinnerung', istFaellig(nda({ status: 'signed' }), JETZT, TAGE) === false);
ok('Status freigegeben: keine Erinnerung', istFaellig(nda({ status: 'approved' }), JETZT, TAGE) === false);
ok('Status abgelehnt: keine Erinnerung', istFaellig(nda({ status: 'rejected' }), JETZT, TAGE) === false);
ok('ohne Versanddatum: keine Erinnerung', istFaellig(nda({ sent_at: null }), JETZT, TAGE) === false);
ok('leeres Objekt bricht nicht', istFaellig(null, JETZT, TAGE) === false);

// ── Rhythmus aus der Umgebung ───────────────────────────────────────────────
process.env.NDA_REMINDER_TAGE = '5,12';
ok('ENV-Rhythmus wird gelesen', JSON.stringify(planTage()) === JSON.stringify([5, 12]));
ok('ENV-Rhythmus greift: nach 3 Tagen nun zu frueh', istFaellig(nda({ sent_at: vorTagen(3) }), JETZT, planTage()) === false);
ok('ENV-Rhythmus greift: nach 5 Tagen faellig', istFaellig(nda({ sent_at: vorTagen(5) }), JETZT, planTage()) === true);
process.env.NDA_REMINDER_TAGE = 'quatsch';
ok('unsinniger ENV-Wert faellt auf 3 und 7 zurueck', JSON.stringify(planTage()) === JSON.stringify([3, 7]));
delete process.env.NDA_REMINDER_TAGE;

// ── Text ────────────────────────────────────────────────────────────────────
const ersteMail = nachricht({ codename: 'FARADAY', anzahl: 0, tage: [3, 7] });
const letzteMail = nachricht({ codename: 'FARADAY', anzahl: 1, tage: [3, 7] });
ok('Mail nennt das Mandat', /FARADAY/.test(ersteMail));
ok('erste Mail ohne Ausstiegs-Angebot', !/kein Interesse mehr/.test(ersteMail));
ok('letzte Mail bietet den Ausstieg an', /kein Interesse mehr/.test(letzteMail));

console.log(fail ? `\n${fail} Test(s) fehlgeschlagen` : '\nAlle NDA-Erinnerungs-Tests grün');
process.exit(fail ? 1 : 0);
