// Prüft die Texte, die an Kontakte hinausgehen: kein Gedankenstrich, keine Floskel,
// alle Platzhalter aufgelöst, Anrede sitzt.
//
// Die Datenbank wird gestubbt, damit der Test ohne Postgres läuft.
const path = require('path');
const dbPath = require.resolve('../db/database');
require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: {
  get: async () => null, all: async () => [], run: async () => {}, insert: async () => 1,
  auditLog: () => {}, activityLog: () => {},
} };

const { TEMPLATES } = require('../db/mailTemplateSeed');
const { buildInviteMail, buildReminderMail, buildUpdateMail } = require('../utils/campaigns');
const { buildContext, render, bodyToHtml } = require('../utils/mailTemplates');

const DASH = String.fromCharCode(0x2014);
const FLOSKELN = ['nahtlos', 'zusammenfassend lässt sich', 'es ist wichtig zu erwähnen', 'ganzheitlich'];

let fail = 0;
const ok = (n, c) => { console.log((c ? '✓' : '✗ FEHLER') + ' ' + n); if (!c) fail++; };

const contact = { salutation: 'Herr', title: 'Dr.', first_name: 'Peter', last_name: 'Baumgartner', email: 'p.b@example.com', company_name: 'Baumgartner Invest' };
const project = { id: 7, codename: 'FARADAY', industry: 'Maschinenbau', region: 'Bayern', revenue_band: '10 bis 25 Mio. €', ebitda_band: 'k. A.', deal_type: 'Nachfolge', short_description: 'Etablierter Zulieferer mit eigener Fertigung.' };
const inviter = { title: 'Dr.', first_name: 'Christian', last_name: 'Neusser', email: 'neusser@phalanx.de' };

// 1) Systemvorlagen
const alleTexte = TEMPLATES.map(t => `${t.name} ${t.subject} ${t.body}`).join('\n');
ok('Vorlagen ohne Gedankenstrich', !alleTexte.includes(DASH));
ok('Vorlagen ohne Floskeln', !FLOSKELN.some(f => alleTexte.toLowerCase().includes(f)));
ok('11 Systemvorlagen vorhanden', TEMPLATES.length === 11);
ok('jede Vorlage hat Betreff und Text', TEMPLATES.every(t => t.subject.trim() && t.body.trim()));
ok('Wiederaufnahme ist die erste Vorlage', TEMPLATES[0].key === 'reengage');

// 2) Platzhalter werden vollständig ersetzt
const ctx = buildContext({ contact, project, inviter, frist: '15.08.2026' });
const gerendert = TEMPLATES.map(t => render(t.subject, ctx) + '\n' + render(t.body, ctx)).join('\n');
ok('keine offenen Platzhalter nach dem Rendern', !/\{\{|\}\}/.test(gerendert));
ok('Mandat wird eingesetzt', gerendert.includes('FARADAY'));
ok('fehlendes EBITDA wird zu „auf Anfrage"', ctx.ebitda === 'auf Anfrage');
ok('Anrede mit Titel', ctx.anrede === 'Sehr geehrter Herr Dr. Baumgartner,');
ok('gerenderter Text ohne Gedankenstrich', !gerendert.includes(DASH));

// 3) HTML-Ausgabe bleibt sauber
const html = bodyToHtml(render(TEMPLATES[0].body, ctx));
ok('Absätze werden zu <p>', (html.match(/<p /g) || []).length >= 2);
ok('HTML wird escaped', bodyToHtml('<script>x</script>').includes('&lt;script&gt;'));

// 4) Die drei fest verdrahteten Mails
const invite = buildInviteMail({ contact, project, inviter, inviteToken: 'tok', profileToken: 'pro', needsConsent: true });
const reminder1 = buildReminderMail({ contact, project, inviter, inviteToken: 'tok', profileToken: 'pro', needsConsent: true, round: 1 });
const reminder2 = buildReminderMail({ contact, project, inviter, inviteToken: 'tok', profileToken: 'pro', needsConsent: false, round: 2 });
const update = buildUpdateMail({ contact, project, inviter, changes: ['Umsatzband: 10 bis 25 Mio. €'], note: 'Erste Gespräche laufen.', profileToken: 'pro' });

for (const [name, mail] of [['Einladung', invite], ['Erinnerung 1', reminder1], ['Erinnerung 2', reminder2], ['Update', update]]) {
  const text = `${mail.subject} ${mail.title} ${mail.salutation} ${mail.bodyHtml} ${mail.secondaryHtml || ''} ${mail.legalHtml || ''}`;
  ok(`${name}: kein Gedankenstrich`, !text.includes(DASH));
  ok(`${name}: keine Floskel`, !FLOSKELN.some(f => text.toLowerCase().includes(f)));
  ok(`${name}: Empfänger und Betreff gesetzt`, !!mail.to && !!mail.subject);
  ok(`${name}: Anrede vollständig`, mail.salutation === 'Sehr geehrter Herr Dr. Baumgartner,');
}
ok('Einladung erklärt die Einwilligung', invite.bodyHtml.includes('DSGVO'));
ok('Zweite Erinnerung schließt den Vorgang ab', reminder2.title.includes('letzte Nachfrage'));
ok('Widerspruch steht im Abbinder', invite.legalHtml.includes('widersprechen'));
ok('EBITDA ohne Wert taucht in der Faktentabelle nicht auf', !invite.bodyHtml.includes('k. A.'));

console.log(fail ? `\n${fail} FEHLER` : '\nAlle Tests grün');
process.exit(fail ? 1 : 0);
