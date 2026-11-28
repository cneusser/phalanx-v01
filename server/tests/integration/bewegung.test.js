// ─────────────────────────────────────────────────────────────────────────────
// Bewegung wird gemessen (v0.514)
//
// Der Bericht beantwortet eine Frage, die bisher niemand stellen konnte: Wo
// wartet gerade jemand auf uns, und seit wann. Bei FARADAY betrifft das 201
// Kontakte, und genau deshalb muss die Zahl stimmen.
//
// Geprüft wird vor allem, was NICHT in die Liste gehört:
//
//   · Wer abgesagt hat. Der wartet nicht, der ist fertig.
//   · Wer noch auf die Freigabe des Inhabers wartet (Stufe null). Da hängt
//     nicht der Kontakt, da hängen wir, und das ist eine andere Liste.
//   · Wer sich bewegt hat. Eine Antwort von gestern ist Bewegung, auch wenn
//     die Stufe seit Monaten dieselbe ist.
//
// Und bei der Quote: Dass unsere eigene zweite Mail nicht als Reaktion zählt.
// Sonst steigt die Quote, je öfter wir nachfassen, und die Zahl wäre wertlos.
// ─────────────────────────────────────────────────────────────────────────────

const { hochfahren, zaehler } = require('./lauf');

const PORT = 5610;
const TAG = 86400000;
const vorTagen = (n) => new Date(Date.now() - n * TAG).toISOString();

(async () => {
  const { db, ruf, alsNutzer, mandat, kaeufer } = await hochfahren({ port: PORT });
  const { ok, schluss } = zaehler();

  const admin = await db.get("SELECT * FROM users WHERE role = 'super_admin' ORDER BY id LIMIT 1");
  const tAdmin = alsNutzer(admin);

  const pid = await mandat('PRUEF_BEWEGUNG');

  // Vier Fälle, bewusst so gebaut, dass drei davon nicht in die Liste dürfen.
  const faelle = [
    { email: 'pruef.haengt.alt@pruefstand.invalid', name: 'Alt', tage: 120, status: 'open', stufe: 2, drin: true },
    { email: 'pruef.haengt.jung@pruefstand.invalid', name: 'Jung', tage: 3, status: 'open', stufe: 2, drin: false },
    { email: 'pruef.haengt.weg@pruefstand.invalid', name: 'Weg', tage: 200, status: 'dropped', stufe: 2, drin: false },
    { email: 'pruef.haengt.null@pruefstand.invalid', name: 'Null', tage: 200, status: 'open', stufe: 0, drin: false },
  ];

  const kontakte = {};
  for (const f of faelle) {
    const u = await kaeufer(f.email, { vorname: 'Hilde', nachname: f.name });
    await db.run('DELETE FROM crm_contacts WHERE lower(email) = lower(?)', [f.email]).catch(() => {});
    const kid = await db.insert(
      `INSERT INTO crm_contacts (tenant_id, first_name, last_name, email, user_id)
       VALUES (1, 'Hilde', ?, ?, ?) RETURNING id`, [f.name, f.email, u.id]);
    await db.run('DELETE FROM crm_deal_parties WHERE project_id = ? AND contact_id = ?', [pid, kid]).catch(() => {});
    await db.run(
      `INSERT INTO crm_deal_parties (tenant_id, project_id, contact_id, party_role, funnel_stage,
                                     party_status, stage_changed_at, created_at)
       VALUES (1, ?, ?, 'buyer', ?, ?, ?, ?)`,
      [pid, kid, f.stufe, f.status, vorTagen(f.tage), vorTagen(f.tage + 10)]);
    kontakte[f.name] = { kid, uid: u.id };
  }

  console.log('\n══ Der Bericht meldet, was haengt, und nur das ══');
  {
    const r = await ruf('/api/admin/berichte/was-haengt?tage=21', { token: tAdmin });
    ok('der Bericht laeuft', r.status === 200, `${r.status} ${(r.text || '').slice(0, 120)}`);
    const m = ((r.daten || {}).mandate || []).find((x) => x.project_id === pid);
    const namen = ((m || {}).personen || []).map((p) => p.name);
    ok('der alte Fall steht drin', namen.some((n) => /Alt/.test(n)), JSON.stringify(namen));
    ok('der junge Fall nicht', !namen.some((n) => /Jung/.test(n)), JSON.stringify(namen));
    ok('der abgesagte nicht', !namen.some((n) => /Weg/.test(n)), JSON.stringify(namen));
    ok('und der ohne Freigabe auch nicht', !namen.some((n) => /Null/.test(n)), JSON.stringify(namen));

    const alt = (m.personen || []).find((p) => /Alt/.test(p.name));
    ok('die Dauer ist plausibel', alt && alt.tage_ohne_bewegung >= 115 && alt.tage_ohne_bewegung <= 125, String(alt && alt.tage_ohne_bewegung));
    ok('es steht da, was zuletzt geschah', alt && typeof alt.letztes_ereignis === 'string' && alt.letztes_ereignis.length > 3, String(alt && alt.letztes_ereignis));
    ok('und die Akte ist verlinkbar', alt && alt.contact_id === kontakte.Alt.kid, String(alt && alt.contact_id));
  }

  console.log('\n══ Nach Dauer sortiert, nicht nach Namen ══');
  {
    const u = await kaeufer('pruef.haengt.aelter@pruefstand.invalid', { vorname: 'Hilde', nachname: 'Aelter' });
    await db.run('DELETE FROM crm_contacts WHERE lower(email) = lower(?)', [u.email]).catch(() => {});
    const kid = await db.insert(
      `INSERT INTO crm_contacts (tenant_id, first_name, last_name, email, user_id)
       VALUES (1, 'Hilde', 'Aelter', ?, ?) RETURNING id`, [u.email, u.id]);
    await db.run(
      `INSERT INTO crm_deal_parties (tenant_id, project_id, contact_id, party_role, funnel_stage,
                                     party_status, stage_changed_at, created_at)
       VALUES (1, ?, ?, 'buyer', 2, 'open', ?, ?)`, [pid, kid, vorTagen(300), vorTagen(310)]);

    const r = await ruf('/api/admin/berichte/was-haengt?tage=21', { token: tAdmin });
    const m = (r.daten.mandate || []).find((x) => x.project_id === pid);
    const tage = (m.personen || []).map((p) => p.tage_ohne_bewegung);
    ok('die laengste Wartezeit steht oben', tage[0] === Math.max(...tage), JSON.stringify(tage));
    ok('absteigend sortiert', tage.every((t, i) => i === 0 || tage[i - 1] >= t), JSON.stringify(tage));
  }

  console.log('\n══ Eine Antwort ist Bewegung, auch ohne Stufenwechsel ══');
  {
    const { kid } = kontakte.Alt;
    await db.run(
      `INSERT INTO crm_messages (tenant_id, contact_id, project_id, direction, subject, body, sent_at)
       VALUES (1, ?, ?, 'in', 'Rueckfrage', 'Kurze Rueckfrage.', ?)`, [kid, pid, vorTagen(2)]);

    const r = await ruf('/api/admin/berichte/was-haengt?tage=21', { token: tAdmin });
    const m = (r.daten.mandate || []).find((x) => x.project_id === pid);
    const namen = ((m || {}).personen || []).map((p) => p.name);
    ok('der Fall verschwindet aus der Liste', !namen.some((n) => /Alt/.test(n)), JSON.stringify(namen));
  }

  console.log('\n══ Die Quote zaehlt nur, was zurueckkommt ══');
  {
    const { kid } = kontakte.Jung;
    // Drei Ansprachen von uns, auf eine davon kam zwei Tage spaeter eine Antwort.
    for (const t of [40, 30, 20]) {
      await db.run(
        `INSERT INTO email_log (tenant_id, to_email, subject, mail_type, contact_id, project_id, status, created_at)
         VALUES (1, 'pruef.haengt.jung@pruefstand.invalid', 'Ansprache', 'campaign', ?, ?, 'sent', ?)`,
        [kid, pid, vorTagen(t)]);
    }
    await db.run(
      `INSERT INTO crm_messages (tenant_id, contact_id, project_id, direction, subject, body, sent_at)
       VALUES (1, ?, ?, 'in', 'Antwort', 'Interessiert.', ?)`, [kid, pid, vorTagen(28)]);

    const r = await ruf(`/api/admin/kontakte/${kid}/reaktion`, { token: tAdmin });
    ok('die Quote laesst sich abrufen', r.status === 200, `${r.status} ${(r.text || '').slice(0, 120)}`);
    ok('drei Ansprachen gezaehlt', r.daten && r.daten.ansprachen === 3, JSON.stringify(r.daten));
    ok('genau eine Reaktion', r.daten && r.daten.reaktionen === 1, JSON.stringify(r.daten));
    ok('also ein Drittel', r.daten && r.daten.quote === 33, String(r.daten && r.daten.quote));

    // Eine vierte eigene Mail darf die Quote nicht heben.
    await db.run(
      `INSERT INTO email_log (tenant_id, to_email, subject, mail_type, contact_id, project_id, status, created_at)
       VALUES (1, 'pruef.haengt.jung@pruefstand.invalid', 'Nachfassen', 'campaign', ?, ?, 'sent', ?)`,
      [kid, pid, vorTagen(10)]);
    const zwei = await ruf(`/api/admin/kontakte/${kid}/reaktion`, { token: tAdmin });
    ok('eigenes Nachfassen zaehlt nicht als Reaktion', zwei.daten && zwei.daten.reaktionen === 1, JSON.stringify(zwei.daten));
    ok('und die Quote sinkt dadurch', zwei.daten && zwei.daten.quote === 25, String(zwei.daten && zwei.daten.quote));
  }

  console.log('\n══ Ohne Ansprache gibt es keine Quote, nicht null Prozent ══');
  {
    const { kid } = kontakte.Weg;
    const r = await ruf(`/api/admin/kontakte/${kid}/reaktion`, { token: tAdmin });
    ok('die Quote bleibt leer', r.daten && r.daten.quote === null, JSON.stringify(r.daten));
    ok('und sagt es mit null Ansprachen', r.daten && r.daten.ansprachen === 0, JSON.stringify(r.daten));
  }

  console.log('\n══ Ein Interessent kommt an beides nicht heran ══');
  {
    const fremd = await kaeufer('pruef.bewegung.fremd@pruefstand.invalid', { vorname: 'Mia', nachname: 'Fremd' });
    const t = alsNutzer(fremd);
    const a = await ruf('/api/admin/berichte/was-haengt', { token: t });
    ok('der Bericht ist gesperrt', a.status === 403, String(a.status));
    const b = await ruf(`/api/admin/kontakte/${kontakte.Alt.kid}/reaktion`, { token: t });
    ok('die Quote ist gesperrt', b.status === 403, String(b.status));
  }

  console.log('\n══ Die Oberflaeche zeigt es ══');
  {
    const fs = require('fs');
    const admin = fs.readFileSync(`${__dirname}/../../../client/src/pages/Admin.jsx`, 'utf8');
    const drawer = fs.readFileSync(`${__dirname}/../../../client/src/components/ContactDrawer.jsx`, 'utf8');
    ok('die Karte „Was haengt" ist da', /Was hängt/.test(admin) && /was-haengt/.test(admin));
    ok('die Schwelle ist einstellbar', /ohne Bewegung seit/.test(admin));
    ok('die Quote steht am Kontakt', /Reaktionsquote/.test(drawer) && /kontakte\/\$\{contactId\}\/reaktion/.test(drawer));
    ok('und ohne Note', !/schlecht|gut|Ampel|Bewertung/.test((drawer.match(/Reaktionsquote[\s\S]{0,400}/) || [''])[0]));
  }

  schluss();
})().catch((e) => { console.error('ABBRUCH:', e.message, '\n', (e.stack || '').split('\n').slice(0, 5).join('\n')); process.exit(1); });
