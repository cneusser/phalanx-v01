// ─────────────────────────────────────────────────────────────────────────────
// Das Testdrehbuch, von der Maschine durchgespielt (v0.482)
//
// Anlass, wörtlich: „Ich würde gern in einem automatisierten Skript jedes Mal
// von dir auch diese Testing Area einmal komplett durchgespielt haben wollen.
// Ich sage, wir testen einmal die Sicht des Kunden, also sprich des Verkäufers.
// Wir testen die Sicht des Käufers. Wir testen die Neuanlage. Wir testen den
// Abruf von Daten."
//
// Das sind die vier Abschnitte unten, in dieser Reihenfolge und mit diesen
// Namen. Jeder Schritt hat ein erwartetes Ergebnis, und jedes Ergebnis steht
// hier als Behauptung, die zutrifft oder bricht.
//
// Dasselbe Drehbuch gibt es als Liste zum Abhaken in docs/testdrehbuch.md,
// damit Christian oder ein Dritter es von Hand durchgehen kann. Die beiden
// Fassungen folgen denselben Schritten in derselben Ordnung. Wenn eine
// geändert wird, gehört die andere mitgeändert.
//
// Was dieses Drehbuch bewusst NICHT prüft: wie etwas aussieht. Dafür ist der
// Durchgang von Hand da. Hier steht, was die Anlage tut.
// ─────────────────────────────────────────────────────────────────────────────

const { hochfahren, zaehler } = require('./lauf');

(async () => {
  const { db, ruf, alsNutzer, mandat, kaeufer, stufe, datei } = await hochfahren({ port: 5592 });
  const { ok, schluss } = zaehler();

  const admin = await db.get("SELECT * FROM users WHERE role = 'super_admin' ORDER BY id LIMIT 1");
  const tAdmin = alsNutzer(admin);

  // Eine kleine Welt für dieses Drehbuch, unabhängig von der Demowelt.
  const pid = await mandat('DREHBUCH_NORDLICHT');
  const fremd = await mandat('DREHBUCH_FREMD');

  const verkaeufer = await kaeufer('drehbuch.verkaeufer@pruefstand.invalid', { vorname: 'Elke', nachname: 'Verkauf' });
  await db.run("UPDATE users SET role = 'seller' WHERE id = ?", [verkaeufer.id]);
  await db.run('UPDATE projects SET created_by = ? WHERE id = ?', [verkaeufer.id, pid]);

  const nurAnfrage = await kaeufer('drehbuch.anfrage@pruefstand.invalid', { vorname: 'Ada', nachname: 'Anfrage' });
  const gezeichnet = await kaeufer('drehbuch.gezeichnet@pruefstand.invalid', { vorname: 'Cem', nachname: 'Gezeichnet' });
  const imRaum = await kaeufer('drehbuch.datenraum@pruefstand.invalid', { vorname: 'Dana', nachname: 'Datenraum' });

  // Unterlagen auf drei Stufen, eine davon vertraulich.
  const ordner = await db.insert(
    `INSERT INTO safe_items (tenant_id, project_id, parent_id, name, is_folder, position, uploaded_by, sichtbar_ab, stand)
     VALUES (1,?,NULL,'02 Unterlagen',1,1,?, 'public','freigegeben') RETURNING id`, [pid, admin.id]);
  const ablegen = async (name, sichtbarAb, vertraulich) => {
    const groesse = await datei(`drehbuch/${pid}/${name}`, `%PDF-1.4 ${name}`);
    const itemId = await db.insert(
      `INSERT INTO safe_items (tenant_id, project_id, parent_id, name, is_folder, position, uploaded_by,
                               confidential, storage_key, size, mime, sichtbar_ab, stand)
       VALUES (1,?,?,?,0,1,?,?,?,?, 'application/pdf', ?, 'freigegeben') RETURNING id`,
      [pid, ordner, name, admin.id, vertraulich ? 1 : 0, `drehbuch/${pid}/${name}`, groesse, sichtbarAb]);
    const docId = await db.insert(
      `INSERT INTO documents (tenant_id, project_id, filename, file_type, file_size, access_level, category,
                              uploaded_by, storage_key, safe_item_id)
       VALUES (1,?,?, 'application/pdf', ?, ?, ?, ?, ?, ?) RETURNING id`,
      [pid, name, groesse,
        sichtbarAb === 'public' ? 'public' : (sichtbarAb === 'nda' ? 'nda' : 'approved'),
        sichtbarAb === 'public' ? 'teaser' : (sichtbarAb === 'nda' ? 'im' : 'dataroom'),
        admin.id, `drehbuch/${pid}/${name}`, itemId]);
    return { itemId, docId, name };
  };
  const teaser = await ablegen('Teaser.pdf', 'public', false);
  const memo = await ablegen('Memorandum.pdf', 'nda', false);
  const abschluss = await ablegen('Jahresabschluss.pdf', 'dataroom', false);
  const personal = await ablegen('Personalliste.pdf', 'dataroom', true);

  // Stände setzen, wie sie in der Demowelt stehen.
  await db.run("INSERT INTO interests (tenant_id, project_id, buyer_id, stage) VALUES (1,?,?,'requested')", [pid, nurAnfrage.id]);
  await db.run("INSERT INTO nda_requests (tenant_id, project_id, user_id, status) VALUES (1,?,?,'signed')", [pid, gezeichnet.id]);
  await db.run("INSERT INTO interests (tenant_id, project_id, buyer_id, stage) VALUES (1,?,?,'im_granted')", [pid, gezeichnet.id]);
  await db.run("INSERT INTO nda_requests (tenant_id, project_id, user_id, status) VALUES (1,?,?,'signed')", [pid, imRaum.id]);
  await ruf(`/api/admin/projects/${pid}/interests/${imRaum.id}/approve-nda`, { token: tAdmin, methode: 'POST', koerper: {} });

  const tVerkaeufer = alsNutzer(verkaeufer);
  const tAnfrage = alsNutzer(nurAnfrage);
  const tGezeichnet = alsNutzer(gezeichnet);
  const tRaum = alsNutzer(imRaum);

  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n═══ 1. Sicht des Verkäufers ═══');
  {
    const meine = await ruf('/api/projects/my-projects', { token: tVerkaeufer });
    const codes = (meine.daten || []).map((p) => p.codename);
    ok('1.1 der Verkäufer sieht sein Mandat', codes.includes('DREHBUCH_NORDLICHT'), codes.join(', ') || 'keines');
    ok('1.2 und nicht das fremde', !codes.includes('DREHBUCH_FREMD'));

    const eigen = await ruf(`/api/safe/${pid}`, { token: tVerkaeufer });
    ok('1.3 er kommt in seinen Datenraum', eigen.status === 200, String(eigen.status));

    // 1.4 war beim ersten Durchlauf rot, und zwar zu Recht hinterfragt: Der
    // Datenraum eines fremden Mandats antwortet jedem angemeldeten Nutzer mit
    // 200. Das ist seit v0.478 so gewollt, denn seitdem ist das Tor nicht mehr
    // auf oder zu: Wer keine Freigabe hat, sieht die oeffentliche Stufe, also
    // den Teaser, der auch auf dem Marktplatz steht. Die Pruefung lautet
    // deshalb nicht „kein Zugriff", sondern „nichts ueber der oeffentlichen
    // Stufe". Das ist die Aussage, auf die es ankommt.
    const fremderRaum = await ruf(`/api/safe/${fremd}`, { token: tVerkaeufer });
    const fremdeNamen = ((fremderRaum.daten && fremderRaum.daten.items) || []).map((i) => i.name);
    ok('1.4 im fremden Mandat sieht er nur die oeffentliche Stufe',
      fremderRaum.status === 403 || fremdeNamen.every((n) => /teaser/i.test(n)),
      fremdeNamen.join(', ') || 'nichts');
    ok('1.5 und im fremden Datenraum darf er nichts hochladen',
      (await ruf(`/api/safe/${fremd}/folder`, { token: tVerkaeufer, methode: 'POST', koerper: { name: 'Fremdordner' } })).status === 403);

    const dlPersonal = await ruf(`/api/safe/${pid}/item/${personal.itemId}/download`, { token: tVerkaeufer });
    ok('1.6 am eigenen Mandat sieht er auch das Vertrauliche', dlPersonal.status === 200, String(dlPersonal.status));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n═══ 2. Sicht des Käufers ═══');
  {
    const offen = await ruf('/api/projects');
    const marktplatz = (offen.daten && offen.daten.projects) || [];
    const eintrag = marktplatz.find((p) => p.codename === 'DREHBUCH_NORDLICHT');
    ok('2.1 das Mandat steht ohne Anmeldung auf dem Marktplatz', !!eintrag);
    if (eintrag) {
      const roh = JSON.stringify(eintrag);
      ok('2.2 dort steht eine Spanne und keine Einzelzahl', /Mio\. EUR|k\. A\./.test(String(eintrag.revenue_band || '')), String(eintrag.revenue_band));
      ok('2.3 und kein Klarname der Gesellschaft', !/GmbH|AG|KG/.test(roh.replace(/DREHBUCH_\w+/g, '')));
    }

    // 2.4 war beim ersten Durchlauf rot und ist dann zweimal umgeschrieben
    // worden, weil die Erwartung falsch war und nicht die Anlage. Der Reihe
    // nach: Erst scheiterte es am vollstaendigen Profil (neun Pflichtfelder,
    // bevor ein Interessent ein Mandat ansehen darf), dann an der Sache
    // selbst. Die Detailseite eines Mandats verlangt die unterschriebene
    // Vereinbarung, und zwar nicht die Unterschrift allein, sondern die
    // Datenraum-Freigabe (Gate „details"). Wer nur angefragt hat, bekommt den
    // Teaser. Wer unterschrieben hat, bekommt Teaser und Memorandum, aber die
    // Detailseite mit Finanzen und Team erst nach der Freigabe. Das ist so
    // gewollt. Beides steht als Beobachtung in docs/testdrehbuch.md, denn die
    // neun Pflichtfelder und diese Stufung sind Themen fuer die Vereinfachung.
    const teaserAnfrage = await ruf(`/api/projects/${pid}/teaser`, { token: tAnfrage });
    ok('2.4 wer nur angefragt hat, sieht den Teaser', teaserAnfrage.status === 200, String(teaserAnfrage.status));
    const detailAnfrage = await ruf(`/api/projects/${pid}`, { token: tAnfrage });
    ok('2.4a die Detailseite bleibt zu', detailAnfrage.status === 403, String(detailAnfrage.status));
    ok('2.4b auch nach der Unterschrift noch',
      (await ruf(`/api/projects/${pid}`, { token: tGezeichnet })).status === 403);
    ok('2.4c erst mit der Datenraum-Freigabe ist sie offen',
      (await ruf(`/api/projects/${pid}`, { token: tRaum })).status === 200);
    // Wie bei 1.4: Seit v0.478 ist das Tor nicht auf oder zu. Wer nur
    // angefragt hat, sieht die oeffentliche Stufe. Geprueft wird deshalb, dass
    // er nichts darueber sieht.
    const raumAnfrage = await ruf(`/api/safe/${pid}?parent_id=${ordner}`, { token: tAnfrage });
    const sichtbarA = ((raumAnfrage.daten && raumAnfrage.daten.items) || []).map((i) => i.name);
    ok('2.5 aber vom Datenraum nur die oeffentliche Stufe',
      sichtbarA.every((n) => /teaser/i.test(n)), sichtbarA.join(', ') || 'nichts');
    // Die Liste allein genuegt nicht als Nachweis. Geprueft wird der Abruf,
    // denn daran hing der Fehler: Die Stufe fiel auf „dataroom" zurueck, und
    // damit war nicht nur die Liste voll, sondern auch der Download offen.
    ok('2.5a und er laedt das Memorandum nicht',
      (await ruf(`/api/safe/${pid}/item/${memo.itemId}/download`, { token: tAnfrage })).status === 403);
    ok('2.5b und den Jahresabschluss nicht',
      (await ruf(`/api/safe/${pid}/item/${abschluss.itemId}/download`, { token: tAnfrage })).status === 403);
    ok('2.5c auch die Vorschau nicht',
      (await ruf(`/api/safe/${pid}/item/${abschluss.itemId}/preview`, { token: tAnfrage })).status === 403);

    const raumGezeichnet = await ruf(`/api/safe/${pid}`, { token: tGezeichnet });
    const sichtbarG = ((raumGezeichnet.daten && raumGezeichnet.daten.items) || []).map((i) => i.name);
    ok('2.6 wer unterschrieben hat, sieht noch nicht die Datenraum-Stufe', !sichtbarG.includes('Jahresabschluss.pdf'), sichtbarG.join(', ') || 'nichts');
    ok('2.6a aber das Memorandum schon',
      (await ruf(`/api/safe/${pid}/item/${memo.itemId}/download`, { token: tGezeichnet })).status === 200);
    ok('2.6b und den Jahresabschluss nicht',
      (await ruf(`/api/safe/${pid}/item/${abschluss.itemId}/download`, { token: tGezeichnet })).status === 403);

    const raumFrei = await ruf(`/api/safe/${pid}?parent_id=${ordner}`, { token: tRaum });
    const sichtbarR = ((raumFrei.daten && raumFrei.daten.items) || []).map((i) => i.name);
    ok('2.7 wer freigegeben ist, sieht den Jahresabschluss', sichtbarR.includes('Jahresabschluss.pdf'), sichtbarR.join(', '));
    const personalEintrag = ((raumFrei.daten && raumFrei.daten.items) || []).find((i) => i.name === 'Personalliste.pdf');
    ok('2.8 die vertrauliche Liste erscheint nur als gesperrter Eintrag',
      !personalEintrag || personalEintrag.gesperrt === true,
      personalEintrag ? `gesperrt=${personalEintrag.gesperrt}` : 'gar nicht sichtbar');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n═══ 3. Neuanlage ═══');
  {
    await db.run("DELETE FROM projects WHERE codename = 'DREHBUCH_NEU'").catch(() => {});
    const neu = await ruf('/api/admin/projects', {
      token: tAdmin, methode: 'POST',
      koerper: {
        codename: 'DREHBUCH_NEU', mandate_type: 'ma', industry: 'C28 – Maschinenbau',
        region: 'Hessen', revenue_band: '10 bis 25 Mio. EUR', ebitda_band: '1 bis 2,5 Mio. EUR',
        deal_type: 'Nachfolge', short_description: 'Erfunden, nur für das Drehbuch.',
        highlights: ['Auftragsbestand lang'], status: 'active',
      },
    });
    ok('3.1 ein neues Mandat lässt sich anlegen', [200, 201].includes(neu.status), String(neu.status) + ' ' + String((neu.json && neu.json.error) || ''));
    const angelegt = await db.get("SELECT id, status FROM projects WHERE codename = 'DREHBUCH_NEU'");
    ok('3.2 es steht in der Datenbank', !!angelegt);
    if (angelegt) {
      const aufDemMarkt = await ruf('/api/projects');
      ok('3.3 und erscheint auf dem Marktplatz',
        (((aufDemMarkt.daten && aufDemMarkt.daten.projects) || []).some((p) => p.codename === 'DREHBUCH_NEU')));
      const struktur = await ruf(`/api/safe/${angelegt.id}/standard-struktur`, { token: tAdmin, methode: 'POST', koerper: { anwenden: true } });
      ok('3.4 die Standardgliederung des Datenraums lässt sich anlegen', struktur.status === 200, String(struktur.status));
      const baum = await ruf(`/api/safe/${angelegt.id}`, { token: tAdmin });
      ok('3.5 und steht dann im Datenraum', ((baum.daten && baum.daten.items) || []).length > 0,
        String(((baum.daten && baum.daten.items) || []).length) + ' Einträge');
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n═══ 4. Abruf von Daten ═══');
  {
    const abrufen = async (token, docId) => (await ruf(`/api/documents/${pid}/${docId}/download`, { token })).status;

    ok('4.1 der Teaser ist ab Anfrage ladbar', await abrufen(tAnfrage, teaser.docId) === 200);
    ok('4.2 das Memorandum nicht', await abrufen(tAnfrage, memo.docId) === 403);
    ok('4.3 nach Unterschrift schon', await abrufen(tGezeichnet, memo.docId) === 200);
    ok('4.4 der Jahresabschluss erst nach Datenraum-Freigabe', await abrufen(tGezeichnet, abschluss.docId) === 403);
    ok('4.5 mit Freigabe dann ja', await abrufen(tRaum, abschluss.docId) === 200);
    ok('4.6 die vertrauliche Liste nie, auch nicht mit Freigabe', await abrufen(tRaum, personal.docId) === 403);
    ok('4.7 auch nicht über den Datenraum', (await ruf(`/api/safe/${pid}/item/${personal.itemId}/download`, { token: tRaum })).status === 403);
    ok('4.8 auch nicht über die Vorschau', (await ruf(`/api/safe/${pid}/item/${personal.itemId}/preview`, { token: tRaum })).status === 403);

    const zip = await ruf(`/api/safe/${pid}/folder/${ordner}/zip`, { token: tRaum });
    ok('4.9 das Archiv eines Ordners lässt sich ziehen', zip.status === 200, String(zip.status));
    if (zip.status === 200) {
      ok('4.10 und die vertrauliche Liste liegt nicht darin', !/Personalliste/.test(zip.text), 'Dateiname im Archiv gefunden');
    }

    // Ein erfolgreicher Abruf ueber den Datenraum, damit das Zugriffsprotokoll
    // etwas zu schreiben hat. Die Abrufe oben liefen ueber die Unterlagen und
    // landen im Pruefpfad, nicht im Datenraum-Protokoll.
    const offenerAbruf = await ruf(`/api/safe/${pid}/item/${abschluss.itemId}/download`, { token: tRaum });
    ok('4.10a der Jahresabschluss ist auch im Datenraum ladbar', offenerAbruf.status === 200, String(offenerAbruf.status));

    const protokoll = await db.all(
      `SELECT action, item_id FROM safe_access_log WHERE project_id = ? AND user_id = ?`, [pid, imRaum.id]);
    ok('4.11 jeder Abruf steht im Zugriffsprotokoll', protokoll.length > 0, `${protokoll.length} Einträge`);
    ok('4.12 und kein Eintrag betrifft die vertrauliche Liste',
      !protokoll.some((p) => Number(p.item_id) === Number(personal.itemId)));

    const bericht = await ruf(`/api/safe/${pid}/access-report`, { token: tAdmin });
    ok('4.13 der Zugriffsbericht ist für das Mandatsteam lesbar', bericht.status === 200, String(bericht.status));
    const berichtAlsKaeufer = await ruf(`/api/safe/${pid}/access-report`, { token: tRaum });
    ok('4.14 und für den Interessenten nicht', berichtAlsKaeufer.status === 403, String(berichtAlsKaeufer.status));
  }

  schluss();
})().catch((e) => { console.error('ABBRUCH:', e.message, '\n', (e.stack || '').split('\n').slice(0, 4).join('\n')); process.exit(1); });
