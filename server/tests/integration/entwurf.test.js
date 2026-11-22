// ─────────────────────────────────────────────────────────────────────────────
// Ein Entwurf sagt, dass er einer ist (v0.494)
//
// Anlass, wörtlich: „Ich hab ein neues Projekt LUMEN angelegt. Leider ist es
// nicht zu sehen. Was mach ich falsch?" Nichts. Ein neu angelegtes Mandat
// steht auf Entwurf, der Marktplatz zeigt nur aktive, und das stand an keiner
// Stelle. Die Karte im Verkäuferbereich trug das Wort „Entwurf" und einen
// Knopf „Bearbeiten", mehr nicht. Die beiden Wege nach vorn gab es am Server
// längst, die Oberfläche hat sie nie angeboten.
//
// Geprüft wird:
//   1. Ein Entwurf ist nicht auf dem Marktplatz, auch nicht für seinen eigenen
//      Verkäufer. Das ist richtig so und wird hier festgehalten.
//   2. Der Verkäufer kann einreichen, danach steht es auf „in Prüfung".
//   3. Unvollständige Entwürfe werden dabei abgewiesen, mit Begründung.
//   4. Die Verwaltung veröffentlicht, danach ist es auf dem Marktplatz.
//   5. Die Oberfläche bietet beides an und sagt, warum nichts zu sehen ist.
//   6. Die Begrüssung behauptet nicht mehr „eingereicht", wenn etwas im
//      Entwurf liegt.
// ─────────────────────────────────────────────────────────────────────────────

const { hochfahren, zaehler } = require('./lauf');

(async () => {
  const { db, ruf, alsNutzer } = await hochfahren({ port: 5598 });
  const { ok, schluss } = zaehler();

  const admin = await db.get("SELECT * FROM users WHERE role = 'super_admin' ORDER BY id LIMIT 1");
  const tAdmin = alsNutzer(admin);

  const bcrypt = require(`${__dirname}/../../node_modules/bcryptjs`);
  const hash = await bcrypt.hash('Pruefstand!2026', 10);
  await db.run('DELETE FROM users WHERE email = ?', ['pruef.verkauf@pruefstand.invalid']).catch(() => {});
  await db.run(
    `INSERT INTO users (tenant_id, email, password_hash, salutation, first_name, last_name, company, position,
                        mobile, street, postal_code, city, role, is_active, is_approved, email_verified)
     VALUES (1, ?, ?, 'Frau', 'Vera', 'Verkauf', 'Verkauf GmbH', 'Geschäftsführung',
             '+49 160 4', 'Weg 4', '90004', 'Ort', 'seller', 1, 1, 1)`,
    ['pruef.verkauf@pruefstand.invalid', hash]);
  const verkaeufer = await db.get('SELECT * FROM users WHERE email = ?', ['pruef.verkauf@pruefstand.invalid']);
  const tv = alsNutzer(verkaeufer);

  console.log('\n══ Ein neu angelegtes Mandat ist ein Entwurf ══');
  await db.run('DELETE FROM projects WHERE codename = ?', ['PRUEF_LUMEN']).catch(() => {});
  const neu = await ruf('/api/projects/my-project', {
    token: tv, methode: 'POST',
    koerper: {
      codename: 'PRUEF_LUMEN', industry: 'C27 – Elektrotechnik', region: 'Bayern',
      short_description: 'Erfunden, nur für den Prüfstand.', mandate_type: 'ma',
    },
  });
  ok('es lässt sich anlegen', [200, 201].includes(neu.status), `${neu.status} ${(neu.text || '').slice(0, 160)}`);
  const pid = (await db.get('SELECT id, status FROM projects WHERE codename = ?', ['PRUEF_LUMEN'])).id;
  {
    const p = await db.get('SELECT status FROM projects WHERE id = ?', [pid]);
    ok('und steht auf Entwurf', p.status === 'draft', p.status);

    const markt = await ruf('/api/projects', { token: tv });
    const drin = (markt.daten.projects || []).some((x) => x.codename === 'PRUEF_LUMEN');
    ok('der Marktplatz zeigt es nicht', drin === false);

    const meine = await ruf('/api/projects/my-projects', { token: tv });
    const dabei = (meine.daten || []).some((x) => x.codename === 'PRUEF_LUMEN');
    ok('die eigene Liste schon', dabei === true);
  }

  console.log('\n══ Unvollständiges wird nicht eingereicht ══');
  {
    // Leerer Text statt NULL: Die Spalte laesst kein NULL zu, die Pruefung im
    // Server faengt beides gleichermassen ab.
    await db.run("UPDATE projects SET short_description = '' WHERE id = ?", [pid]);
    const r = await ruf(`/api/projects/${pid}/submit`, { token: tv, methode: 'POST' });
    ok('die Einreichung wird abgewiesen', r.status === 400, String(r.status));
    ok('mit einer Begründung, die die Felder nennt',
      /Beschreibung/.test((r.json && r.json.error) || ''), (r.json && r.json.error) || '');
    await db.run('UPDATE projects SET short_description = ? WHERE id = ?', ['Erfunden, nur für den Prüfstand.', pid]);
  }

  console.log('\n══ Einreichen und veröffentlichen ══');
  {
    const r = await ruf(`/api/projects/${pid}/submit`, { token: tv, methode: 'POST' });
    ok('der Verkäufer kann einreichen', r.status === 200, `${r.status} ${(r.text || '').slice(0, 140)}`);
    const p = await db.get('SELECT status FROM projects WHERE id = ?', [pid]);
    ok('danach steht es auf in Prüfung', p.status === 'in_review', p.status);

    const nochmal = await ruf(`/api/projects/${pid}/submit`, { token: tv, methode: 'POST' });
    ok('zweimal einreichen geht nicht', nochmal.status === 400, String(nochmal.status));

    const pub = await ruf(`/api/admin/projects/${pid}/publish`, { token: tAdmin, methode: 'PUT' });
    ok('die Verwaltung veröffentlicht', pub.status === 200, `${pub.status} ${(pub.text || '').slice(0, 140)}`);
    const p2 = await db.get('SELECT status FROM projects WHERE id = ?', [pid]);
    ok('danach ist es aktiv', p2.status === 'active', p2.status);

    const markt = await ruf('/api/projects', { token: tAdmin });
    ok('und steht auf dem Marktplatz',
      (markt.daten.projects || []).some((x) => x.codename === 'PRUEF_LUMEN'));
  }

  console.log('\n══ Die Oberfläche sagt es auch ══');
  {
    const vk = require('fs').readFileSync(`${__dirname}/../../../client/src/pages/SellerDashboard.jsx`, 'utf8');
    ok('die Entwurfskarte erklärt, warum nichts zu sehen ist', /Noch nicht auf dem Marktplatz/.test(vk));
    ok('der Verkäufer bekommt einen Knopf zum Einreichen', /einreichen\(p\)/.test(vk) && /projects\/\$\{p\.id\}\/submit/.test(vk));
    ok('die Verwaltung einen zum Veröffentlichen', /veroeffentlichen\(p\)/.test(vk) && /admin\/projects\/\$\{p\.id\}\/publish/.test(vk));
    ok('und das Veröffentlichen fragt vorher nach', /vk\.publish_frage/.test(vk));

    const gruss = require('fs').readFileSync(`${__dirname}/../../../client/src/utils/begruessung.js`, 'utf8');
    ok('die Begrüssung kennt Entwürfe', /entwuerfe/.test(gruss));
    const { naechsterSchritt } = require(`${__dirname}/../../../client/src/utils/begruessung.js`);
    if (typeof naechsterSchritt === 'function') {
      ok('mit einem Entwurf sagt sie nicht „eingereicht"',
        !/eingereicht\./.test(naechsterSchritt({ rolle: 'seller', deals: 1, entwuerfe: 1 })),
        naechsterSchritt({ rolle: 'seller', deals: 1, entwuerfe: 1 }));
      ok('und nennt die Zahl, wenn es mehrere sind',
        /2 Mandate/.test(naechsterSchritt({ rolle: 'seller', deals: 3, entwuerfe: 2 })),
        naechsterSchritt({ rolle: 'seller', deals: 3, entwuerfe: 2 }));
      ok('ohne Entwurf bleibt es beim alten Satz',
        /eingereicht/.test(naechsterSchritt({ rolle: 'seller', deals: 2, entwuerfe: 0 })));
    }
  }

  schluss();
})().catch((e) => { console.error('ABBRUCH:', e.message, '\n', (e.stack || '').split('\n').slice(0, 5).join('\n')); process.exit(1); });
