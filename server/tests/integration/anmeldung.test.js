// ─────────────────────────────────────────────────────────────────────────────
// Anmeldung und Registrierung sperren niemanden aus (v0.497)
//
// Anlass ist die Rückmeldung eines Empfängers der Mandatsmail, wörtlich:
// „Ich kann mich auf der Plattform weder anmelden (kennt meine Email nicht)
// noch registrieren (die Sicherheitsprüfung scheint im Moment nicht zu
// funktionieren)."
//
// Zwei Befunde dahinter:
//
//   1. Der Roboter-Test. Das Formular schickte das Token los, sobald der
//      Nutzer auf den Knopf drückte, auch wenn der Test noch gar nicht fertig
//      war. Dann ging ein leeres Token hinaus, und der Server wies ab mit der
//      Bitte, den Sicherheitscheck zu bestätigen. Dasselbe passierte, wenn die
//      Auskunft über den Schlüssel nicht erreichbar war: Dann war auf der
//      Seite nichts zu sehen, was man hätte bestätigen können.
//   2. Die Abweisung bei der Anmeldung hiess „Ungültige Anmeldedaten". Der
//      Empfänger las daraus, seine Adresse sei unbekannt, und versuchte sich
//      zu registrieren. Jeder, der die Mandatsmail bekommt, hat aber ein
//      Konto; es fehlte nur das Passwort.
//
// Geprüft wird die Mechanik, nicht der Browser: dass der Server ohne Schlüssel
// durchlässt, mit Ersatz-Token durchlässt, ohne Token abweist, und dass die
// Meldungen den Weg nach vorn nennen.
// ─────────────────────────────────────────────────────────────────────────────

const { hochfahren, zaehler } = require('./lauf');

(async () => {
  const { db, ruf } = await hochfahren({ port: 5602 });
  const { ok, schluss } = zaehler();

  console.log('\n══ Ohne hinterlegten Schlüssel läuft alles wie bisher ══');
  {
    const cfg = await ruf('/api/auth/config');
    ok('die Auskunft antwortet', cfg.status === 200, String(cfg.status));
    ok('und nennt keinen Schlüssel', cfg.daten.turnstile_site_key === null, String(cfg.daten.turnstile_site_key));

    const r = await ruf('/api/auth/register', { methode: 'POST', koerper: {} });
    ok('die Registrierung scheitert an den Pflichtfeldern, nicht am Roboter-Test',
      r.status === 400 && /Pflichtfelder/.test((r.json && r.json.error) || ''), (r.json && r.json.error) || '');
  }

  console.log('\n══ Mit Schlüssel: Ersatz-Token kommt durch, leeres Token nicht ══');
  {
    const turnstile = require(`${__dirname}/../../utils/turnstile`);
    process.env.TURNSTILE_SECRET = 'pruefstand-geheimnis';
    ok('der Test gilt jetzt als eingeschaltet', turnstile.isEnabled() === true);
    ok('das Ersatz-Token kommt durch', (await turnstile.verifyTurnstile('__unavailable__', '1.2.3.4')) === true);
    ok('ein leeres Token nicht', (await turnstile.verifyTurnstile('', '1.2.3.4')) === false);
    ok('und auch kein fehlendes', (await turnstile.verifyTurnstile(undefined, '1.2.3.4')) === false);
    delete process.env.TURNSTILE_SECRET;
    ok('ohne Geheimnis prüft er nicht', (await turnstile.verifyTurnstile('', '1.2.3.4')) === true);
  }

  console.log('\n══ Die Meldungen nennen den Weg nach vorn ══');
  {
    const routen = require('fs').readFileSync(`${__dirname}/../../routes/auth.js`, 'utf8');
    ok('die Abweisung beim Roboter-Test sagt, was zu tun ist',
      /Die Sicherheitsprüfung ist noch nicht abgeschlossen/.test(routen));
    ok('sie trägt eine Kennung', /code: 'SICHERHEITSPRUEFUNG'/.test(routen));
    ok('die Anmeldung verweist auf „Passwort vergessen"', /Passwort vergessen/.test(routen));
    ok('und sagt nicht mehr nur „Ungültige Anmeldedaten"', !/error: 'Ungültige Anmeldedaten'/.test(routen));
  }

  console.log('\n══ Eine falsche Anmeldung verrät nicht, wer ein Konto hat ══');
  {
    const bcrypt = require(`${__dirname}/../../node_modules/bcryptjs`);
    const hash = await bcrypt.hash('Pruefstand!2026', 10);
    await db.run('DELETE FROM users WHERE email = ?', ['pruef.anmeldung@pruefstand.invalid']).catch(() => {});
    await db.run(
      `INSERT INTO users (tenant_id, email, password_hash, first_name, last_name, role, is_active, is_approved, email_verified)
       VALUES (1, ?, ?, 'Alf', 'Anmeldung', 'buyer', 1, 1, 1)`, ['pruef.anmeldung@pruefstand.invalid', hash]);

    const falsch = await ruf('/api/auth/login', {
      methode: 'POST', koerper: { email: 'pruef.anmeldung@pruefstand.invalid', password: 'falsch-falsch' },
    });
    const unbekannt = await ruf('/api/auth/login', {
      methode: 'POST', koerper: { email: 'gibt.es.nicht@pruefstand.invalid', password: 'falsch-falsch' },
    });
    ok('beide Fälle werden gleich beantwortet',
      falsch.status === unbekannt.status && (falsch.json || {}).error === (unbekannt.json || {}).error,
      `${falsch.status}/${unbekannt.status}`);
    ok('und die Antwort nennt den Ausweg', /Passwort vergessen/.test((falsch.json || {}).error || ''), (falsch.json || {}).error || '');

    const richtig = await ruf('/api/auth/login', {
      methode: 'POST', koerper: { email: 'pruef.anmeldung@pruefstand.invalid', password: 'Pruefstand!2026' },
    });
    ok('die richtige Anmeldung geht weiterhin durch', richtig.status === 200 && !!richtig.daten.token, String(richtig.status));
  }

  console.log('\n══ Die Oberfläche wartet, statt leer abzuschicken ══');
  {
    const widget = require('fs').readFileSync(`${__dirname}/../../../client/src/components/Turnstile.jsx`, 'utf8');
    ok('eine gescheiterte Auskunft liefert das Ersatz-Token',
      /\.catch\(\(\) => \{[\s\S]*?onToken\(UNAVAILABLE\)/.test(widget));
    ok('das Widget meldet seinen Zustand nach aussen', /onStatus/.test(widget));
    ok('ohne Schlüssel meldet es „aus"', /setStatus\('aus'\)/.test(widget));

    for (const datei of ['Login.jsx', 'Register.jsx']) {
      const quelle = require('fs').readFileSync(`${__dirname}/../../../client/src/pages/${datei}`, 'utf8');
      ok(`${datei} wartet auf den Test`, /await warteAufTest\(\)/.test(quelle));
      ok(`${datei} kennt den Zustand des Tests`, /onStatus=\{setTsStatus\}/.test(quelle));
      ok(`${datei} gibt nach einer Wartezeit auf`, /for \(let i = 0; i < 40; i \+= 1\)/.test(quelle));
      // v0.498: Ohne eingerichteten Test wartete das Formular zehn Sekunden
      // ins Leere. Aufgefallen erst im Browser auf der Teststufe, nicht hier.
      ok(`${datei} wartet nicht, wenn gar kein Test eingerichtet ist`,
        (quelle.match(/status === 'aus'/g) || []).length === 2,
        String((quelle.match(/status === 'aus'/g) || []).length));
    }
  }

  schluss();
})().catch((e) => { console.error('ABBRUCH:', e.message, '\n', (e.stack || '').split('\n').slice(0, 5).join('\n')); process.exit(1); });
