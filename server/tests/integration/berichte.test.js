// ─────────────────────────────────────────────────────────────────────────────
// Der Klarnamenbericht hält auch krumme Namen aus, und es wird mitgezählt (v0.503)
//
// Zwei Dinge aus derselben Fassung.
//
// ── Der Bericht ─────────────────────────────────────────────────────────────
//
// Auf der Teststufe antwortete der Klarnamenbericht für zwei von sechs
// Mandaten mit einem Serverfehler, und zwar in gut einer Sekunde, also nicht
// aus Zeitnot, sondern weil etwas warf. Ursache war eine Maskierung, die
// nichts maskierte: eine Ebene Umschreibung zu viel. Ein Kontakt mit einer
// einzelnen Klammer im Namen ergab damit einen ungültigen Ausdruck und riss
// die Prüfung des ganzen Mandats mit. Ein Punkt im Namen blieb „ein beliebiges
// Zeichen", und das sind die Falschmeldungen, die einen Bericht unbrauchbar
// machen.
//
// ── Die Zählung ─────────────────────────────────────────────────────────────
//
// Vorbereitung der Vereinfachung: Welcher Reiter wird geöffnet, von wem, an
// welchem Tag. Nichts vom Inhalt.
// ─────────────────────────────────────────────────────────────────────────────

const { hochfahren, zaehler } = require('./lauf');

(async () => {
  const { db, ruf, alsNutzer, mandat } = await hochfahren({ port: 5605 });
  const { ok, schluss } = zaehler();

  const admin = await db.get("SELECT * FROM users WHERE role = 'super_admin' ORDER BY id LIMIT 1");
  const tAdmin = alsNutzer(admin);
  const klarnamen = require(`${__dirname}/../../utils/klarnamen`);

  console.log('\n══ Namen mit Sonderzeichen werfen nicht mehr ══');
  {
    const krumm = ['Schmidt (Vertrieb', 'Meier GmbH & Co. KG)', 'Krause [Beirat', 'Lang ?', 'Weber *'];
    let geworfen = null;
    for (const n of krumm) {
      try { klarnamen.pruefeText('Ein beliebiger Text ohne Namen.', [n]); }
      catch (e) { geworfen = `${n}: ${e.message}`; }
    }
    ok('keiner der krummen Namen wirft', geworfen === null, String(geworfen));
  }

  console.log('\n══ Der Punkt bleibt ein Punkt ══');
  {
    const treffer = klarnamen.pruefeText('Dr. Ing steht hier', ['Dr. Ing']);
    ok('der echte Name wird gefunden', treffer.length === 1, JSON.stringify(treffer.map((t) => t.treffer)));
    const falsch = klarnamen.pruefeText('Dr: Ing steht hier', ['Dr. Ing']);
    ok('ein anderes Zeichen wird nicht mehr mitgezaehlt', falsch.length === 0, JSON.stringify(falsch.map((t) => t.treffer)));
    ok('die Maskierung selbst stimmt', klarnamen.escapeRegex('a.b(c') === 'a\\.b\\(c', klarnamen.escapeRegex('a.b(c'));
  }

  console.log('\n══ Mehrere Leerzeichen trennen denselben Namen ══');
  {
    const t = klarnamen.pruefeText('Herr Max  Mustermann war da', ['Max Mustermann']);
    ok('der Name wird trotzdem gefunden', t.some((x) => /Max\s+Mustermann/.test(x.treffer)), JSON.stringify(t.map((x) => x.treffer)));
  }

  console.log('\n══ Der Bericht laeuft, auch mit einem krummen Kontakt ══');
  {
    const pid = await mandat('PRUEF_BERICHT');
    await db.run('UPDATE projects SET short_description = ? WHERE id = ?',
      ['Erfunden. Herr Schmidt (Vertrieb ist hier genannt.', pid]);
    await db.run('DELETE FROM crm_contacts WHERE email = ?', ['pruef.krumm@pruefstand.invalid']).catch(() => {});
    const kid = await db.insert(
      `INSERT INTO crm_contacts (tenant_id, first_name, last_name, email, consent_status, contact_status)
       VALUES (1, 'Schmidt', '(Vertrieb', ?, 'unknown', 'active') RETURNING id`,
      ['pruef.krumm@pruefstand.invalid']);
    await db.run(
      `INSERT INTO crm_deal_parties (tenant_id, project_id, contact_id, party_role)
       VALUES (1, ?, ?, 'buyer') ON CONFLICT DO NOTHING`, [pid, kid]).catch(() => {});

    const r = await ruf(`/api/admin/berichte/klarnamen/${pid}`, { token: tAdmin });
    ok('der Bericht antwortet statt abzustuerzen', r.status === 200, `${r.status} ${(r.text || '').slice(0, 160)}`);
    ok('und nennt das Mandat', (r.daten.mandate || []).length === 1, JSON.stringify((r.daten.mandate || []).map((m) => m.codename)));
    ok('ohne gemeldete Probleme', (r.daten.probleme || []).length === 0, JSON.stringify(r.daten.probleme));
  }

  console.log('\n══ Es wird mitgezaehlt, was benutzt wird ══');
  {
    await db.run('DELETE FROM nutzung_bereiche WHERE user_id = ?', [admin.id]).catch(() => {});
    const eins = await ruf('/api/admin/nutzung', { token: tAdmin, methode: 'POST', koerper: { bereich: 'projects' } });
    ok('ein Reiter laesst sich zaehlen', eins.status === 200, String(eins.status));
    await ruf('/api/admin/nutzung', { token: tAdmin, methode: 'POST', koerper: { bereich: 'projects' } });
    await ruf('/api/admin/nutzung', { token: tAdmin, methode: 'POST', koerper: { bereich: 'ndas' } });

    const unsinn = await ruf('/api/admin/nutzung', { token: tAdmin, methode: 'POST', koerper: { bereich: 'etwas-erfundenes' } });
    ok('ein unbekannter Bereich wird abgewiesen', unsinn.status === 400, String(unsinn.status));

    const zeile = await db.get(
      'SELECT anzahl FROM nutzung_bereiche WHERE user_id = ? AND bereich = ? AND tag = CURRENT_DATE', [admin.id, 'projects']);
    ok('zwei Aufrufe stehen als eine Zeile mit Zaehler', zeile && zeile.anzahl === 2, zeile ? String(zeile.anzahl) : 'keine Zeile');

    const aus = await ruf('/api/admin/nutzung?tage=30', { token: tAdmin });
    ok('die Auswertung antwortet', aus.status === 200, String(aus.status));
    const projekte = (aus.daten.zeilen || []).find((z) => z.bereich === 'projects');
    ok('sie nennt die Aufrufe', projekte && projekte.aufrufe === 2, JSON.stringify(projekte));
    ok('und die Zahl der Personen', projekte && projekte.personen === 1, JSON.stringify(projekte));
    ok('nie geoeffnete Reiter stehen gesondert',
      Array.isArray(aus.daten.nie) && aus.daten.nie.includes('multiples') && !aus.daten.nie.includes('projects'),
      JSON.stringify(aus.daten.nie));

    const quelle = require('fs').readFileSync(`${__dirname}/../../../client/src/pages/Admin.jsx`, 'utf8');
    ok('die Oberflaeche zaehlt beim Wechsel mit', /api\.post\('\/admin\/nutzung', \{ bereich: activeTab \}\)/.test(quelle));
    ok('und zeigt die Auswertung unter Berichte', /Benutzte Bereiche/.test(quelle));
  }

  schluss();
})().catch((e) => { console.error('ABBRUCH:', e.message, '\n', (e.stack || '').split('\n').slice(0, 5).join('\n')); process.exit(1); });
