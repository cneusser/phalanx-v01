// ─────────────────────────────────────────────────────────────────────────────
// Zwei Stufen der Profilpflicht, und die Werkzeuge bleiben beim Verkäufer (v0.488)
//
// Anlass, wörtlich: „Kann es so intuitiv geführt sein, dass man sofort weiß,
// dass das gepflegt werden muss? Ich denke da das eine entsprechende Meldung
// kommt oder ein Sprung auf die Seite, damit der User nicht suchen muss."
//
// Zwei Änderungen, beide aus dem Testdrehbuch heraus:
//
//   1. Vier Angaben genügen, um ein Mandat anzusehen. Die vollständigen
//      Kontaktdaten verlangt erst die Vereinbarung, und dort sind sie
//      begründet, weil der Interessent Vertragspartei wird.
//   2. Der Datenraum zeigt einem Interessenten keine Pflegewerkzeuge mehr.
//
// Geprüft wird hier die Stufenlogik am Server. Dass der Client daraus eine
// Führung macht, also Meldung, Sprung und Rückweg, prüft das Drehbuch von
// Hand; eine Prüfung, die den Browser nachbaut, prüfte die Nachbildung.
// ─────────────────────────────────────────────────────────────────────────────

const { hochfahren, zaehler } = require('./lauf');

(async () => {
  const { db, ruf, alsNutzer, mandat, stufe } = await hochfahren({ port: 5593 });
  const { ok, schluss } = zaehler();

  const admin = await db.get("SELECT * FROM users WHERE role = 'super_admin' ORDER BY id LIMIT 1");
  const tA = alsNutzer(admin);
  const pid = await mandat('PRUEF_PROFILSTUFEN');

  // Ein Konto ganz ohne Angaben, von Hand, weil die Hilfe in lauf.js
  // bewusst ein vollständiges Profil anlegt.
  const bcrypt = require(`${__dirname}/../../node_modules/bcryptjs`);
  const hash = await bcrypt.hash('Pruefstand!2026', 10);
  await db.run('DELETE FROM users WHERE email = ?', ['pruef.leer@pruefstand.invalid']).catch(() => {});
  await db.run(
    `INSERT INTO users (tenant_id, email, password_hash, first_name, last_name, role, is_active, is_approved, email_verified)
     VALUES (1, ?, ?, '', '', 'buyer', 1, 1, 1)`, ['pruef.leer@pruefstand.invalid', hash]);
  const leer = await db.get('SELECT * FROM users WHERE email = ?', ['pruef.leer@pruefstand.invalid']);
  const tLeer = alsNutzer(leer);

  console.log('\n══ Ohne jede Angabe ══');
  {
    const det = await ruf(`/api/projects/${pid}`, { token: tLeer });
    ok('die Detailseite verweist auf das Profil', det.status === 403 && det.json.code === 'PROFILE_INCOMPLETE', String(det.status));
    ok('sie nennt die fehlenden Felder als Schlüssel', Array.isArray(det.json.missing) && det.json.missing.length > 0, (det.json.missing || []).join(','));
    ok('und als Beschriftung', Array.isArray(det.json.missing_labels) && det.json.missing_labels.length > 0, (det.json.missing_labels || []).join(', '));
    ok('sie nennt die Stufe', det.json.stufe === 'frueh', String(det.json.stufe));
    ok('und sagt, wozu das gut ist', typeof det.json.anlass === 'string' && det.json.anlass.length > 10);
    ok('sie verlangt genau die vier frühen Angaben, nicht neun',
      det.json.missing.length === 4 && !det.json.missing.includes('street') && !det.json.missing.includes('mobile'),
      det.json.missing.join(','));
  }

  console.log('\n══ Mit den vier frühen Angaben ══');
  {
    await db.run(
      `UPDATE users SET salutation = 'Frau', first_name = 'Ada', last_name = 'Anfrage', company = 'Anfrage GmbH' WHERE id = ?`,
      [leer.id]);
    const det = await ruf(`/api/projects/${pid}`, { token: tLeer });
    ok('die Detailseite scheitert nicht mehr am Profil', det.json.code !== 'PROFILE_INCOMPLETE', String(det.json.code));

    const nda = await ruf('/api/ndas', { token: tLeer, methode: 'POST', koerper: { project_id: pid } });
    ok('die Vereinbarung verlangt mehr', nda.status === 403 && nda.json.code === 'PROFILE_INCOMPLETE', String(nda.status));
    ok('und zwar die fünf übrigen', (nda.json.missing || []).length === 5
      && ['position', 'mobile', 'street', 'postal_code', 'city'].every((f) => nda.json.missing.includes(f)),
      (nda.json.missing || []).join(','));
    ok('die Stufe heisst voll', nda.json.stufe === 'voll', String(nda.json.stufe));
    ok('der Anlass nennt die Vertragspartei', /Vertragspartei/.test(nda.json.anlass || ''), nda.json.anlass);
  }

  console.log('\n══ Mit allen Angaben ══');
  {
    await db.run(
      `UPDATE users SET position = 'Geschäftsführung', mobile = '+49 160 1', street = 'Weg 1', postal_code = '90000', city = 'Ort' WHERE id = ?`,
      [leer.id]);
    const nda = await ruf('/api/ndas', { token: tLeer, methode: 'POST', koerper: { project_id: pid } });
    ok('die Vereinbarung lässt sich anfordern', [200, 201].includes(nda.status), String(nda.status));
    ok('und der Stand steht auf angefragt', ['requested', 'nda_pending'].includes(await stufe(pid, leer.id)));
  }

  console.log('\n══ Das Profil nennt beide Stufen ══');
  {
    const p = await ruf('/api/profile', { token: tLeer });
    ok('es gibt die frühe Liste', Array.isArray(p.daten.felder_frueh) && p.daten.felder_frueh.length === 4, (p.daten.felder_frueh || []).join(','));
    ok('und sagt, was noch früh fehlt', Array.isArray(p.daten.missing_frueh), JSON.stringify(p.daten.missing_frueh));
  }

  console.log('\n══ Der Datenraum zeigt dem Käufer keine Werkzeuge ══');
  {
    const quelle = require('fs').readFileSync(`${__dirname}/../../../client/src/pages/ProjectSafe.jsx`, 'utf8');
    ok('die Seite liest das Kennzeichen des Servers', /setNurLesend\(!!d\.nur_lesend\)/.test(quelle));
    ok('und beginnt vorsichtig, nicht offen', /useState\(true\)/.test(quelle.slice(quelle.indexOf('const [nurLesend'), quelle.indexOf('const [nurLesend') + 120)));
    ok('die Verwaltungsleiste haengt daran', /\{!nurLesend && \(/.test(quelle));
    ok('Loeschen auch', /!nurLesend && <button title="Löschen"/.test(quelle));
    ok('Vertraulichkeit und Einzelfreigaben auch', quelle.indexOf('{!nurLesend && <>') < quelle.indexOf('setzeVertraulich(it)'));
    ok('Vorschau und Download bleiben', /title="Vorschau \(mit Wasserzeichen\)"/.test(quelle) && /title="Herunterladen"/.test(quelle));
    ok('ein gesperrtes Objekt wird als gesperrt gezeigt', /gesperrt &&/.test(quelle));

    const server = require('fs').readFileSync(`${__dirname}/../../routes/safe.js`, 'utf8');
    ok('der Server schickt das Kennzeichen weiterhin mit', /nur_lesend: !!req\.safeBew/.test(server));
  }

  schluss();
})().catch((e) => { console.error('ABBRUCH:', e.message, '\n', (e.stack || '').split('\n').slice(0, 4).join('\n')); process.exit(1); });
