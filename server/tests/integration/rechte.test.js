// ─────────────────────────────────────────────────────────────────────────────
// Rechte, Mandatsbindung und der Datenraum-Upload (v0.495)
//
// Anlass: die Sicherheitsdurchsicht. Drei Befunde, alle drei hier festgenagelt.
//
//   1. Die Wache isAdmin prüfte nur „ist intern" und liess damit die Rolle
//      „Analyst (nur lesen)" Mandate löschen, Datenräume freigeben und
//      Vereinbarungen bewilligen. An 39 der 49 schreibenden Routen stand
//      ausser isAdmin nichts.
//   2. utils/projectAccess.js gab jedem Berater für jedes Mandat „manager".
//      Eine Zeile, und jede Vertraulichkeitszusage gegenüber einem Mandanten
//      war nur noch organisatorisch gedeckt.
//   3. Der Datenraum nahm jede Datei an und lieferte sie mit dem behaupteten
//      Typ aus, die Vorschau sogar immer inline.
//
// Geprüft wird jeweils beides: dass das Falsche abgewiesen wird UND dass das
// Richtige weiterhin durchgeht. Eine Sperre, die auch die eigene Arbeit sperrt,
// wäre keine Verbesserung.
// ─────────────────────────────────────────────────────────────────────────────

const { hochfahren, zaehler } = require('./lauf');

(async () => {
  const { db, ruf, alsNutzer, mandat } = await hochfahren({ port: 5599 });
  const { ok, schluss } = zaehler();

  const bcrypt = require(`${__dirname}/../../node_modules/bcryptjs`);
  const hash = await bcrypt.hash('Pruefstand!2026', 10);
  const konto = async (email, rolle) => {
    await db.run('DELETE FROM users WHERE email = ?', [email]).catch(() => {});
    await db.run(
      `INSERT INTO users (tenant_id, email, password_hash, salutation, first_name, last_name, company, position,
                          mobile, street, postal_code, city, role, is_active, is_approved, email_verified)
       VALUES (1, ?, ?, 'Frau', 'Rolle', ?, 'Phalanx GmbH', 'Mitarbeit', '+49 160 5', 'Weg 5', '90005', 'Ort', ?, 1, 1, 1)`,
      [email, hash, rolle, rolle]);
    return db.get('SELECT * FROM users WHERE email = ?', [email]);
  };

  const admin = await db.get("SELECT * FROM users WHERE role = 'super_admin' ORDER BY id LIMIT 1");
  const tAdmin = alsNutzer(admin);
  const analyst = await konto('pruef.analyst@pruefstand.invalid', 'analyst');
  const assistenz = await konto('pruef.assistenz@pruefstand.invalid', 'assistant');
  const beraterA = await konto('pruef.berater.a@pruefstand.invalid', 'advisor');
  const beraterB = await konto('pruef.berater.b@pruefstand.invalid', 'advisor');
  const tAnalyst = alsNutzer(analyst);
  const tAssistenz = alsNutzer(assistenz);
  const tA = alsNutzer(beraterA);
  const tB = alsNutzer(beraterB);

  const pid = await mandat('PRUEF_RECHTE');
  // Mandat A gehört Berater A, Mandat B niemandem von beiden.
  await db.run('UPDATE projects SET created_by = ? WHERE id = ?', [beraterA.id, pid]);
  const pidFremd = await mandat('PRUEF_RECHTE_FREMD');
  await db.run('UPDATE projects SET created_by = ? WHERE id = ?', [admin.id, pidFremd]);
  await db.run('DELETE FROM project_members WHERE project_id IN (?, ?)', [pid, pidFremd]).catch(() => {});

  console.log('\n══ Die Rechte-Matrix gilt beim Schreiben ══');
  {
    const r = await ruf(`/api/admin/projects/${pid}`, {
      token: tAnalyst, methode: 'PUT', koerper: { short_description: 'vom Analysten' },
    });
    ok('ein Analyst darf ein Mandat nicht mehr ändern', r.status === 403, String(r.status));
    ok('die Meldung nennt die Rolle', /Analyst|Berechtigung/.test((r.json && r.json.error) || ''), (r.json && r.json.error) || '');

    const l = await ruf(`/api/admin/projects/${pid}`, { token: tAnalyst, methode: 'DELETE' });
    ok('und ein Mandat schon gar nicht löschen', l.status === 403, String(l.status));

    const frei = await ruf(`/api/admin/projects/${pid}/interests/${analyst.id}/grant-dataroom`, { token: tAnalyst, methode: 'POST' });
    ok('und keinen Datenraum freigeben', frei.status === 403, String(frei.status));

    const lesen = await ruf('/api/admin/projects', { token: tAnalyst });
    ok('lesen darf er weiterhin', lesen.status === 200, String(lesen.status));

    const pub = await ruf(`/api/admin/projects/${pid}/publish`, { token: tAssistenz, methode: 'PUT' });
    ok('die Assistenz darf nicht veröffentlichen', pub.status === 403, String(pub.status));

    const loeschen = await ruf(`/api/admin/projects/${pid}`, { token: tA, methode: 'DELETE' });
    ok('auch die Beratung löscht keine Mandate mehr', loeschen.status === 403, String(loeschen.status));
  }

  console.log('\n══ Die Beratung arbeitet nur an ihren Mandaten ══');
  {
    const eigen = await ruf(`/api/admin/projects/${pid}`, {
      token: tA, methode: 'PUT', koerper: { short_description: 'vom zuständigen Berater' },
    });
    ok('am eigenen Mandat geht alles wie bisher', eigen.status === 200, `${eigen.status} ${(eigen.text || '').slice(0, 120)}`);

    const fremd = await ruf(`/api/admin/projects/${pidFremd}`, {
      token: tA, methode: 'PUT', koerper: { short_description: 'am fremden Mandat' },
    });
    ok('am fremden Mandat nicht', fremd.status === 403 && fremd.json.code === 'NICHT_MEIN_MANDAT',
      `${fremd.status} ${(fremd.json && fremd.json.code) || ''}`);
    ok('die Meldung sagt, wie es weitergeht', /zugeordnet/.test((fremd.json && fremd.json.error) || ''), (fremd.json && fremd.json.error) || '');

    const fremdFrei = await ruf(`/api/admin/projects/${pidFremd}/interests/${beraterB.id}/grant-dataroom`, { token: tA, methode: 'POST' });
    ok('ein fremder Datenraum lässt sich nicht freigeben', fremdFrei.status === 403, String(fremdFrei.status));

    const fremdSafe = await ruf(`/api/safe/${pidFremd}/folder`, { token: tA, methode: 'POST', koerper: { name: 'Fremd' } });
    ok('im fremden Datenraum entsteht kein Ordner', [403, 404].includes(fremdSafe.status), String(fremdSafe.status));

    const eigenSafe = await ruf(`/api/safe/${pid}/folder`, { token: tA, methode: 'POST', koerper: { name: 'Eigen' } });
    ok('im eigenen schon', [200, 201].includes(eigenSafe.status), `${eigenSafe.status} ${(eigenSafe.text || '').slice(0, 120)}`);

    const fremdDok = await ruf(`/api/documents/${pidFremd}/1`, { token: tA, methode: 'DELETE' });
    ok('fremde Unterlagen lassen sich nicht löschen', fremdDok.status === 403, String(fremdDok.status));

    // Nach Zuordnung geht es, das ist der vorgesehene Weg.
    await ruf(`/api/admin/projects/${pidFremd}/members`, {
      token: tAdmin, methode: 'POST', koerper: { user_id: beraterA.id, member_role: 'editor' },
    });
    const nachZuordnung = await ruf(`/api/admin/projects/${pidFremd}`, {
      token: tA, methode: 'PUT', koerper: { short_description: 'jetzt zugeordnet' },
    });
    ok('nach der Zuordnung geht es', nachZuordnung.status === 200, String(nachZuordnung.status));

    const adminFremd = await ruf(`/api/admin/projects/${pidFremd}`, {
      token: tAdmin, methode: 'PUT', koerper: { short_description: 'von der Verwaltung' },
    });
    ok('die Verwaltung kommt überall hin, wie bisher', adminFremd.status === 200, String(adminFremd.status));
  }

  console.log('\n══ Der Datenraum nimmt nicht mehr alles ══');
  {
    const dateitypen = require(`${__dirname}/../../utils/dateitypen`);
    ok('HTML kommt nicht herein', dateitypen.pruefen('seite.html', 'text/html').ok === false);
    ok('SVG auch nicht', dateitypen.pruefen('bild.svg', 'image/svg+xml').ok === false);
    ok('eine .html mit behauptetem PDF-Typ auch nicht', dateitypen.pruefen('tarnung.pdf.html', 'application/pdf').ok === false);
    ok('eine .pdf mit behauptetem HTML-Typ auch nicht', dateitypen.pruefen('echt.pdf', 'text/html').ok === false);
    ok('eine echte PDF schon', dateitypen.pruefen('bericht.pdf', 'application/pdf').ok === true);
    ok('eine Tabelle auch', dateitypen.pruefen('zahlen.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet').ok === true);
    ok('ein Browser ohne Typangabe scheitert nicht an der Endung', dateitypen.pruefen('foto.png', '').ok === true);

    ok('Altbestand mit HTML wird heruntergeladen statt angezeigt',
      dateitypen.auslieferung('alt.html', 'text/html', true).disposition === 'attachment');
    ok('und mit unverfänglichem Typ ausgeliefert',
      dateitypen.auslieferung('alt.html', 'text/html', true).mime === 'application/octet-stream');
    ok('eine PDF darf weiterhin in der Vorschau erscheinen',
      dateitypen.auslieferung('bericht.pdf', 'application/pdf', true).disposition === 'inline');
    ok('eine Tabelle nicht', dateitypen.auslieferung('zahlen.xlsx', 'x', true).disposition === 'attachment');

    const quelle = require('fs').readFileSync(`${__dirname}/../../routes/safe.js`, 'utf8');
    ok('der Datenraum benutzt den Filter', /fileFilter: dateitypen\.multerFilter/.test(quelle));
    ok('und speichert den geprüften Typ, nicht den behaupteten',
      /const mime = file\.geprueftMime/.test(quelle) && !/file\.mimetype, checksum/.test(quelle));
    ok('Download und Vorschau gehen über dieselbe Funktion',
      (quelle.match(/dateitypen\.kopfzeilen\(res/g) || []).length === 2);

    const dok = require('fs').readFileSync(`${__dirname}/../../routes/documents.js`, 'utf8');
    ok('die Unterlagen benutzen dieselbe Liste', /fileFilter: dateitypen\.multerFilter/.test(dok));
  }

  schluss();
})().catch((e) => { console.error('ABBRUCH:', e.message, '\n', (e.stack || '').split('\n').slice(0, 5).join('\n')); process.exit(1); });
