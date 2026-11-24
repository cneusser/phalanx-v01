// ─────────────────────────────────────────────────────────────────────────────
// Ein per Mail unterschriebener NDA wird hinterlegt (v0.504)
//
// Anlass, wörtlich: „da ich aktuell sehr viele NDAs auch über Mail mache,
// möchte ich diese gerne in der Plattform danach ablegen unter dem jeweiligen
// Kontakt … aber um es sauber dokumentiert zu haben, den NDA auch hochladen
// wollen."
//
// Geprüft wird nicht nur, dass das Hochlegen klappt. Geprüft wird vor allem,
// was es verhindert:
//
//   · Ohne Pflichtangaben wird nichts abgelegt. Ein PDF ohne Datum,
//     Unterzeichner und Vertragspartei ist ein Anhang, kein Nachweis.
//   · Ein fremdes Mandat geht niemanden etwas an, auch nicht beim Hochlegen.
//   · Der Unterzeichner kommt an seinen eigenen Vertrag, ein Dritter nicht.
//   · Die Prüfsumme stimmt mit der Datei überein, sonst beweist sie nichts.
// ─────────────────────────────────────────────────────────────────────────────

const crypto = require('crypto');
const { hochfahren, zaehler } = require('./lauf');

const PORT = 5606;
const BASIS = `http://127.0.0.1:${PORT}`;

/** Eine Datei hochlegen, wie der Browser es täte (multipart). */
async function hochlegen(projectId, token, felder, inhalt = '%PDF-1.4 unterschriebener NDA') {
  const fd = new FormData();
  fd.append('datei', new Blob([inhalt], { type: 'application/pdf' }), 'NDA_unterschrieben.pdf');
  Object.entries(felder).forEach(([k, v]) => fd.append(k, String(v)));
  const r = await fetch(`${BASIS}/api/nda-dokumente/${projectId}`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd,
  });
  const text = await r.text();
  let json = null; try { json = JSON.parse(text); } catch { /* egal */ }
  return { status: r.status, json, daten: json && json.data, text };
}

const VOLL = {
  unterzeichnet_am: '2026-11-20',
  unterzeichner_name: 'Dr. Leon Pruefmeyer, Geschaeftsfuehrer',
  partei_firma: 'Pruefmeyer Beteiligungen GmbH',
  partei_sitz: 'Duesseldorf',
  partei_register: 'HRB 12345, Amtsgericht Duesseldorf',
  herkunft: 'mail',
  bemerkung: 'Laufzeit drei Jahre, sonst unveraendert.',
};

(async () => {
  const { db, ruf, alsNutzer, mandat, kaeufer } = await hochfahren({ port: PORT });
  const { ok, schluss } = zaehler();

  const admin = await db.get("SELECT * FROM users WHERE role = 'super_admin' ORDER BY id LIMIT 1");
  const tAdmin = alsNutzer(admin);

  const pid = await mandat('PRUEF_NDADOK');
  const fremd = await mandat('PRUEF_NDADOK_FREMD');

  // Ein Kontakt mit Konto, wie Wiedemeyer: eingeladen, angemeldet, NDA per Mail
  // zurueckgeschickt.
  const nutzer = await kaeufer('pruef.ndadok@pruefstand.invalid', { vorname: 'Leon', nachname: 'Pruefmeyer' });
  await db.run('DELETE FROM crm_contacts WHERE email = ?', ['pruef.ndadok@pruefstand.invalid']).catch(() => {});
  const kid = await db.insert(
    `INSERT INTO crm_contacts (tenant_id, first_name, last_name, email, consent_status, contact_status)
     VALUES (1, 'Leon', 'Pruefmeyer', ?, 'granted', 'active') RETURNING id`,
    ['pruef.ndadok@pruefstand.invalid']);
  const partyId = await db.insert(
    `INSERT INTO crm_deal_parties (tenant_id, project_id, contact_id, party_role, funnel_stage)
     VALUES (1, ?, ?, 'buyer', 3) RETURNING id`, [pid, kid]);

  console.log('\n══ Ohne Pflichtangaben wird nichts abgelegt ══');
  {
    const leer = await hochlegen(pid, tAdmin, { contact_id: kid, party_id: partyId });
    ok('ein Upload ohne Angaben wird abgewiesen', leer.status === 400, String(leer.status));
    ok('und nennt, was fehlt',
      Array.isArray(leer.json && leer.json.fehlende_angaben) && leer.json.fehlende_angaben.length >= 4,
      JSON.stringify(leer.json && leer.json.fehlende_angaben));

    const halb = await hochlegen(pid, tAdmin, { ...VOLL, partei_register: '', contact_id: kid, party_id: partyId });
    ok('eine einzelne fehlende Angabe reicht zum Abweisen', halb.status === 400, String(halb.status));

    const zukunft = await hochlegen(pid, tAdmin, { ...VOLL, unterzeichnet_am: '2099-01-01', contact_id: kid, party_id: partyId });
    ok('ein Datum in der Zukunft wird abgewiesen', zukunft.status === 400, String(zukunft.status));

    const nichts = await db.get('SELECT count(*) AS n FROM nda_dokumente WHERE project_id = ?', [pid]);
    ok('nach drei Fehlversuchen liegt nichts in der Ablage', Number(nichts.n) === 0, String(nichts.n));
  }

  console.log('\n══ Vollstaendig hochgelegt, mit Pruefsumme ══');
  const inhalt = '%PDF-1.4 der echte unterschriebene NDA';
  let dokId = null;
  {
    const r = await hochlegen(pid, tAdmin, { ...VOLL, contact_id: kid, party_id: partyId }, inhalt);
    ok('der Upload wird angenommen', r.status === 201, `${r.status} ${(r.text || '').slice(0, 160)}`);
    dokId = r.daten && r.daten.id;
    ok('die Zeile traegt den Unterzeichner', r.daten && /Pruefmeyer/.test(r.daten.unterzeichner_name || ''), JSON.stringify(r.daten && r.daten.unterzeichner_name));
    ok('das Unterzeichnungsdatum verrutscht nicht', r.daten && r.daten.unterzeichnet_am === '2026-11-20', String(r.daten && r.daten.unterzeichnet_am));
    ok('und die Vertragspartei mit Sitz und Register',
      r.daten && r.daten.partei_sitz === 'Duesseldorf' && /HRB 12345/.test(r.daten.partei_register || ''), JSON.stringify(r.daten));
    ok('die Herkunft steht im Klartext dabei', r.daten && /E-Mail/.test(r.daten.herkunft_text || ''), JSON.stringify(r.daten && r.daten.herkunft_text));
    ok('die Pruefsumme ist die der Datei',
      r.daten && r.daten.pruefsumme === crypto.createHash('sha256').update(Buffer.from(inhalt)).digest('hex'),
      String(r.daten && r.daten.pruefsumme));
    ok('das Konto des Unterzeichners wurde gefunden', r.json && r.json.konto_verknuepft === true, JSON.stringify(r.json && r.json.konto_verknuepft));

    const partei = await db.get('SELECT nda_status FROM crm_deal_parties WHERE id = ?', [partyId]);
    ok('die Ampel steht danach auf unterschrieben', partei && partei.nda_status === 'signed', String(partei && partei.nda_status));
  }

  console.log('\n══ Der Kontakt zeigt sein Mandat samt Nachweis ══');
  {
    // Diese Prüfung gab es nicht, und deshalb fiel erst auf der Teststufe auf,
    // dass die ganze Mandatsliste leer zurückkam: Ein Fragezeichen in einem
    // SQL-Kommentar zählte als vierter Platzhalter bei drei Werten. Ein
    // stummes `catch` machte daraus „keinem Mandat zugeordnet".
    const detail = await ruf(`/api/crm/contacts/${kid}/detail`, { token: tAdmin });
    ok('die Kontaktakte antwortet', detail.status === 200, String(detail.status));
    const zeile = ((detail.daten || {}).deals || []).find((x) => Number(x.project_id) === Number(pid));
    ok('das Mandat steht in der Liste', !!zeile, JSON.stringify(((detail.daten || {}).deals || []).map((x) => x.codename)));
    ok('die Ampel ist dort unterschrieben', zeile && zeile.nda_status === 'signed', JSON.stringify(zeile && zeile.nda_status));
    ok('und der Nachweis wird mitgezaehlt', zeile && Number(zeile.nda_dateien) >= 1, JSON.stringify(zeile && zeile.nda_dateien));
  }

  console.log('\n══ Die Datei liegt nicht im Datenraum ══');
  {
    const imBaum = await db.get(
      "SELECT count(*) AS n FROM safe_items WHERE project_id = ? AND name ILIKE '%NDA%'", [pid]).catch(() => ({ n: 0 }));
    ok('im Datenraum des Mandats ist nichts gelandet', Number(imBaum.n) === 0, String(imBaum.n));
  }

  console.log('\n══ Wer sie abrufen darf ══');
  {
    const alsVerwaltung = await ruf(`/api/nda-dokumente/datei/${dokId}`, { token: tAdmin });
    ok('die Verwaltung bekommt die Datei', alsVerwaltung.status === 200 && alsVerwaltung.text.includes('unterschriebene NDA'),
      `${alsVerwaltung.status} ${alsVerwaltung.laenge}`);

    const alsUnterzeichner = await ruf(`/api/nda-dokumente/datei/${dokId}`, { token: alsNutzer(nutzer) });
    ok('der Unterzeichner bekommt seinen eigenen Vertrag', alsUnterzeichner.status === 200, String(alsUnterzeichner.status));

    const dritter = await kaeufer('pruef.ndadok.fremd@pruefstand.invalid', { vorname: 'Mia', nachname: 'Fremd' });
    const alsDritter = await ruf(`/api/nda-dokumente/datei/${dokId}`, { token: alsNutzer(dritter) });
    ok('ein Dritter bekommt sie nicht', alsDritter.status === 403, String(alsDritter.status));

    const uebersicht = await ruf('/api/nda-dokumente/meine/uebersicht', { token: alsNutzer(nutzer) });
    ok('in seiner Uebersicht steht genau dieses Mandat',
      uebersicht.status === 200 && (uebersicht.daten || []).some((z) => Number(z.project_id) === Number(pid)),
      JSON.stringify((uebersicht.daten || []).map((z) => z.codename)));
    const leerDritter = await ruf('/api/nda-dokumente/meine/uebersicht', { token: alsNutzer(dritter) });
    ok('beim Dritten steht dort nichts', (leerDritter.daten || []).length === 0, JSON.stringify(leerDritter.daten));

    const protokoll = await db.get(
      "SELECT count(*) AS n FROM audit_logs WHERE action IN ('NDA_DOKUMENT_ABGERUFEN', 'NDA_DOKUMENT_EIGENES')").catch(() => ({ n: 0 }));
    ok('jeder Abruf steht im Protokoll', Number(protokoll.n) >= 2, String(protokoll.n));
  }

  console.log('\n══ Eine neue Fassung ersetzt, loescht aber nicht ══');
  {
    const zweite = await hochlegen(pid, tAdmin, { ...VOLL, unterzeichnet_am: '2026-11-22', contact_id: kid, party_id: partyId }, '%PDF-1.4 zweite Fassung');
    ok('die zweite Fassung wird angenommen', zweite.status === 201, String(zweite.status));

    const alt = await db.get('SELECT ersetzt_am, ersetzt_durch FROM nda_dokumente WHERE id = ?', [dokId]);
    ok('die erste ist als ersetzt gekennzeichnet', alt && alt.ersetzt_am !== null, JSON.stringify(alt));
    ok('und zeigt auf die neue', alt && Number(alt.ersetzt_durch) === Number(zweite.daten.id), JSON.stringify(alt));

    const beide = await db.get('SELECT count(*) AS n FROM nda_dokumente WHERE project_id = ?', [pid]);
    ok('beide Fassungen sind noch da', Number(beide.n) === 2, String(beide.n));

    const nochDa = await ruf(`/api/nda-dokumente/datei/${dokId}`, { token: tAdmin });
    ok('die ersetzte Fassung bleibt abrufbar', nochDa.status === 200, String(nochDa.status));
  }

  console.log('\n══ Fremde Mandate und falsche Zuordnungen ══');
  {
    const falschePartei = await hochlegen(fremd, tAdmin, { ...VOLL, contact_id: kid, party_id: partyId });
    ok('eine Zuordnung aus einem anderen Mandat wird abgewiesen', falschePartei.status === 400, String(falschePartei.status));

    const dritter = await db.get('SELECT * FROM users WHERE email = ?', ['pruef.ndadok.fremd@pruefstand.invalid']);
    const ohneRecht = await hochlegen(pid, alsNutzer(dritter), { ...VOLL, contact_id: kid });
    ok('ein Interessent darf nichts hochlegen', ohneRecht.status === 403, String(ohneRecht.status));

    const listeFremd = await ruf(`/api/nda-dokumente/${pid}`, { token: alsNutzer(dritter) });
    ok('und die Liste sieht er auch nicht', listeFremd.status === 403, String(listeFremd.status));
  }

  console.log('\n══ Die Oberflaeche zeigt es an ══');
  {
    const fs = require('fs');
    const drawer = fs.readFileSync(`${__dirname}/../../../client/src/components/ContactDrawer.jsx`, 'utf8');
    ok('das Fenster zum Hochlegen haengt im Kontakt', /<NdaHochlegen/.test(drawer));
    ok('und es ist zu sehen, ob eine Datei dahintersteht', /ohne Datei, nur vermerkt/.test(drawer));
    const seite = fs.readFileSync(`${__dirname}/../../../client/src/pages/ProjectDetail.jsx`, 'utf8');
    ok('der Unterzeichner findet ihn bei seinem Mandat', /nda-dokumente\/datei\//.test(seite));
  }

  schluss();
})().catch((e) => { console.error('ABBRUCH:', e.message, '\n', (e.stack || '').split('\n').slice(0, 5).join('\n')); process.exit(1); });
