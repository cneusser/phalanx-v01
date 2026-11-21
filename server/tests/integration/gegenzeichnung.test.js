// ─────────────────────────────────────────────────────────────────────────────
// Beide Unterschriften unter derselben Urkunde (v0.491)
//
// Anlass, wörtlich: „Macht es Sinn, dass ich diesen eventuell noch
// gegenzeichne? Ähnliches Verfahren, aber bevor es dann final als Mail
// verschickt wird, dass meine Unterschrift auch drunter ist?"
//
// Der sachliche Grund steht in § 8 der Vereinbarung selbst: Sie tritt „mit
// Unterzeichnung durch beide Parteien" in Kraft. Bis v0.490 trug die Urkunde
// nur eine Unterschrift, und die Zeile der Beratung blieb leer.
//
// Geprüft wird:
//   1. Die Vorlage kennt den Unterzeichner der Beratung, und er steht in der
//      Datenbank, nicht nur im Quelltext.
//   2. Mit der Unterschrift wird gegengezeichnet, im selben Vorgang.
//   3. Der Datenraum hängt nicht daran. Er geht auf wie in v0.489.
//   4. Das PDF trägt beide Unterschriften, auch der spätere Nachdruck.
//   5. Ohne hinterlegten Unterzeichner bleibt die Zeile leer, statt zu raten.
// ─────────────────────────────────────────────────────────────────────────────

const { hochfahren, zaehler } = require('./lauf');

(async () => {
  const { db, ruf, alsNutzer, mandat, stufe } = await hochfahren({ port: 5595 });
  const { ok, schluss } = zaehler();

  const vorlage = require(`${__dirname}/../../db/ndaVorlagePhalanx`);
  const { generateNDA } = require(`${__dirname}/../../utils/ndaGenerator`);

  console.log('\n══ Der Unterzeichner der Beratung ══');
  {
    ok('die Vorlage nennt ihn', !!(vorlage.advisor.signer && vorlage.advisor.signer.name),
      JSON.stringify(vorlage.advisor.signer));
    ok('mit Funktion und Ort', !!vorlage.advisor.signer.role && !!vorlage.advisor.signer.place);
    const zeile = await db.get('SELECT advisor_json FROM nda_templates WHERE is_active = 1 ORDER BY version DESC LIMIT 1');
    const berater = JSON.parse(zeile.advisor_json || '{}');
    ok('und er steht in der hinterlegten Vorlage', !!(berater.signer && berater.signer.name), zeile.advisor_json);
  }

  console.log('\n══ Unterschreiben und gegenzeichnen in einem Vorgang ══');
  const pid = await mandat('PRUEF_GEGENZEICHNUNG');
  const bcrypt = require(`${__dirname}/../../node_modules/bcryptjs`);
  const hash = await bcrypt.hash('Pruefstand!2026', 10);
  await db.run('DELETE FROM users WHERE email = ?', ['pruef.gegen@pruefstand.invalid']).catch(() => {});
  await db.run(
    `INSERT INTO users (tenant_id, email, password_hash, salutation, first_name, last_name, company, position,
                        mobile, street, postal_code, city, company_seat, company_register, company_representative,
                        role, is_active, is_approved, email_verified)
     VALUES (1, ?, ?, 'Herr', 'Gero', 'Gegenzeichner', 'Gegen Capital GmbH', 'Geschäftsführung',
             '+49 160 2', 'Weg 2', '90001', 'Ort', 'Fürth', 'Amtsgericht Fürth, HRB 1', 'Gero Gegenzeichner',
             'buyer', 1, 1, 1)`,
    ['pruef.gegen@pruefstand.invalid', hash]);
  const kaeufer = await db.get('SELECT * FROM users WHERE email = ?', ['pruef.gegen@pruefstand.invalid']);
  const t = alsNutzer(kaeufer);

  await ruf('/api/ndas', { token: t, methode: 'POST', koerper: { project_id: pid } });
  const f = (await ruf(`/api/ndas/${pid}/fassung`, { token: t })).daten;
  const sig = await ruf(`/api/ndas/${pid}/sign-online`, {
    token: t, methode: 'POST',
    koerper: { consent_name: 'Gero Gegenzeichner', consent_confirmed: true, fassung_hash: f.hash },
  });
  ok('die Unterschrift geht durch', [200, 201].includes(sig.status), `${sig.status} ${(sig.text || '').slice(0, 160)}`);

  const zeile = await db.get('SELECT * FROM nda_requests WHERE user_id = ? AND project_id = ?', [kaeufer.id, pid]);
  {
    ok('der Zeitpunkt der Gegenzeichnung ist festgehalten', !!zeile.countersigned_at, String(zeile.countersigned_at));
    ok('und wer gegengezeichnet hat', /Neusser/.test(zeile.countersigned_by || ''), String(zeile.countersigned_by));
    ok('sie fällt mit der Unterschrift zusammen',
      Math.abs(new Date(zeile.countersigned_at) - new Date(zeile.online_consent_at)) < 5000,
      `${zeile.countersigned_at} zu ${zeile.online_consent_at}`);
  }

  console.log('\n══ Der Datenraum hängt nicht daran ══');
  {
    ok('die Stufe steht auf Datenraum', (await stufe(pid, kaeufer.id)) === 'dataroom_granted', String(await stufe(pid, kaeufer.id)));
    ok('die Vereinbarung gilt als freigegeben', zeile.status === 'approved', zeile.status);
  }

  console.log('\n══ Die Urkunde trägt beide Unterschriften ══');
  {
    const herunter = await ruf(`/api/ndas/${pid}/download`, { token: t });
    ok('das PDF lässt sich laden', herunter.status === 200 && herunter.text.startsWith('%PDF'),
      `${herunter.status} ${herunter.text.slice(0, 8)}`);

    // Der Text im PDF ist komprimiert, deshalb wird hier der Erzeuger direkt
    // befragt: Dieselben Eingaben, derselbe Satz.
    const mit = await generateNDA({
      buyer: { id: kaeufer.id, first_name: 'Gero', last_name: 'Gegenzeichner', company: 'Gegen Capital GmbH', email: kaeufer.email, address: 'Weg 2', city: '90001 Ort', company_seat: 'Fürth', company_register: 'Amtsgericht Fürth, HRB 1', company_representative: 'Gero Gegenzeichner' },
      project: { codename: 'PRUEF_GEGENZEICHNUNG' },
      template: vorlage,
      signature: { name: 'Gero Gegenzeichner', company: 'Gegen Capital GmbH', date: new Date().toISOString(), ip: '1.2.3.4' },
      gegenzeichnung: { name: 'Dr. Christian Neusser', role: 'Geschäftsführer / Managing Director', place: 'Erlangen', date: new Date().toISOString() },
    });
    const ohne = await generateNDA({
      buyer: { id: kaeufer.id, first_name: 'Gero', last_name: 'Gegenzeichner', company: 'Gegen Capital GmbH', email: kaeufer.email, address: 'Weg 2', city: '90001 Ort', company_seat: 'Fürth', company_register: 'Amtsgericht Fürth, HRB 1', company_representative: 'Gero Gegenzeichner' },
      project: { codename: 'PRUEF_GEGENZEICHNUNG' },
      template: vorlage,
      signature: { name: 'Gero Gegenzeichner', company: 'Gegen Capital GmbH', date: new Date().toISOString(), ip: '1.2.3.4' },
      gegenzeichnung: null,
    });
    ok('das gegengezeichnete PDF entsteht', mit.length > 8000, String(mit.length));
    ok('und unterscheidet sich vom einseitigen', mit.length !== ohne.length, `${mit.length} zu ${ohne.length}`);
  }

  console.log('\n══ Ohne hinterlegten Unterzeichner wird nichts erfunden ══');
  {
    const leer = JSON.parse(JSON.stringify(vorlage));
    delete leer.advisor.signer;
    const pdf = await generateNDA({
      buyer: { id: 1, first_name: 'Gero', last_name: 'Gegenzeichner', company: 'Gegen Capital GmbH', email: 'g@pruefstand.invalid', address: 'Weg 2', city: '90001 Ort' },
      project: { codename: 'PRUEF_GEGENZEICHNUNG' },
      template: leer,
      signature: { name: 'Gero Gegenzeichner', company: 'Gegen Capital GmbH', date: new Date().toISOString(), ip: '1.2.3.4' },
      gegenzeichnung: null,
    });
    ok('das PDF entsteht trotzdem', pdf.length > 8000, String(pdf.length));
    const routen = require('fs').readFileSync(`${__dirname}/../../routes/ndas.js`, 'utf8');
    ok('die Route zeichnet ohne hinterlegten Unterzeichner nicht gegen',
      /if \(!unterzeichner \|\| !unterzeichner\.name\) return null;/.test(routen));
  }

  console.log('\n══ Die Mails nennen die Gegenzeichnung ══');
  {
    const routen = require('fs').readFileSync(`${__dirname}/../../routes/ndas.js`, 'utf8');
    ok('die Mail an den Unterzeichner', /von der Phalanx GmbH gegengezeichnet/.test(routen));
    ok('und die Mail an die Beratung', /<strong>Gegengezeichnet<\/strong>/.test(routen));
  }

  schluss();
})().catch((e) => { console.error('ABBRUCH:', e.message, '\n', (e.stack || '').split('\n').slice(0, 5).join('\n')); process.exit(1); });
