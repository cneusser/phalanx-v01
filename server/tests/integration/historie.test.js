// ─────────────────────────────────────────────────────────────────────────────
// Historie in Phalanx OS, Lücken und Vorschläge (v0.509)
//
// Drei Anliegen aus demselben Gespräch, hier zusammen geprüft, weil sie
// zusammen gebaut wurden.
//
//   1. „damit quasi ich jederzeit die Historie komplett auch in Phalanx OS
//      sehe und auch zu welchen Projekten die jeweilige Person sich
//      interessiert hat. Und wichtig wäre mir noch auch zu erkennen, ob das
//      zum Beispiel ein Nachfolgekontakt ist."
//   2. „ich habe zum Beispiel einen Kontakt, die Fabri-Gruppe, da ist aktuell
//      ein Herr Zübert, aber ich habe jetzt noch eine Frau Habrich mit dazu
//      bekommen, die ist eigentlich auch Fabri-Gruppe."
//   3. „Gut wäre natürlich dann auch eine Funktion zu haben, wo ich jederzeit
//      sehe, wo Daten eventuell noch nachgepflegt werden müssen."
//
// Bei allen dreien ist die wichtigste Prüfung nicht, dass etwas passiert,
// sondern dass nichts von selbst passiert: kein Zuordnen, kein Überschreiben,
// keine erfundene Angabe.
// ─────────────────────────────────────────────────────────────────────────────

const { hochfahren, zaehler } = require('./lauf');

const PORT = 5608;

(async () => {
  const { db, ruf, alsNutzer, mandat, kaeufer } = await hochfahren({ port: PORT });
  const { ok, schluss } = zaehler();

  const admin = await db.get("SELECT * FROM users WHERE role = 'super_admin' ORDER BY id LIMIT 1");
  const tAdmin = alsNutzer(admin);
  const stand = require(`${__dirname}/../../sync/standMeldung`);
  const luecken = require(`${__dirname}/../../utils/datenluecken`);
  const vorschlag = require(`${__dirname}/../../utils/firmenvorschlag`);

  console.log('\n══ Die Meldung nennt Rolle, Stufe, Mandate und die Urkunde ══');
  {
    const s = stand.baueStand({
      kontakt: { buyer_type: 'successor' },
      mandate: [
        { project_id: 7, codename: 'FARADAY', funnel_stage: 4, nda_online_am: '2026-11-20T10:00:00Z', datenraum: 1 },
        { project_id: 9, codename: 'LUMEN', funnel_stage: 2 },
      ],
      basis: 'https://www.capitalmatch.de',
    });
    ok('ein Nachfolger wird als solcher gemeldet', s.rolle === 'Nachfolger', String(s.rolle));
    ok('die hoechste Stufe zaehlt', s.stufe === 'Datenraum-Zugang', String(s.stufe));
    ok('beide Mandate stehen drin', s.projekte.length === 2, JSON.stringify(s.projekte.map((p) => p.name)));
    ok('das Mandat mit NDA sagt das auch', /NDA 20\.11\.2026/.test(s.projekte[0].stand), s.projekte[0].stand);
    ok('und der Datenraum steht dabei', /Datenraum offen/.test(s.projekte[0].stand), s.projekte[0].stand);
    ok('die Notiz nennt die Urkunde', /FARADAY: NDA 20\.11\.2026, online unterzeichnet/.test(s.notiz || ''), String(s.notiz));
    ok('die Notiz bleibt unter 500 Zeichen', (s.notiz || '').length <= 500, String((s.notiz || '').length));
  }

  console.log('\n══ Ohne Urkunde keine Notiz, ohne Kaeufertyp keine Rolle ══');
  {
    const s = stand.baueStand({ kontakt: {}, mandate: [{ project_id: 1, codename: 'OHNE', funnel_stage: 0 }] });
    ok('es wird keine Rolle erfunden', s.rolle === null, String(s.rolle));
    ok('und keine Notiz', s.notiz === null, String(s.notiz));
    ok('das Mandat steht trotzdem drin', s.projekte.length === 1 && s.projekte[0].kennung === 'cm-1', JSON.stringify(s.projekte));
  }

  console.log('\n══ Die Meldung aus der Datenbank, am echten Vorgang ══');
  {
    const pid = await mandat('PRUEF_HISTORIE');
    const n = await kaeufer('pruef.historie@pruefstand.invalid', { vorname: 'Nina', nachname: 'Nachfolge' });
    await db.run("UPDATE users SET buyer_type = 'successor' WHERE id = ?", [n.id]).catch(() => {});
    await db.run('DELETE FROM crm_contacts WHERE email = ?', ['pruef.historie@pruefstand.invalid']).catch(() => {});
    const kid = await db.insert(
      `INSERT INTO crm_contacts (tenant_id, first_name, last_name, email, buyer_type, consent_status, contact_status, user_id, pool_contact_id)
       VALUES (1, 'Nina', 'Nachfolge', ?, 'successor', 'opt_in', 'active', ?, '4711') RETURNING id`,
      ['pruef.historie@pruefstand.invalid', n.id]);
    await db.insert(
      `INSERT INTO crm_deal_parties (tenant_id, project_id, contact_id, party_role, funnel_stage)
       VALUES (1, ?, ?, 'buyer', 3) RETURNING id`, [pid, kid]);

    const s = await stand.standFuer(db, kid);
    ok('die Kennung aus dem Pool wird mitgegeben', s && s.pool_contact_id === '4711', JSON.stringify(s && s.pool_contact_id));
    ok('die Rolle steht auf Nachfolger', s.stand.rolle === 'Nachfolger', String(s.stand.rolle));
    ok('das Mandat ist dabei', (s.stand.projekte || []).some((p) => p.name === 'PRUEF_HISTORIE'),
      JSON.stringify(s.stand.projekte));

    // Der Ausgangskorb nimmt beide Arten nebeneinander auf.
    const pool = require(`${__dirname}/../../sync/phalanxpool`);
    await pool.enqueueWriteback(kid, 'kontakt');
    await pool.merkeStand({ contactId: kid });
    const zeilen = await db.all(`SELECT art, status FROM phalanx_pool_outbox WHERE contact_id = ? ORDER BY art`, [kid]);
    ok('zwei Meldungen stehen nebeneinander', zeilen.length === 2, JSON.stringify(zeilen));
    ok('und zwar Kontakt und Stand', zeilen.map((z) => z.art).join(',') === 'kontakt,stand', JSON.stringify(zeilen.map((z) => z.art)));
  }

  console.log('\n══ Ein Kontakt ohne Gegenstueck im Pool wird nicht gesammelt ══');
  {
    await db.run('DELETE FROM crm_contacts WHERE email = ?', ['pruef.ohnepool@pruefstand.invalid']).catch(() => {});
    const kid = await db.insert(
      `INSERT INTO crm_contacts (tenant_id, first_name, last_name, email, consent_status, contact_status)
       VALUES (1, 'Ohne', 'Pool', ?, 'unknown', 'active') RETURNING id`, ['pruef.ohnepool@pruefstand.invalid']);
    const pool = require(`${__dirname}/../../sync/phalanxpool`);
    await pool.merkeStand({ contactId: kid });
    const z = await db.get(`SELECT count(*)::int AS n FROM phalanx_pool_outbox WHERE contact_id = ? AND art = 'stand'`, [kid]);
    ok('nichts im Ausgangskorb', Number(z.n) === 0, String(z.n));
  }

  console.log('\n══ Der Fall Fabri: der Vorschlag kommt, zugeordnet wird nichts ══');
  {
    await db.run("DELETE FROM crm_companies WHERE name = 'Pruef Fabri Gruppe'").catch(() => {});
    const coId = await db.insert(
      `INSERT INTO crm_companies (tenant_id, name, website) VALUES (1, 'Pruef Fabri Gruppe', 'https://www.pruef-fabri.de') RETURNING id`);
    await db.run('DELETE FROM crm_contacts WHERE email IN (?, ?)',
      ['zuebert@pruef-fabri.de', 'habrich@pruef-fabri.de']).catch(() => {});
    const alt = await db.insert(
      `INSERT INTO crm_contacts (tenant_id, first_name, last_name, email, consent_status, contact_status)
       VALUES (1, 'Theo', 'Zuebert', ?, 'opt_in', 'active') RETURNING id`, ['zuebert@pruef-fabri.de']);
    await db.run(`INSERT INTO crm_company_contacts (tenant_id, company_id, contact_id) VALUES (1, ?, ?)`, [coId, alt]);
    const neu = await db.insert(
      `INSERT INTO crm_contacts (tenant_id, first_name, last_name, email, consent_status, contact_status)
       VALUES (1, 'Mara', 'Habrich', ?, 'opt_in', 'active') RETURNING id`, ['habrich@pruef-fabri.de']);

    const r = await ruf(`/api/crm/contacts/${neu}/firmenvorschlag`, { token: tAdmin });
    ok('es gibt einen Vorschlag', r.status === 200 && (r.daten.vorschlaege || []).length > 0, JSON.stringify(r.daten));
    const v = (r.daten.vorschlaege || [])[0];
    ok('und zwar die richtige Firma', v && Number(v.company_id) === Number(coId), JSON.stringify(v));
    ok('mit einem nachvollziehbaren Grund', v && /pruef-fabri\.de/.test(v.grund || ''), String(v && v.grund));

    const noch = await db.get('SELECT count(*)::int AS n FROM crm_company_contacts WHERE contact_id = ?', [neu]);
    ok('zugeordnet wurde nichts', Number(noch.n) === 0, String(noch.n));

    const zugeordnet = await ruf(`/api/crm/contacts/${alt}/firmenvorschlag`, { token: tAdmin });
    ok('wer schon zugeordnet ist, bekommt keinen Vorschlag',
      (zugeordnet.daten.vorschlaege || []).length === 0, JSON.stringify(zugeordnet.daten.vorschlaege));
  }

  console.log('\n══ Freimail-Adressen taugen nicht als Hinweis ══');
  {
    ok('gmx zaehlt nicht', vorschlag.aussagekraeftig('gmx.de') === false);
    ok('eine Firmendomaene schon', vorschlag.aussagekraeftig('pruef-fabri.de') === true);
    ok('die Rechtsform faellt aus dem Namen', vorschlag.kern('Fabri Gruppe GmbH & Co. KG') === 'fabri');
  }

  console.log('\n══ Die Luecken werden gezaehlt und benannt ══');
  {
    const u = await luecken.uebersicht(db, 100);
    ok('die Uebersicht antwortet', u && Array.isArray(u.kontakte) && Array.isArray(u.firmen));

    // Die Anzeige ist gekappt, die Zählung nicht. Eine bestimmte Person findet
    // man über das Suchwort, und genau das soll sie auch tun.
    const gesucht = await luecken.uebersicht(db, 100, 'Habrich');
    ok('Mara Habrich ist ueber die Suche zu finden',
      gesucht.kontakte.some((k) => k.name === 'Mara Habrich' && k.fehlt.includes('Firmenzuordnung')),
      JSON.stringify(gesucht.kontakte.map((k) => k.name)));
    ok('die Zaehlung wird von der Anzeigegrenze nicht beschnitten',
      gesucht.kontakte_gesamt === u.kontakte_gesamt && u.kontakte_gesamt >= u.kontakte.length,
      `${u.kontakte_gesamt} / ${u.kontakte.length}`);
    ok('es wird gezaehlt, was am haeufigsten fehlt', (u.haeufig || []).length > 0, JSON.stringify((u.haeufig || []).slice(0, 3)));

    const r = await ruf('/api/admin/berichte/datenluecken', { token: tAdmin });
    ok('der Bericht ist erreichbar', r.status === 200, String(r.status));
    ok('und nennt die Zahl der fragbaren Personen', typeof r.daten.fragbar === 'number', JSON.stringify(r.daten.fragbar));
  }

  console.log('\n══ Ohne eingerichteten Dienst wird nichts geraten ══');
  {
    const vorher = process.env.ANREICHERUNG_SCHLUESSEL;
    delete process.env.ANREICHERUNG_SCHLUESSEL;
    const co = await db.get("SELECT id FROM crm_companies WHERE name = 'Pruef Fabri Gruppe'");
    const r = await ruf(`/api/crm/companies/${co.id}/vorschlaege`, { token: tAdmin, methode: 'POST', koerper: {} });
    ok('die Anfrage wird abgewiesen', r.status === 503, String(r.status));
    ok('mit einem Kennzeichen', r.json && r.json.code === 'KEIN_DIENST', JSON.stringify(r.json && r.json.code));
    const z = await db.get("SELECT count(*)::int AS n FROM anreicherung_vorschlaege WHERE objekt_id = ?", [co.id]);
    ok('und es steht kein Vorschlag in der Ablage', Number(z.n) === 0, String(z.n));
    if (vorher) process.env.ANREICHERUNG_SCHLUESSEL = vorher;
  }

  console.log('\n══ Ein Vorschlag ueberschreibt nichts Gepflegtes ══');
  {
    const co = await db.get("SELECT id FROM crm_companies WHERE name = 'Pruef Fabri Gruppe'");
    await db.run("UPDATE crm_companies SET sektor = 'Von Hand gepflegt' WHERE id = ?", [co.id]);
    await db.run("DELETE FROM anreicherung_vorschlaege WHERE objekt_id = ?", [co.id]).catch(() => {});
    const vid = await db.insert(
      `INSERT INTO anreicherung_vorschlaege (objekt, objekt_id, feld, wert, quelle, sicherheit)
       VALUES ('firma', ?, 'sektor', 'Maschinell geraten', 'pruefstand', 90) RETURNING id`, [co.id]);

    const r = await ruf(`/api/crm/vorschlaege/${vid}/uebernehmen`, { token: tAdmin, methode: 'POST', koerper: {} });
    ok('die Uebernahme wird abgelehnt', r.status === 400, String(r.status));
    const f = await db.get('SELECT sektor FROM crm_companies WHERE id = ?', [co.id]);
    ok('und das gepflegte Feld steht unveraendert da', f.sektor === 'Von Hand gepflegt', String(f.sektor));

    await db.run("UPDATE crm_companies SET sektor = NULL WHERE id = ?", [co.id]);
    const r2 = await ruf(`/api/crm/vorschlaege/${vid}/uebernehmen`, { token: tAdmin, methode: 'POST', koerper: {} });
    ok('ins leere Feld geht es', r2.status === 200, `${r2.status} ${(r2.text || '').slice(0, 120)}`);
    const f2 = await db.get('SELECT sektor FROM crm_companies WHERE id = ?', [co.id]);
    ok('der Wert steht jetzt drin', f2.sektor === 'Maschinell geraten', String(f2.sektor));
    const v2 = await db.get('SELECT stand, entschieden_von FROM anreicherung_vorschlaege WHERE id = ?', [vid]);
    ok('und der Vorschlag ist als uebernommen vermerkt', v2.stand === 'uebernommen' && v2.entschieden_von === admin.id, JSON.stringify(v2));
  }

  console.log('\n══ Die Telefonnummer laesst sich selbst nachtragen ══');
  {
    const voll = require(`${__dirname}/../../utils/vollstaendigkeit`);
    const ohne = voll.pruefe(
      { name: 'X', sektor: 'a', region: 'b', employees: 3, street: 's', postal_code: '1', city: 'c', country: 'DE' },
      [{ last_name: 'M', responsibility: 'GF', email: 'a@b.de' }]);
    ok('ohne Nummer fehlt sie', ohne.labels.includes('Telefon der Ansprechperson'), JSON.stringify(ohne.labels));
    ok('und sie ist selbst pflegbar', voll.selbstPflegbar(ohne.fehlend).includes('ansprechperson_telefon'),
      JSON.stringify(voll.selbstPflegbar(ohne.fehlend)));
    const mit = voll.pruefe(
      { name: 'X', sektor: 'a', region: 'b', employees: 3, street: 's', postal_code: '1', city: 'c', country: 'DE' },
      [{ last_name: 'M', responsibility: 'GF', email: 'a@b.de', phone: '+49 911 1234567' }]);
    ok('mit Nummer ist alles beisammen', mit.vollstaendig === true, JSON.stringify(mit.labels));

    const seite = require('fs').readFileSync(`${__dirname}/../../../client/src/pages/Stammdaten.jsx`, 'utf8');
    ok('die Pflegeseite fragt danach', /ansprechperson_telefon/.test(seite));
  }

  schluss();
})().catch((e) => { console.error('ABBRUCH:', e.message, '\n', (e.stack || '').split('\n').slice(0, 5).join('\n')); process.exit(1); });
