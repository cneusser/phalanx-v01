// ─────────────────────────────────────────────────────────────────────────────
// Die Urkunde noch einmal zustellen (v0.492)
//
// Anlass, wörtlich: „Gäbe es die Möglichkeit, einen NDA nochmals zu
// verschicken, könnten wir es vielleicht testen, oder?"
//
// Geprüft wird:
//   1. Nur die Verwaltung darf das. Ein Interessent nicht, auch nicht für
//      sich selbst, denn der Versand geht immer auch an die Beratung.
//   2. Ohne unterzeichnete Vereinbarung gibt es nichts zuzustellen.
//   3. Standard ist die Beratung allein. Wer prüft, schreibt nicht
//      versehentlich einen Interessenten an.
//   4. An beide nur auf ausdrückliche Ansage.
//   5. Es wird nichts verändert: derselbe Stand, dieselbe Unterschrift.
//   6. Ein alter Fall ohne Gegenzeichnung bekommt auch im Nachdruck keine.
// ─────────────────────────────────────────────────────────────────────────────

const { hochfahren, zaehler } = require('./lauf');

(async () => {
  const { db, ruf, alsNutzer, mandat } = await hochfahren({ port: 5596 });
  const { ok, schluss } = zaehler();

  const admin = await db.get("SELECT * FROM users WHERE role = 'super_admin' ORDER BY id LIMIT 1");
  const tAdmin = alsNutzer(admin);
  const pid = await mandat('PRUEF_ERNEUT');

  const bcrypt = require(`${__dirname}/../../node_modules/bcryptjs`);
  const hash = await bcrypt.hash('Pruefstand!2026', 10);
  await db.run('DELETE FROM users WHERE email = ?', ['pruef.erneut@pruefstand.invalid']).catch(() => {});
  await db.run(
    `INSERT INTO users (tenant_id, email, password_hash, salutation, first_name, last_name, company, position,
                        mobile, street, postal_code, city, company_seat, company_register, company_representative,
                        role, is_active, is_approved, email_verified)
     VALUES (1, ?, ?, 'Herr', 'Emil', 'Erneut', 'Erneut Holding', 'Geschäftsführung',
             '+49 160 3', 'Weg 3', '90002', 'Ort', 'Bamberg', 'Amtsgericht Bamberg, HRB 7', 'Emil Erneut',
             'buyer', 1, 1, 1)`,
    ['pruef.erneut@pruefstand.invalid', hash]);
  const kaeufer = await db.get('SELECT * FROM users WHERE email = ?', ['pruef.erneut@pruefstand.invalid']);
  const t = alsNutzer(kaeufer);

  console.log('\n══ Ohne Unterschrift gibt es nichts zuzustellen ══');
  {
    const r = await ruf(`/api/ndas/${pid}/erneut-senden`, {
      token: tAdmin, methode: 'POST', koerper: { user_id: kaeufer.id },
    });
    ok('die Zustellung wird abgewiesen', r.status === 404, String(r.status));
  }

  console.log('\n══ Unterschreiben ══');
  await ruf('/api/ndas', { token: t, methode: 'POST', koerper: { project_id: pid } });
  const f = (await ruf(`/api/ndas/${pid}/fassung`, { token: t })).daten;
  const sig = await ruf(`/api/ndas/${pid}/sign-online`, {
    token: t, methode: 'POST',
    koerper: { consent_name: 'Emil Erneut', consent_confirmed: true, fassung_hash: f.hash },
  });
  ok('die Unterschrift geht durch', [200, 201].includes(sig.status), String(sig.status));
  const vorher = await db.get('SELECT * FROM nda_requests WHERE user_id = ? AND project_id = ?', [kaeufer.id, pid]);

  console.log('\n══ Wer darf zustellen ══');
  {
    const alsKaeufer = await ruf(`/api/ndas/${pid}/erneut-senden`, {
      token: t, methode: 'POST', koerper: { user_id: kaeufer.id },
    });
    ok('ein Interessent darf es nicht', alsKaeufer.status === 403, String(alsKaeufer.status));

    const ohneWen = await ruf(`/api/ndas/${pid}/erneut-senden`, {
      token: tAdmin, methode: 'POST', koerper: {},
    });
    ok('ohne Person wird abgewiesen', ohneWen.status === 400, String(ohneWen.status));
  }

  console.log('\n══ Standard: nur die Beratung ══');
  {
    const r = await ruf(`/api/ndas/${pid}/erneut-senden`, {
      token: tAdmin, methode: 'POST', koerper: { user_id: kaeufer.id },
    });
    ok('die Zustellung geht durch', r.status === 200, `${r.status} ${(r.text || '').slice(0, 160)}`);
    ok('und zwar an genau einen Empfaenger', (r.daten.empfaenger || []).length === 1, JSON.stringify(r.daten.empfaenger));
    ok('nicht an den Interessenten', !(r.daten.empfaenger || []).includes(kaeufer.email), JSON.stringify(r.daten.empfaenger));
    ok('ein Fingerabdruck wird genannt', /^[0-9a-f]{64}$/.test(r.daten.fingerabdruck || ''), String(r.daten.fingerabdruck));
  }

  console.log('\n══ Auf Ansage an beide ══');
  {
    const r = await ruf(`/api/ndas/${pid}/erneut-senden`, {
      token: tAdmin, methode: 'POST', koerper: { user_id: kaeufer.id, ziel: 'beide' },
    });
    ok('die Zustellung geht durch', r.status === 200, String(r.status));
    ok('jetzt an zwei Empfaenger', (r.daten.empfaenger || []).length === 2, JSON.stringify(r.daten.empfaenger));
    ok('darunter der Unterzeichner', (r.daten.empfaenger || []).includes(kaeufer.email), JSON.stringify(r.daten.empfaenger));
  }

  console.log('\n══ Es wird nichts veraendert ══');
  {
    const nachher = await db.get('SELECT * FROM nda_requests WHERE user_id = ? AND project_id = ?', [kaeufer.id, pid]);
    ok('der Stand ist derselbe', nachher.status === vorher.status, `${vorher.status} zu ${nachher.status}`);
    ok('die Unterschrift ist dieselbe', String(nachher.online_consent_at) === String(vorher.online_consent_at));
    ok('der Fingerabdruck der Fassung ist derselbe', nachher.fassung_hash === vorher.fassung_hash);
    const protokoll = await db.get(
      "SELECT * FROM audit_logs WHERE action = 'NDA_ERNEUT_GESENDET' ORDER BY id DESC LIMIT 1");
    ok('der Vorgang steht im Protokoll', !!protokoll, protokoll ? JSON.stringify(protokoll).slice(0, 160) : 'kein Eintrag');
  }

  console.log('\n══ Ein alter Fall bekommt keine Gegenzeichnung untergeschoben ══');
  {
    await db.run('UPDATE nda_requests SET countersigned_at = NULL, countersigned_by = NULL, signed_pdf_path = NULL WHERE id = ?', [vorher.id]);
    const herunter = await ruf(`/api/ndas/${pid}/download?user_id=${kaeufer.id}`, { token: tAdmin });
    ok('der Nachdruck entsteht', herunter.status === 200 && herunter.text.startsWith('%PDF'),
      `${herunter.status} ${herunter.text.slice(0, 8)}`);
    const routen = require('fs').readFileSync(`${__dirname}/../../routes/ndas.js`, 'utf8');
    ok('und zwar ohne erfundene Gegenzeichnung',
      /nda\.countersigned_at \? gegenzeichnungAus\(template, nda\.countersigned_at\) : null/.test(routen));
    ok('auch in der Vorschau', /\(signature && nda && nda\.countersigned_at\)/.test(routen));
  }

  schluss();
})().catch((e) => { console.error('ABBRUCH:', e.message, '\n', (e.stack || '').split('\n').slice(0, 5).join('\n')); process.exit(1); });
