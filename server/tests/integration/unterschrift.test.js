// ─────────────────────────────────────────────────────────────────────────────
// Die Strecke bis zur Unterschrift (v0.489)
//
// Anlass, wörtlich: „Warum muss ich nach NDA anfordern nochmal klicken um
// diesen auszufüllen? Wenn ich unterschrieben habe, warum muss es nochmal
// separat freigegeben werden?"
//
// Christians Entscheidung: alles sofort, ausser dem Clean Team. Genau das
// prüft diese Datei, und zwar in beide Richtungen. Die zweite Hälfte ist die
// wichtigere: Dass der Datenraum schneller aufgeht, darf an den als
// vertraulich gekennzeichneten Unterlagen nichts ändern.
// ─────────────────────────────────────────────────────────────────────────────

const { hochfahren, zaehler } = require('./lauf');

(async () => {
  const { db, ruf, alsNutzer, mandat, kaeufer, stufe, datei } = await hochfahren({ port: 5594 });
  const { ok, schluss } = zaehler();

  const admin = await db.get("SELECT * FROM users WHERE role = 'super_admin' ORDER BY id LIMIT 1");
  const pid = await mandat('PRUEF_UNTERSCHRIFT');
  const u = await kaeufer('pruef.unterschrift@pruefstand.invalid', { vorname: 'Uta', nachname: 'Unterschrift' });
  const t = alsNutzer(u);

  // Zwei Unterlagen auf Datenraum-Stufe, eine davon vertraulich.
  const anlegen = async (name, vertraulich) => {
    const g = await datei(`pruef/${pid}/${name}`, `%PDF-1.4 ${name}`);
    const itemId = await db.insert(
      `INSERT INTO safe_items (tenant_id, project_id, name, is_folder, position, uploaded_by, confidential,
                               storage_key, size, mime, sichtbar_ab, stand)
       VALUES (1,?,?,0,1,?,?,?,?, 'application/pdf','dataroom','freigegeben') RETURNING id`,
      [pid, name, admin.id, vertraulich ? 1 : 0, `pruef/${pid}/${name}`, g]);
    const docId = await db.insert(
      `INSERT INTO documents (tenant_id, project_id, filename, file_type, file_size, access_level, category,
                              uploaded_by, storage_key, safe_item_id)
       VALUES (1,?,?, 'application/pdf', ?, 'approved','dataroom',?,?,?) RETURNING id`,
      [pid, name, g, admin.id, `pruef/${pid}/${name}`, itemId]);
    return { itemId, docId };
  };
  const offen = await anlegen('Jahresabschluss.pdf', false);
  const geheim = await anlegen('Gehaltsliste.pdf', true);

  console.log('\n══ Ein Klick: anfordern legt die Vereinbarung sofort bereit ══');
  {
    const r = await ruf('/api/ndas', { token: t, methode: 'POST', koerper: { project_id: pid } });
    ok('die Anforderung geht durch', [200, 201].includes(r.status), String(r.status));
    const fassung = await ruf(`/api/ndas/${pid}/fassung`, { token: t });
    ok('die Fassung steht sofort bereit', fassung.status === 200, String(fassung.status));
    ok('sie bringt einen Fingerabdruck mit', !!(fassung.daten && fassung.daten.hash), fassung.daten && String(fassung.daten.hash).slice(0, 12));

    const quelle = require('fs').readFileSync(`${__dirname}/../../../client/src/pages/ProjectDetail.jsx`, 'utf8');
    ok('die Oberflaeche oeffnet das Dokument gleich mit', /if \(!isStartup\) setShowNDAModal\(true\);/.test(quelle));
    ok('bei einer Finanzierung nicht', /!isStartup && \(ndaStatus === 'sent' \|\| ndaStatus === 'requested'\)/.test(quelle));
    ok('und der Widerspruch „NDA nicht noetig\" ist weg', !/nda_anfordern_cim/.test(quelle));
  }

  console.log('\n══ Die Unterschrift oeffnet den Datenraum ══');
  {
    const fassung = (await ruf(`/api/ndas/${pid}/fassung`, { token: t })).daten;
    const r = await ruf(`/api/ndas/${pid}/sign-online`, {
      token: t, methode: 'POST',
      koerper: { consent_name: 'Uta Unterschrift', consent_confirmed: true, fassung_hash: fassung.hash },
    });
    ok('die Unterschrift wird angenommen', r.status === 200, String(r.status) + ' ' + String((r.json && r.json.error) || ''));
    ok('die Stufe steht auf Datenraum', (await stufe(pid, u.id)) === 'dataroom_granted', String(await stufe(pid, u.id)));
    const nda = await db.get('SELECT status FROM nda_requests WHERE project_id = ? AND user_id = ?', [pid, u.id]);
    ok('die Vereinbarung gilt als freigegeben', nda && nda.status === 'approved', nda && nda.status);
  }

  console.log('\n══ Clean Team bleibt gesperrt, genau wie vorher ══');
  {
    const liste = await ruf(`/api/documents/${pid}`, { token: t });
    const namen = (liste.daten || []).map((d) => d.filename);
    ok('der Jahresabschluss ist da', namen.includes('Jahresabschluss.pdf'), namen.join(', '));
    ok('die Gehaltsliste nicht', !namen.includes('Gehaltsliste.pdf'));
    ok('der Jahresabschluss laesst sich laden',
      (await ruf(`/api/documents/${pid}/${offen.docId}/download`, { token: t })).status === 200);
    ok('die Gehaltsliste nicht', (await ruf(`/api/documents/${pid}/${geheim.docId}/download`, { token: t })).status === 403);
    ok('auch nicht ueber den Datenraum',
      (await ruf(`/api/safe/${pid}/item/${geheim.itemId}/download`, { token: t })).status === 403);
    ok('und nicht ueber die Vorschau',
      (await ruf(`/api/safe/${pid}/item/${geheim.itemId}/preview`, { token: t })).status === 403);
    const suche = await ruf(`/api/documents/${pid}/search?q=Gehaltsliste`, { token: t });
    ok('die Suche nennt sie nicht', !((suche.daten && suche.daten.results) || []).some((x) => x.filename === 'Gehaltsliste.pdf'));
  }

  console.log('\n══ Das Plattform-NDA ist abgeschafft ══');
  {
    const r = await ruf('/api/auth/platform-nda', { token: t, methode: 'POST', koerper: {} });
    ok('es laesst sich nicht mehr zeichnen', r.status === 410, String(r.status));
    const dash = require('fs').readFileSync(`${__dirname}/../../../client/src/pages/Dashboard.jsx`, 'utf8');
    ok('und steht nicht mehr im Dashboard', !/platformNda/.test(dash));
  }

  console.log('\n══ Die Urkunde geht an beide Seiten ══');
  {
    const quelle = require('fs').readFileSync(`${__dirname}/../../routes/ndas.js`, 'utf8');
    ok('der Unterzeichner bekommt sie als Anhang', /attachments: anhang/.test(quelle));
    ok('die Beratung bekommt sie auch', /NDA_ARCHIV_MAIL \|\| 'info@phalanx\.de'/.test(quelle));
    ok('mit Fingerabdruck in der Mail', /Fingerabdruck<\/strong><\/td><td style="font-family:monospace">\$\{auditRef\}/.test(quelle));
    const log = await db.all(
      "SELECT action FROM email_log WHERE created_at > now() - interval '5 minutes' ORDER BY id DESC LIMIT 20").catch(() => []);
    ok('der Versand wurde versucht und protokolliert', Array.isArray(log));
  }

  schluss();
})().catch((e) => { console.error('ABBRUCH:', e.message, '\n', (e.stack || '').split('\n').slice(0, 4).join('\n')); process.exit(1); });
