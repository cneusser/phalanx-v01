// ─────────────────────────────────────────────────────────────────────────────
// Erfundenes Personal auf der Teststufe (v0.500)
//
// Anlass: Zweimal endete eine Prüfung an derselben Stelle. Die Rechte-Matrix
// aus v0.495 liess sich auf der Teststufe nicht anfassen, weil es dort kein
// Konto mit interner Rolle gibt, und die Übernahme eines Nutzers ins CRM aus
// v0.499 ebenso wenig. Beides musste zum Klicken weitergereicht werden, statt
// geprüft zu werden.
//
// Vier erfundene Konten schliessen die Lücke: Verwaltung, Beratung, Assistenz,
// Analyse. Sie entstehen nur auf der Teststufe.
//
// Geprüft wird hier, dass die Demowelt sie anlegt, dass die Beratung genau
// einem Mandat zugeordnet ist, und dass sich damit die Sperren aus v0.495 und
// der Weg aus v0.499 wirklich durchspielen lassen. Sonst wäre es ein Vorrat an
// Konten ohne Nutzen.
// ─────────────────────────────────────────────────────────────────────────────

const { hochfahren, zaehler } = require('./lauf');

(async () => {
  const { db, ruf, alsNutzer } = await hochfahren({ port: 5604 });
  const { ok, schluss } = zaehler();

  // Die Demowelt laeuft nur auf der Teststufe. Die Stufe gilt hier nur fuer
  // den Aufbau: Bleibt sie stehen, stellt das Einladungstor jede weitere
  // Anfrage ab, und die Pruefung liefe gegen eine verschlossene Tuer.
  const vorherigeStufe = process.env.CM_STUFE;
  process.env.CM_STUFE = 'teststufe';
  const demowelt = require(`${__dirname}/../../scripts/demowelt`);
  const ergebnis = await demowelt.aufsetzen({ db, zuruecksetzen: true, leise: true });
  if (vorherigeStufe === undefined) delete process.env.CM_STUFE;
  else process.env.CM_STUFE = vorherigeStufe;

  console.log('\n══ Die Demowelt legt Personal an ══');
  {
    ok('sie nennt es in ihrer Antwort', Array.isArray(ergebnis.personal) && ergebnis.personal.length === 4,
      JSON.stringify(ergebnis.personal));
    const rollen = (ergebnis.personal || []).map((p) => p.rolle).sort();
    ok('vier Rollen, von Verwaltung bis Analyse',
      JSON.stringify(rollen) === JSON.stringify(['advisor', 'analyst', 'assistant', 'super_admin']),
      JSON.stringify(rollen));

    for (const p of ergebnis.personal) {
      const u = await db.get('SELECT role, is_active, is_approved, email_verified FROM users WHERE email = ?', [p.email]);
      ok(`${p.email} ist angelegt und freigeschaltet`,
        !!u && u.role === p.rolle && Number(u.is_active) === 1 && Number(u.is_approved) === 1,
        JSON.stringify(u));
    }
    ok('alle tragen die erfundene Hausadresse', (ergebnis.personal || []).every((p) => /@demo\.capitalmatch\.invalid$/.test(p.email)));
  }

  console.log('\n══ Die Beratung betreut ein Mandat, nicht alle ══');
  const beratung = await db.get('SELECT * FROM users WHERE email = ?', ['beratung@demo.capitalmatch.invalid']);
  const nordlicht = await db.get('SELECT id FROM projects WHERE codename = ?', ['DEMO_NORDLICHT']);
  const talsohle = await db.get('SELECT id FROM projects WHERE codename = ?', ['DEMO_TALSOHLE']);
  {
    const zu = await db.get('SELECT * FROM project_members WHERE project_id = ? AND user_id = ?', [nordlicht.id, beratung.id]);
    ok('sie ist NORDLICHT zugeordnet', !!zu, zu ? zu.member_role : 'keine Zuordnung');
    const nicht = await db.get('SELECT * FROM project_members WHERE project_id = ? AND user_id = ?', [talsohle.id, beratung.id]);
    ok('und TALSOHLE nicht', !nicht);
  }

  console.log('\n══ Damit lassen sich die Sperren wirklich pruefen ══');
  {
    const tB = alsNutzer(beratung);
    const eigen = await ruf(`/api/admin/projects/${nordlicht.id}`, {
      token: tB, methode: 'PUT', koerper: { short_description: 'von der zustaendigen Beratung' },
    });
    ok('am eigenen Mandat geht es', eigen.status === 200, String(eigen.status));

    const fremd = await ruf(`/api/admin/projects/${talsohle.id}`, {
      token: tB, methode: 'PUT', koerper: { short_description: 'am fremden Mandat' },
    });
    ok('am fremden nicht', fremd.status === 403 && fremd.json.code === 'NICHT_MEIN_MANDAT',
      `${fremd.status} ${(fremd.json && fremd.json.code) || ''}`);

    const analyse = await db.get('SELECT * FROM users WHERE email = ?', ['analyse@demo.capitalmatch.invalid']);
    const tA = alsNutzer(analyse);
    const lesen = await ruf('/api/admin/projects', { token: tA });
    ok('die Analyse darf lesen', lesen.status === 200, String(lesen.status));
    const schreiben = await ruf(`/api/admin/projects/${nordlicht.id}`, {
      token: tA, methode: 'PUT', koerper: { short_description: 'von der Analyse' },
    });
    ok('aber nicht schreiben', schreiben.status === 403, String(schreiben.status));
  }

  console.log('\n══ Und der Weg aus v0.499 ist begehbar ══');
  {
    const verwaltung = await db.get('SELECT * FROM users WHERE email = ?', ['verwaltung@demo.capitalmatch.invalid']);
    const tV = alsNutzer(verwaltung);
    const kaeufer = await db.get('SELECT * FROM users WHERE email = ?', ['anfrage@demo.capitalmatch.invalid']);
    // Aus frueheren Laeufen koennte schon ein Kontakt zu dieser Adresse
    // bestehen. Dann pruefte der Abschnitt nichts mehr.
    const alt = await db.get('SELECT id FROM crm_contacts WHERE lower(email) = lower(?)', [kaeufer.email]);
    if (alt) {
      await db.run('DELETE FROM crm_company_contacts WHERE contact_id = ?', [alt.id]).catch(() => {});
      await db.run('DELETE FROM crm_contacts WHERE id = ?', [alt.id]).catch(() => {});
    }

    const offen = await ruf('/api/crm/konten-ohne-kontakt', { token: tV });
    ok('die Verwaltung sieht die Konten ohne Kontakt', offen.status === 200, String(offen.status));
    ok('die Demo-Interessenten sind darunter',
      (offen.daten || []).some((u) => u.email === 'anfrage@demo.capitalmatch.invalid'),
      JSON.stringify((offen.daten || []).map((u) => u.email)).slice(0, 200));

    const r = await ruf(`/api/crm/contacts/from-user/${kaeufer.id}`, { token: tV, methode: 'POST' });
    ok('die Uebernahme geht durch', r.status === 200 && !!r.daten.id, `${r.status} ${JSON.stringify(r.daten)}`);

    const kontakt = await db.get('SELECT * FROM crm_contacts WHERE id = ?', [r.daten.id]);
    ok('der Kontakt zeigt auf das Konto', !!kontakt && Number(kontakt.user_id) === Number(kaeufer.id),
      kontakt ? String(kontakt.user_id) : 'kein Kontakt');
    const firma = await db.get(
      `SELECT c.name FROM crm_company_contacts cc JOIN crm_companies c ON c.id = cc.company_id
        WHERE cc.contact_id = ? LIMIT 1`, [r.daten.id]);
    ok('und das Unternehmen ist verknuepft', !!firma, firma ? firma.name : 'keines');
  }

  console.log('\n══ Die Teststufe richtet sich beim Start selbst ein (v0.501) ══');
  {
    // Erst leeren, dann den Startvorgang nachspielen. Ohne Stufe darf nichts
    // entstehen, mit Stufe genau einmal.
    process.env.CM_STUFE = 'teststufe';
    await demowelt.raeumen(db, true);
    delete process.env.CM_STUFE;

    await db.demoweltBeimStart();
    const ohne = await db.get("SELECT COUNT(*)::int AS c FROM projects WHERE codename LIKE 'DEMO_%'");
    ok('ohne Teststufe entsteht nichts', ohne.c === 0, String(ohne.c));

    process.env.CM_STUFE = 'teststufe';
    await db.demoweltBeimStart();
    const mit = await db.get("SELECT COUNT(*)::int AS c FROM projects WHERE codename LIKE 'DEMO_%'");
    ok('auf der Teststufe entsteht die Demowelt', mit.c === 4, String(mit.c));
    const konten = await db.get("SELECT COUNT(*)::int AS c FROM users WHERE email LIKE '%@demo.capitalmatch.invalid'");
    ok('samt Konten und Personal', konten.c === 10, String(konten.c));

    await db.demoweltBeimStart();
    const nochmal = await db.get("SELECT COUNT(*)::int AS c FROM projects WHERE codename LIKE 'DEMO_%'");
    ok('ein zweiter Start legt nichts doppelt an', nochmal.c === 4, String(nochmal.c));

    const quelle = require('fs').readFileSync(`${__dirname}/../../db/database.js`, 'utf8');
    ok('der Start ruft sie auf', /await demoweltBeimStart\(\);/.test(quelle));
    ok('und sie prueft die Stufe zuerst', /if \(!stufen\.istTeststufe\(\)\) return;/.test(quelle));
    if (vorherigeStufe === undefined) delete process.env.CM_STUFE;
    else process.env.CM_STUFE = vorherigeStufe;
  }

  console.log('\n══ Die Assistenz ist ebenfalls an ihre Mandate gebunden ══');
  {
    // Aufgefallen auf der Teststufe: v0.495 bindet jede Rolle ausser
    // Verwaltung und Eigentuemer an ihre Mandate, also auch die Assistenz.
    // Das ist so gewollt, stand aber nirgends. Hier steht es.
    process.env.CM_STUFE = 'teststufe';
    await demowelt.aufsetzen({ db, zuruecksetzen: true, leise: true });
    if (vorherigeStufe === undefined) delete process.env.CM_STUFE;
    else process.env.CM_STUFE = vorherigeStufe;

    const assistenz = await db.get('SELECT * FROM users WHERE email = ?', ['assistenz@demo.capitalmatch.invalid']);
    const nl = await db.get('SELECT id FROM projects WHERE codename = ?', ['DEMO_NORDLICHT']);
    const tAs = alsNutzer(assistenz);

    const ohne = await ruf(`/api/admin/projects/${nl.id}`, {
      token: tAs, methode: 'PUT', koerper: { short_description: 'Assistenz ohne Zuordnung' },
    });
    ok('ohne Zuordnung geht nichts', ohne.status === 403 && ohne.json.code === 'NICHT_MEIN_MANDAT',
      `${ohne.status} ${(ohne.json && ohne.json.code) || ''}`);

    await db.run(
      `INSERT INTO project_members (tenant_id, project_id, user_id, member_role)
       VALUES (1, ?, ?, 'editor') ON CONFLICT DO NOTHING`, [nl.id, assistenz.id]);
    const mit = await ruf(`/api/admin/projects/${nl.id}`, {
      token: tAs, methode: 'PUT', koerper: { short_description: 'Assistenz mit Zuordnung' },
    });
    ok('mit Zuordnung pflegt sie', mit.status === 200, String(mit.status));

    const pub = await ruf(`/api/admin/projects/${nl.id}/publish`, { token: tAs, methode: 'PUT' });
    ok('veroeffentlichen bleibt ihr verwehrt', pub.status === 403, String(pub.status));
  }

  console.log('\n══ Das Zuruecksetzen nimmt auch die CRM-Spuren mit ══');
  {
    const kaeufer = await db.get('SELECT * FROM users WHERE email = ?', ['anfrage@demo.capitalmatch.invalid']);
    await db.run(
      `INSERT INTO crm_contacts (tenant_id, first_name, last_name, email, user_id, lead_source)
       VALUES (1, 'Ada', 'Anfrage', ?, ?, 'account')`, [kaeufer.email, kaeufer.id]);
    const vorher = await db.get("SELECT COUNT(*)::int AS c FROM crm_contacts WHERE email LIKE '%@demo.capitalmatch.invalid'");
    ok('ein Demokontakt besteht', vorher.c > 0, String(vorher.c));

    process.env.CM_STUFE = 'teststufe';
    const r = await demowelt.raeumen(db, true);
    if (vorherigeStufe === undefined) delete process.env.CM_STUFE;
    else process.env.CM_STUFE = vorherigeStufe;

    const nachher = await db.get("SELECT COUNT(*)::int AS c FROM crm_contacts WHERE email LIKE '%@demo.capitalmatch.invalid'");
    ok('nach dem Zuruecksetzen ist er weg', nachher.c === 0, String(nachher.c));
    ok('und das Aufraeumen sagt, wie viele es waren', typeof r.kontakte === 'number' && r.kontakte > 0, String(r.kontakte));
  }

  console.log('\n══ Aufraeumen: das Personal verschwindet mit der Demowelt ══');
  {
    process.env.CM_STUFE = 'teststufe';
    await demowelt.raeumen(db, true);
    if (vorherigeStufe === undefined) delete process.env.CM_STUFE;
    else process.env.CM_STUFE = vorherigeStufe;
    const rest = await db.all("SELECT email FROM users WHERE email LIKE '%@demo.capitalmatch.invalid'");
    ok('keine Demokonten mehr da', rest.length === 0, JSON.stringify(rest.map((r) => r.email)));
  }

  schluss();
})().catch((e) => { console.error('ABBRUCH:', e.message, '\n', (e.stack || '').split('\n').slice(0, 5).join('\n')); process.exit(1); });
