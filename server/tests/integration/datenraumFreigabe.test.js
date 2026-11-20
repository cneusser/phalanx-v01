// ─────────────────────────────────────────────────────────────────────────────
// Die zwei gemeldeten Fehler, an der laufenden Anlage festgenagelt (v0.481)
//
// Beide stammen aus Christians Meldung und beide waren vorher reproduzierbar:
//
//   1. „Wenn ich den NDA über das Chatfenster freigebe, wird der Datenraum
//      nicht freigeschalten." Der Knopf im Chat gab das Mandat frei, das in der
//      Unterhaltung zuletzt genannt worden war. Wer über zwei Mandate schreibt,
//      gab das falsche frei, die Anlage meldete Erfolg, und der angefragte
//      Datenraum blieb zu. Dazu gab derselbe Knopf auch ohne Unterschrift frei,
//      was die Mandatsroute ausdrücklich verweigert.
//
//   2. „Kunden können Daten abrufen, die eigentlich geschwärzt sein müssten."
//      Eine im Datenraum als vertraulich gekennzeichnete Datei antwortete dort
//      mit 403 und wurde unter „Unterlagen" ausgeliefert, weil dieser zweite
//      Weg nur sein eigenes Kennzeichen kannte.
//
// Diese Prüfung ist nicht die Sicherung gegen eine Nachlässigkeit, sondern
// gegen das Wiederauseinanderlaufen zweier Wege zur selben Entscheidung.
// ─────────────────────────────────────────────────────────────────────────────

const { hochfahren, zaehler } = require('./lauf');

(async () => {
  const { db, ruf, alsNutzer, mandat, kaeufer, stufe, datei } = await hochfahren({ port: 5591 });
  const { ok, schluss } = zaehler();

  const admin = await db.get("SELECT * FROM users WHERE role = 'super_admin' ORDER BY id LIMIT 1");
  const tA = alsNutzer(admin);

  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n══ Zwei Mandate: der Knopf trifft das benannte, nicht das zuletzt genannte ══');
  {
    const pF = await mandat('PRUEF_FARADAY');
    const pL = await mandat('PRUEF_LUMEN');
    const u = await kaeufer('pruef.zwei@pruefstand.invalid');
    await db.run("INSERT INTO nda_requests (tenant_id, project_id, user_id, status) VALUES (1,?,?,'signed')", [pF, u.id]);
    await db.run("INSERT INTO interests (tenant_id, project_id, buyer_id, stage) VALUES (1,?,?,'nda_signed')", [pF, u.id]);
    await db.run("INSERT INTO interests (tenant_id, project_id, buyer_id, stage) VALUES (1,?,?,'requested')", [pL, u.id]);

    const liste = await ruf(`/api/admin/users/${u.id}/datenraum-offen`, { token: tA });
    const e = liste.daten || [];
    const f = e.find((x) => x.codename === 'PRUEF_FARADAY');
    const l = e.find((x) => x.codename === 'PRUEF_LUMEN');
    ok('die Leiste nennt jedes Mandat beim Namen', !!f && !!l, e.map((x) => x.codename).join(', '));
    ok('das unterschriebene ist freigebbar', f && f.moeglich === true);
    ok('das andere nicht, und es sagt warum', l && l.moeglich === false && /unterschrieben/.test(l.hindernis || ''), l && l.hindernis);

    const falsch = await ruf(`/api/admin/projects/${pL}/interests/${u.id}/approve-nda`, { token: tA, methode: 'POST', koerper: {} });
    ok('die Freigabe auf das falsche Mandat wird abgewiesen', falsch.status === 400, String(falsch.status));
    ok('und dieses Mandat bleibt zu', (await stufe(pL, u.id)) === 'requested');

    const richtig = await ruf(`/api/admin/projects/${pF}/interests/${u.id}/approve-nda`, { token: tA, methode: 'POST', koerper: {} });
    ok('die Freigabe auf das richtige geht durch', richtig.status === 200);
    ok('die Antwort nennt das Mandat, das freigegeben wurde', richtig.daten && richtig.daten.codename === 'PRUEF_FARADAY');
    ok('und der Datenraum ist offen', (await stufe(pF, u.id)) === 'dataroom_granted');
  }

  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n══ Ohne Unterschrift keine Freigabe, auf keinem der beiden Wege ══');
  {
    const pid = await mandat('PRUEF_OHNE_UNTERSCHRIFT');
    const u = await kaeufer('pruef.ohne@pruefstand.invalid');
    const ndaId = await db.insert("INSERT INTO nda_requests (tenant_id, project_id, user_id, status) VALUES (1,?,?,'requested') RETURNING id", [pid, u.id]);
    await db.run("INSERT INTO interests (tenant_id, project_id, buyer_id, stage) VALUES (1,?,?,'requested')", [pid, u.id]);

    const ueberChat = await ruf(`/api/admin/projects/${pid}/interests/${u.id}/approve-nda`, { token: tA, methode: 'POST', koerper: {} });
    ok('der Weg über den Chat verweigert', ueberChat.status === 400, String(ueberChat.status));
    const ueberMandat = await ruf(`/api/admin/ndas/${ndaId}/approve`, { token: tA, methode: 'PUT', koerper: {} });
    ok('der Weg über das Mandat verweigert ebenso', ueberMandat.status === 400, String(ueberMandat.status));
    ok('die Stufe bleibt unverändert', (await stufe(pid, u.id)) === 'requested');
  }

  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n══ Die Ausnahme bleibt: Startup-Finanzierung ohne Unterschrift ══');
  {
    const pid = await mandat('PRUEF_FINANZIERUNG', { art: 'fundraising' });
    const u = await kaeufer('pruef.fund@pruefstand.invalid');
    await db.run("INSERT INTO interests (tenant_id, project_id, buyer_id, stage) VALUES (1,?,?,'requested')", [pid, u.id]);
    const r = await ruf(`/api/admin/projects/${pid}/interests/${u.id}/approve-nda`, { token: tA, methode: 'POST', koerper: {} });
    ok('bei Finanzierung ersetzt die ausdrückliche Freigabe die Unterschrift', r.status === 200, String(r.status));
    ok('und der Datenraum ist offen', (await stufe(pid, u.id)) === 'dataroom_granted');
  }

  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n══ Vertraulich gilt in beiden Ablagen, nicht nur im Datenraum ══');
  {
    const pid = await mandat('PRUEF_VERTRAULICH');
    const u = await kaeufer('pruef.vertraulich@pruefstand.invalid');
    await db.run("INSERT INTO nda_requests (tenant_id, project_id, user_id, status) VALUES (1,?,?,'signed')", [pid, u.id]);
    await ruf(`/api/admin/projects/${pid}/interests/${u.id}/approve-nda`, { token: tA, methode: 'POST', koerper: {} });

    const gV = await datei(`pruefstand/${pid}/gehalt.pdf`, '%PDF-1.4 Gehaelter');
    const gO = await datei(`pruefstand/${pid}/offen.pdf`, '%PDF-1.4 Abschluss');
    const anlegen = async (name, vertraulich, key, groesse) => {
      const itemId = await db.insert(
        `INSERT INTO safe_items (tenant_id, project_id, name, is_folder, position, uploaded_by, confidential, storage_key, size, mime, sichtbar_ab, stand)
         VALUES (1,?,?,0,1,?,?,?,?,'application/pdf','dataroom','freigegeben') RETURNING id`,
        [pid, name, admin.id, vertraulich ? 1 : 0, key, groesse]);
      const docId = await db.insert(
        `INSERT INTO documents (tenant_id, project_id, filename, file_type, file_size, access_level, category, uploaded_by, storage_key, safe_item_id)
         VALUES (1,?,?, 'application/pdf',?, 'approved','dataroom',?,?,?) RETURNING id`,
        [pid, name, groesse, admin.id, key, itemId]);
      return { itemId, docId };
    };
    const vertraulich = await anlegen('Gehaltsliste.pdf', true, `pruefstand/${pid}/gehalt.pdf`, gV);
    const offen = await anlegen('Jahresabschluss.pdf', false, `pruefstand/${pid}/offen.pdf`, gO);
    const tK = alsNutzer(u);

    const imDatenraum = await ruf(`/api/safe/${pid}/item/${vertraulich.itemId}/download`, { token: tK });
    ok('der Datenraum sperrt die vertrauliche Datei', imDatenraum.status === 403, String(imDatenraum.status));

    const liste = await ruf(`/api/documents/${pid}`, { token: tK });
    const namen = (liste.daten || []).map((d) => d.filename);
    ok('die Unterlagen-Liste zeigt sie nicht', !namen.includes('Gehaltsliste.pdf'), namen.join(', '));
    ok('das offene Dokument bleibt sichtbar', namen.includes('Jahresabschluss.pdf'));

    const dlV = await ruf(`/api/documents/${pid}/${vertraulich.docId}/download`, { token: tK });
    ok('der Download über die Unterlagen wird abgewiesen', dlV.status === 403, String(dlV.status));
    const dlO = await ruf(`/api/documents/${pid}/${offen.docId}/download`, { token: tK });
    ok('das offene Dokument ist weiter ladbar', dlO.status === 200, String(dlO.status));
    const link = await ruf(`/api/documents/${pid}/${vertraulich.docId}/link`, { token: tK, methode: 'POST', koerper: {} });
    ok('auch der ablaufende Link wird verweigert', link.status === 403, String(link.status));

    const suche = await ruf(`/api/documents/${pid}/search?q=Gehaltsliste`, { token: tK });
    const treffer = ((suche.daten && suche.daten.results) || []).map((d) => d.filename);
    ok('die Suche nennt die vertrauliche Datei nicht', !treffer.includes('Gehaltsliste.pdf'), treffer.join(', ') || 'keine Treffer');

    const alsTeam = await ruf(`/api/documents/${pid}/${vertraulich.docId}/download`, { token: tA });
    ok('das Mandatsteam kommt weiter an das Original', alsTeam.status === 200, String(alsTeam.status));
  }

  schluss();
})().catch((e) => { console.error('ABBRUCH:', e.message); process.exit(1); });
