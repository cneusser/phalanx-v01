// ─────────────────────────────────────────────────────────────────────────────
// Startklar statt Punktestand, und die Suchaufträge sind auffindbar (v0.493)
//
// Anlass, wörtlich: „Was kann ich mit den Punkten machen?" und, als
// Entscheidung: „Eventuell wäre hier eine Art Profilvollständigkeit als Ersatz
// sinnvoll. Kannst Du hier nicht eine Art geführte Strecke machen, wo noch
// Daten fehlen?" Dazu: „Auch ist mir aufgefallen, dass ich oben schreibe, dass
// man Suchkriterien hinterlegen kann? Wo und wie kann ich das umsetzen?"
//
// Geprüft wird:
//   1. Ein leeres Konto bekommt alle Schritte als offen, mit Feldern, Grund
//      und einem Verweis, der die fehlenden Felder schon mitbringt.
//   2. Jeder gepflegte Teil schliesst genau seinen Schritt, nicht mehr.
//   3. „Fertig" ist erst fertig, wenn alles Nötige steht; der freiwillige
//      Suchauftrag hält es nicht auf.
//   4. Das Dashboard zeigt keinen Punktestand mehr, sondern die Strecke.
//   5. Die Suchaufträge stehen im Menü.
// ─────────────────────────────────────────────────────────────────────────────

const { hochfahren, zaehler } = require('./lauf');

(async () => {
  const { db, ruf, alsNutzer } = await hochfahren({ port: 5597 });
  const { ok, schluss } = zaehler();

  const bcrypt = require(`${__dirname}/../../node_modules/bcryptjs`);
  const hash = await bcrypt.hash('Pruefstand!2026', 10);
  await db.run('DELETE FROM users WHERE email = ?', ['pruef.startklar@pruefstand.invalid']).catch(() => {});
  await db.run(
    `INSERT INTO users (tenant_id, email, password_hash, first_name, last_name, role, is_active, is_approved, email_verified)
     VALUES (1, ?, ?, '', '', 'buyer', 1, 1, 1)`, ['pruef.startklar@pruefstand.invalid', hash]);
  const u = await db.get('SELECT * FROM users WHERE email = ?', ['pruef.startklar@pruefstand.invalid']);
  const t = alsNutzer(u);

  const hole = async () => (await ruf('/api/profile/startklar', { token: t })).daten;

  console.log('\n══ Ein leeres Konto ══');
  {
    const s = await hole();
    ok('es gibt fünf Schritte', s.schritte.length === 5, String(s.schritte.length));
    ok('keiner ist erledigt', s.erledigt === 0, String(s.erledigt));
    ok('und es gilt nicht als fertig', s.fertig === false);

    const erst = s.schritte[0];
    ok('der erste Schritt nennt die fehlenden Felder', erst.fehlt.length === 4, erst.fehlt.join(','));
    ok('mit Beschriftung statt Spaltennamen', erst.fehlt_namen.includes('Anrede'), erst.fehlt_namen.join(', '));
    ok('er sagt, wozu das gut ist', typeof erst.wozu === 'string' && erst.wozu.length > 20);
    ok('und führt mit den Feldern im Verweis zum Profil',
      /^\/profil\?fehlt=.+&grund=frueh$/.test(erst.weiter), erst.weiter);

    const suchauftrag = s.schritte.find((x) => x.kennung === 'suchauftrag');
    ok('der Suchauftrag ist als freiwillig gekennzeichnet', suchauftrag.freiwillig === true);
    ok('und verweist auf die Suchaufträge', suchauftrag.weiter === '/suchprofile', suchauftrag.weiter);
  }

  console.log('\n══ Jeder Teil schliesst genau seinen Schritt ══');
  {
    await db.run(`UPDATE users SET salutation = 'Frau', first_name = 'Sara', last_name = 'Startklar', company = 'Startklar GmbH' WHERE id = ?`, [u.id]);
    let s = await hole();
    ok('die vier frühen Angaben schliessen den ersten Schritt',
      s.schritte[0].erledigt === true && s.schritte[1].erledigt === false);
    ok('die Vertragsangaben bleiben offen', s.schritte[2].erledigt === false);

    await db.run(`UPDATE users SET position = 'Geschäftsführung', mobile = '+49 160 9', street = 'Weg 9', postal_code = '90009', city = 'Ort' WHERE id = ?`, [u.id]);
    s = await hole();
    ok('die vollen Kontaktdaten schliessen den zweiten', s.schritte[1].erledigt === true);
    ok('mehr nicht', s.schritte[2].erledigt === false && s.erledigt === 2, String(s.erledigt));

    await db.run(`UPDATE users SET company_seat = 'Erlangen', company_register = 'Amtsgericht Fürth, HRB 1', company_representative = 'Sara Startklar' WHERE id = ?`, [u.id]);
    s = await hole();
    ok('die Vertragsangaben schliessen den dritten', s.schritte[2].erledigt === true);
    ok('die Suchkriterien fehlen weiterhin', s.schritte[3].erledigt === false);
    ok('und es gilt noch nicht als fertig', s.fertig === false);
  }

  console.log('\n══ Suchkriterien und Fertigmeldung ══');
  {
    const r = await ruf('/api/profile', {
      token: t, methode: 'PUT',
      koerper: { industries: ['C10'], regions: ['Bayern'], revenue_min: 1, revenue_max: 20 },
    });
    ok('die Suchkriterien lassen sich speichern', r.status === 200, String(r.status));
    const s = await hole();
    ok('der vierte Schritt ist damit erledigt', s.schritte[3].erledigt === true, JSON.stringify(s.schritte[3].fehlt_namen));
    ok('jetzt gilt es als fertig, trotz offenem Suchauftrag',
      s.fertig === true && s.schritte[4].erledigt === false);
    ok('vier von fünf sind erledigt', s.erledigt === 4, String(s.erledigt));
  }

  console.log('\n══ Ein gespeicherter Suchauftrag ══');
  {
    const r = await ruf('/api/community/search-profiles', {
      token: t, methode: 'POST',
      koerper: { name: 'Nahrungsmittel Bayern', criteria: { industry: 'C10', region: 'Bayern' }, notify_frequency: 'weekly' },
    });
    ok('er lässt sich anlegen', [200, 201].includes(r.status), `${r.status} ${(r.text || '').slice(0, 120)}`);
    const s = await hole();
    ok('damit sind alle fünf Schritte erledigt', s.erledigt === 5 && s.offen === 0, `${s.erledigt}/${s.gesamt}`);
  }

  console.log('\n══ Die Oberfläche ══');
  {
    const dash = require('fs').readFileSync(`${__dirname}/../../../client/src/pages/Dashboard.jsx`, 'utf8');
    ok('das Dashboard holt die Strecke', /api\.get\('\/profile\/startklar'\)/.test(dash));
    ok('und zeigt keinen Punktestand mehr', !/XP<\/span>|gamification\/me/.test(dash));
    ok('erledigte Schritte bleiben sichtbar', /startklar\.schritte\.map/.test(dash));
    ok('ist alles gepflegt, schrumpft der Baustein', /startklar\.fertig &&/.test(dash));

    const nav = require('fs').readFileSync(`${__dirname}/../../../client/src/components/Navbar.jsx`, 'utf8');
    ok('die Suchaufträge stehen im Menü', /to="\/suchprofile"/.test(nav));
    ok('auch in der schmalen Ansicht', (nav.match(/to="\/suchprofile"/g) || []).length === 2,
      String((nav.match(/to="\/suchprofile"/g) || []).length));

    const prof = require('fs').readFileSync(`${__dirname}/../../../client/src/pages/Profile.jsx`, 'utf8');
    ok('das Profil pflegt die drei Vertragsangaben', /data-feld={key}/.test(prof) && /company_representative/.test(prof));
    ok('und kennt den Sprung auf einen ganzen Bereich', /data-bereich="suchkriterien"/.test(prof));
  }

  schluss();
})().catch((e) => { console.error('ABBRUCH:', e.message, '\n', (e.stack || '').split('\n').slice(0, 5).join('\n')); process.exit(1); });
