// ─────────────────────────────────────────────────────────────────────────────
// Aus einem Bericht heraus handeln (v0.513)
//
// Zwei Berichte sind seit v0.506 und v0.509 in Betrieb und beide waren
// Sackgassen: Sie nennen einen Fall und lassen den Leser damit allein. Ein
// Bericht, aus dem man nicht handeln kann, wird nach dem zweiten Mal nicht mehr
// geöffnet, und dann nützt die beste Prüfung nichts.
//
// Geprüft wird hier vor allem, was dabei nicht passieren darf:
//
//   · Eine Aufforderung an jemanden, der längst unterschrieben hat.
//   · Ein Stapel, der gepflegte Werte überschreibt.
//   · Ein Stapel auf ein Feld, das dafür nicht vorgesehen ist.
// ─────────────────────────────────────────────────────────────────────────────

const { hochfahren, zaehler } = require('./lauf');

const PORT = 5609;

(async () => {
  const { db, ruf, alsNutzer, mandat, kaeufer } = await hochfahren({ port: PORT });
  const { ok, schluss } = zaehler();

  const admin = await db.get("SELECT * FROM users WHERE role = 'super_admin' ORDER BY id LIMIT 1");
  const tAdmin = alsNutzer(admin);

  const pid = await mandat('PRUEF_HANDELN');
  const ohne = await kaeufer('pruef.handeln@pruefstand.invalid', { vorname: 'Hans', nachname: 'Handeln' });
  await db.run('DELETE FROM interests WHERE project_id = ? AND buyer_id = ?', [pid, ohne.id]).catch(() => {});
  await db.run("INSERT INTO interests (tenant_id, project_id, buyer_id, stage) VALUES (1, ?, ?, 'dataroom_granted')", [pid, ohne.id]);
  await db.run('DELETE FROM nda_requests WHERE project_id = ? AND user_id = ?', [pid, ohne.id]).catch(() => {});

  console.log('\n══ Der Bericht liefert, was zum Handeln noetig ist ══');
  {
    const r = await ruf(`/api/admin/berichte/zugang-ohne-nachweis/${pid}`, { token: tAdmin });
    const p = (((r.daten || {}).mandate || [])[0] || {}).personen || [];
    ok('die Person steht im Bericht', p.length === 1, JSON.stringify(p.map((x) => x.email)));
    ok('mit Mandat und Kennung', p[0] && p[0].project_id === pid && p[0].user_id === ohne.id, JSON.stringify(p[0]));
    ok('und ohne Vorgang, wie erwartet', p[0] && p[0].nda_id === null, String(p[0] && p[0].nda_id));
  }

  console.log('\n══ Anfordern legt den fehlenden Vorgang an ══');
  {
    const r = await ruf('/api/admin/berichte/zugang-ohne-nachweis/anfordern',
      { token: tAdmin, methode: 'POST', koerper: { project_id: pid, user_id: ohne.id } });
    ok('die Anforderung geht durch', r.status === 200, `${r.status} ${(r.text || '').slice(0, 120)}`);
    ok('und meldet, dass der Vorgang neu ist', r.daten && r.daten.neu === true, JSON.stringify(r.daten));

    const nr = await db.get('SELECT * FROM nda_requests WHERE project_id = ? AND user_id = ?', [pid, ohne.id]);
    ok('der Vorgang steht in der Datenbank', !!nr, JSON.stringify(nr && nr.id));
    ok('auf Stand versendet', nr && nr.status === 'sent', String(nr && nr.status));
    ok('mit Zeitpunkt', nr && nr.sent_at !== null);

    // Ein zweites Mal: derselbe Vorgang, nicht ein weiterer.
    const zwei = await ruf('/api/admin/berichte/zugang-ohne-nachweis/anfordern',
      { token: tAdmin, methode: 'POST', koerper: { project_id: pid, user_id: ohne.id } });
    ok('ein zweiter Lauf legt keinen zweiten Vorgang an', zwei.daten && zwei.daten.neu === false, JSON.stringify(zwei.daten));
    const anzahl = await db.get('SELECT count(*)::int AS n FROM nda_requests WHERE project_id = ? AND user_id = ?', [pid, ohne.id]);
    ok('es bleibt bei einem', Number(anzahl.n) === 1, String(anzahl.n));
  }

  console.log('\n══ Wer unterschrieben hat, wird nicht mehr aufgefordert ══');
  {
    await db.run("UPDATE nda_requests SET online_consent_at = now(), status = 'signed' WHERE project_id = ? AND user_id = ?", [pid, ohne.id]);
    const r = await ruf('/api/admin/berichte/zugang-ohne-nachweis/anfordern',
      { token: tAdmin, methode: 'POST', koerper: { project_id: pid, user_id: ohne.id } });
    ok('die Anforderung wird abgewiesen', r.status === 400, String(r.status));
    ok('mit einer Begruendung, die man versteht', /bereits unterschrieben/i.test((r.json && r.json.error) || ''), String(r.json && r.json.error));

    const weg = await ruf(`/api/admin/berichte/zugang-ohne-nachweis/${pid}`, { token: tAdmin });
    ok('und der Fall verschwindet aus dem Bericht', (weg.daten.mandate || []).length === 0, JSON.stringify(weg.daten.mandate));
    await db.run("UPDATE nda_requests SET online_consent_at = NULL, status = 'sent' WHERE project_id = ? AND user_id = ?", [pid, ohne.id]);
  }

  console.log('\n══ Der Stapel fuellt Leerstellen und nichts sonst ══');
  {
    await db.run("DELETE FROM crm_companies WHERE name LIKE 'Pruef Stapel%'").catch(() => {});
    const leer = await db.insert("INSERT INTO crm_companies (tenant_id, name) VALUES (1, 'Pruef Stapel Leer') RETURNING id");
    const voll = await db.insert("INSERT INTO crm_companies (tenant_id, name, region) VALUES (1, 'Pruef Stapel Gepflegt', 'Von Hand') RETURNING id");

    const r = await ruf('/api/admin/berichte/datenluecken/stapel',
      { token: tAdmin, methode: 'POST', koerper: { art: 'firma', feld: 'region', wert: 'Bayern', ids: [leer, voll] } });
    ok('der Stapel laeuft', r.status === 200, `${r.status} ${(r.text || '').slice(0, 120)}`);
    ok('und setzt genau eine Zeile', r.daten && r.daten.gesetzt === 1, JSON.stringify(r.daten));
    ok('die andere wird als uebersprungen gemeldet', r.daten && r.daten.uebersprungen === 1 && !!r.daten.hinweis, JSON.stringify(r.daten));

    const a = await db.get('SELECT region FROM crm_companies WHERE id = ?', [leer]);
    const b = await db.get('SELECT region FROM crm_companies WHERE id = ?', [voll]);
    ok('die leere Zeile traegt den neuen Wert', a.region === 'Bayern', String(a.region));
    ok('die gepflegte bleibt unangetastet', b.region === 'Von Hand', String(b.region));
  }

  console.log('\n══ Der Stapel laesst sich nicht missbrauchen ══');
  {
    const feld = await ruf('/api/admin/berichte/datenluecken/stapel',
      { token: tAdmin, methode: 'POST', koerper: { art: 'firma', feld: 'name', wert: 'X', ids: [1] } });
    ok('ein nicht vorgesehenes Feld wird abgewiesen', feld.status === 400, String(feld.status));

    const art = await ruf('/api/admin/berichte/datenluecken/stapel',
      { token: tAdmin, methode: 'POST', koerper: { art: 'mandat', feld: 'region', wert: 'X', ids: [1] } });
    ok('eine unbekannte Art wird abgewiesen', art.status === 400, String(art.status));

    const leerwert = await ruf('/api/admin/berichte/datenluecken/stapel',
      { token: tAdmin, methode: 'POST', koerper: { art: 'firma', feld: 'region', wert: '  ', ids: [1] } });
    ok('ein leerer Wert loescht nichts', leerwert.status === 400, String(leerwert.status));

    const nix = await ruf('/api/admin/berichte/datenluecken/stapel',
      { token: tAdmin, methode: 'POST', koerper: { art: 'firma', feld: 'region', wert: 'X', ids: [] } });
    ok('ohne Auswahl passiert nichts', nix.status === 400, String(nix.status));

    const zuviel = await ruf('/api/admin/berichte/datenluecken/stapel',
      { token: tAdmin, methode: 'POST', koerper: { art: 'firma', feld: 'region', wert: 'X', ids: Array.from({ length: 501 }, (_, i) => i + 1) } });
    ok('ueber 500 Zeilen auf einmal wird abgewiesen', zuviel.status === 400, String(zuviel.status));
  }

  console.log('\n══ Ein Interessent kommt an beides nicht heran ══');
  {
    const fremd = await kaeufer('pruef.handeln.fremd@pruefstand.invalid', { vorname: 'Mia', nachname: 'Fremd' });
    const t = alsNutzer(fremd);
    const a = await ruf('/api/admin/berichte/zugang-ohne-nachweis/anfordern',
      { token: t, methode: 'POST', koerper: { project_id: pid, user_id: ohne.id } });
    ok('die Anforderung ist gesperrt', a.status === 403, String(a.status));
    const b = await ruf('/api/admin/berichte/datenluecken/stapel',
      { token: t, methode: 'POST', koerper: { art: 'firma', feld: 'region', wert: 'X', ids: [1] } });
    ok('der Stapel ist gesperrt', b.status === 403, String(b.status));
  }

  console.log('\n══ Die Oberflaeche bietet es an ══');
  {
    const quelle = require('fs').readFileSync(`${__dirname}/../../../client/src/pages/Admin.jsx`, 'utf8');
    ok('drei Knoepfe je Zeile des Nachweisberichts', /Vereinbarung anfordern/.test(quelle) && /Dokument hochlegen/.test(quelle) && /Zugang entziehen/.test(quelle));
    ok('die Sammelbearbeitung ist da', /stapelSetzen/.test(quelle) && /Nur leere Felder/.test(quelle));
  }

  schluss();
})().catch((e) => { console.error('ABBRUCH:', e.message, '\n', (e.stack || '').split('\n').slice(0, 5).join('\n')); process.exit(1); });
