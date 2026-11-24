// ─────────────────────────────────────────────────────────────────────────────
// Zugang und Unterschrift sind zweierlei (v0.506)
//
// Anlass war eine Mail von Alexander Schmidler, Interessent bei FARADAY:
// „Wenn ich dem Link folge erscheint kurz NDA unterzeichnen aber es schaltet
// kurz darauf um auf Zugang freigeschaltet weil ich bereits unterzeichnet
// hatte. Fehlt jetzt noch etwas?"
//
// Es fehlte die Unterschrift. Sein Datenraum war von Hand geöffnet worden, und
// die Statusabfrage leitete daraus den Unterschriftsstand ab. Elf Stunden
// zuvor hatte Christian ihm geschrieben, die Vereinbarung fehle noch. Beide
// lasen dieselbe Anlage, beide hatten recht.
//
// Geprüft wird hier die Trennung selbst, und vor allem die Stelle, über die es
// passiert ist: der Knopf „Datenraum freigeben" im Kontakt, der bis dahin ohne
// jede Prüfung freigab.
// ─────────────────────────────────────────────────────────────────────────────

const { hochfahren, zaehler } = require('./lauf');

const PORT = 5607;
const BASIS = `http://127.0.0.1:${PORT}`;

async function hochlegen(projectId, token, felder) {
  const fd = new FormData();
  fd.append('datei', new Blob(['%PDF-1.4 NDA'], { type: 'application/pdf' }), 'NDA.pdf');
  Object.entries(felder).forEach(([k, v]) => fd.append(k, String(v)));
  const r = await fetch(`${BASIS}/api/nda-dokumente/${projectId}`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd,
  });
  return { status: r.status, text: await r.text() };
}

const ANGABEN = {
  unterzeichnet_am: '2026-11-20', unterzeichner_name: 'Alex Pruefzeichner',
  partei_firma: 'Pruefzeichner GmbH', partei_sitz: 'Nuernberg',
  partei_register: 'HRB 999, Amtsgericht Nuernberg', herkunft: 'mail',
};

(async () => {
  const { db, ruf, alsNutzer, mandat, kaeufer } = await hochfahren({ port: PORT });
  const { ok, schluss } = zaehler();

  const admin = await db.get("SELECT * FROM users WHERE role = 'super_admin' ORDER BY id LIMIT 1");
  const tAdmin = alsNutzer(admin);
  const nachweis = require(`${__dirname}/../../utils/ndaNachweis`);

  const pid = await mandat('PRUEF_NACHWEIS');
  const ohne = await kaeufer('pruef.ohne@pruefstand.invalid', { vorname: 'Ohne', nachname: 'Unterschrift' });
  const tOhne = alsNutzer(ohne);

  // Ein Interesse anlegen, wie es die Anfrage tut.
  await db.run('DELETE FROM interests WHERE project_id = ? AND buyer_id = ?', [pid, ohne.id]).catch(() => {});
  await db.run("INSERT INTO interests (tenant_id, project_id, buyer_id, stage) VALUES (1, ?, ?, 'requested')", [pid, ohne.id]);

  console.log('\n══ Ohne Unterschrift wird der Datenraum nicht mehr nebenbei geoeffnet ══');
  {
    const r = await ruf(`/api/admin/projects/${pid}/interests/${ohne.id}/grant-dataroom`,
      { token: tAdmin, methode: 'POST', koerper: {} });
    ok('die Freigabe wird abgewiesen', r.status === 409, `${r.status} ${(r.text || '').slice(0, 120)}`);
    ok('mit einem Kennzeichen, an dem die Oberflaeche es erkennt', r.json && r.json.code === 'NACHWEIS_FEHLT', JSON.stringify(r.json && r.json.code));

    const stand = await db.get('SELECT stage FROM interests WHERE project_id = ? AND buyer_id = ?', [pid, ohne.id]);
    ok('und die Stufe hat sich nicht bewegt', stand && stand.stage === 'requested', String(stand && stand.stage));
  }

  console.log('\n══ Die Ausnahme bleibt moeglich, aber sie muss begruendet werden ══');
  {
    const knapp = await ruf(`/api/admin/projects/${pid}/interests/${ohne.id}/grant-dataroom`,
      { token: tAdmin, methode: 'POST', koerper: { ohne_nachweis: true, grund: 'weil' } });
    ok('eine Alibibegruendung reicht nicht', knapp.status === 400, String(knapp.status));

    const mit = await ruf(`/api/admin/projects/${pid}/interests/${ohne.id}/grant-dataroom`,
      { token: tAdmin, methode: 'POST', koerper: { ohne_nachweis: true, grund: 'Vereinbarung liegt dem Mandanten im Original vor, wird nachgereicht.', notify: false } });
    ok('mit einer echten Begruendung geht es', mit.status === 200, `${mit.status} ${(mit.text || '').slice(0, 120)}`);

    // Das Protokoll wird nebenher geschrieben, nicht in der Antwort. Kurz warten.
    await new Promise((r) => setTimeout(r, 400));
    const spur = await db.get(
      "SELECT details FROM audit_logs WHERE action = 'DATAROOM_GRANTED_OHNE_NACHWEIS' ORDER BY id DESC LIMIT 1").catch(() => null);
    ok('die Begruendung steht im Protokoll', spur && /nachgereicht/.test(spur.details || ''), JSON.stringify(spur && (spur.details || '').slice(0, 80)));
  }

  console.log('\n══ Die Ansicht des Interessenten verwechselt beides nicht mehr ══');
  {
    const st = await ruf(`/api/ndas/${pid}/status`, { token: tOhne });
    ok('die Statusabfrage antwortet', st.status === 200, String(st.status));
    ok('der Zugang steht auf Datenraum', st.daten && st.daten.zugang === 'datenraum', JSON.stringify(st.daten && st.daten.zugang));
    ok('der Nachweis fehlt und sagt das auch',
      st.daten && st.daten.nachweis && st.daten.nachweis.belegt === false,
      JSON.stringify(st.daten && st.daten.nachweis));

    const fs = require('fs');
    const seite = fs.readFileSync(`${__dirname}/../../../client/src/pages/ProjectDetail.jsx`, 'utf8');
    ok('die Seite sagt ihm, dass die Vereinbarung fehlt', /Die Vertraulichkeitsvereinbarung fehlt noch/.test(seite));
    ok('und bietet das Unterzeichnen an, auch bei offenem Zugang', /Jetzt unterzeichnen/.test(seite));
  }

  console.log('\n══ Ein hinterlegtes Dokument zaehlt als Nachweis ══');
  {
    await db.run('DELETE FROM crm_contacts WHERE email = ?', ['pruef.ohne@pruefstand.invalid']).catch(() => {});
    const kid = await db.insert(
      `INSERT INTO crm_contacts (tenant_id, first_name, last_name, email, consent_status, contact_status)
       VALUES (1, 'Ohne', 'Unterschrift', ?, 'granted', 'active') RETURNING id`, ['pruef.ohne@pruefstand.invalid']);
    const r = await hochlegen(pid, tAdmin, { ...ANGABEN, contact_id: kid });
    ok('das Dokument wird angenommen', r.status === 201, `${r.status} ${(r.text || '').slice(0, 120)}`);

    const n = await nachweis.nachweisFuer(db, { userId: ohne.id, projectId: pid });
    ok('der Nachweis gilt jetzt als erbracht', n.belegt === true, JSON.stringify(n));
    ok('und nennt die Herkunft', n.art === 'datei', String(n.art));

    const st = await ruf(`/api/ndas/${pid}/status`, { token: tOhne });
    ok('die Ansicht meldet ihn ebenfalls', st.daten && st.daten.nachweis && st.daten.nachweis.belegt === true,
      JSON.stringify(st.daten && st.daten.nachweis));
  }

  console.log('\n══ Der Bericht findet die Faelle und nur die ══');
  {
    // Ein zweiter ohne alles, damit der Bericht etwas zu melden hat.
    const zweiter = await kaeufer('pruef.ohne2@pruefstand.invalid', { vorname: 'Auch', nachname: 'Ohne' });
    await db.run('DELETE FROM interests WHERE project_id = ? AND buyer_id = ?', [pid, zweiter.id]).catch(() => {});
    await db.run("INSERT INTO interests (tenant_id, project_id, buyer_id, stage) VALUES (1, ?, ?, 'dataroom_granted')", [pid, zweiter.id]);

    const r = await ruf(`/api/admin/berichte/zugang-ohne-nachweis/${pid}`, { token: tAdmin });
    ok('der Bericht antwortet', r.status === 200, String(r.status));
    const namen = (((r.daten || {}).mandate || [])[0] || {}).personen || [];
    ok('der ohne alles steht drin', namen.some((p) => p.email === 'pruef.ohne2@pruefstand.invalid'), JSON.stringify(namen.map((p) => p.email)));
    ok('der mit hinterlegtem Dokument steht nicht drin',
      !namen.some((p) => p.email === 'pruef.ohne@pruefstand.invalid'), JSON.stringify(namen.map((p) => p.email)));

    const quelle = require('fs').readFileSync(`${__dirname}/../../../client/src/pages/Admin.jsx`, 'utf8');
    ok('der Bericht ist unter Berichte erreichbar', /Zugang ohne Nachweis/.test(quelle));
  }

  console.log('\n══ Die Kopie geht an die Beratung des Mandats ══');
  {
    const quelle = require('fs').readFileSync(`${__dirname}/../../routes/ndas.js`, 'utf8');
    ok('die Empfaengerliste wird aus dem Mandat gebildet', /project_members WHERE project_id/.test(quelle));
    ok('und das Archiv bleibt zusaetzlich drin', /NDA_ARCHIV_MAIL/.test(quelle));
  }

  schluss();
})().catch((e) => { console.error('ABBRUCH:', e.message, '\n', (e.stack || '').split('\n').slice(0, 5).join('\n')); process.exit(1); });
