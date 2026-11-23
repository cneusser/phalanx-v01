// ─────────────────────────────────────────────────────────────────────────────
// Der Mandant wird mitgeführt, nicht an jeder Abfrage wiederholt (v0.496)
//
// Befund der Sicherheitsdurchsicht: admin.js und documents.js sprechen an 231
// Stellen an der Mandantensicht vorbei. Lesen fände bei einem zweiten
// Mandanten nichts, Schreiben landete beim Plattformmandanten.
//
// Geprüft wird:
//   1. Mandant 1 verhält sich wie vorher. Das ist die wichtigste Prüfung,
//      denn heute läuft alles in Mandant 1.
//   2. Innerhalb von imMandanten(2, …) sehen und schreiben db.get, db.all,
//      db.run und db.insert im Mandanten 2, ohne dass irgendwo scoped steht.
//   3. Eine Einfügung ohne ausdrückliches tenant_id landet im richtigen
//      Mandanten, nicht in der Eins.
//   4. Die beiden Mandanten sehen einander nicht.
//   5. Innerhalb von withTenant() benutzen db.get und db.run dieselbe
//      Transaktion und sehen deren noch nicht geschriebene Zeilen.
//   6. Die Middleware legt den Mandanten um jede Anfrage.
// ─────────────────────────────────────────────────────────────────────────────

const { hochfahren, zaehler } = require('./lauf');

(async () => {
  const { db } = await hochfahren({ port: 5601 });
  const { ok, schluss } = zaehler();

  // Einen zweiten Mandanten anlegen. tenants selbst steht nicht unter der
  // Richtlinie, sonst käme man nie an den zweiten heran.
  await db.run("DELETE FROM tenants WHERE subdomain = 'pruefmandant'").catch(() => {});
  const zweiter = await db.get(
    `INSERT INTO tenants (name, slug, display_name, subdomain)
     VALUES ('Prüfmandant', 'pruefmandant', 'Prüfmandant', 'pruefmandant')
     ON CONFLICT (subdomain) DO UPDATE SET name = EXCLUDED.name RETURNING id`);
  const m2 = zweiter.id;
  ok('es gibt einen zweiten Mandanten', !!m2 && m2 !== 1, String(m2));

  const kennzeichen = `PRUEF_MANDANT_${Date.now()}`;

  console.log('\n══ Mandant 1 verhält sich wie bisher ══');
  {
    ok('der Standardmandant ist die Eins', db.aktuellerMandant() === 1, String(db.aktuellerMandant()));
    const id = await db.insert(
      `INSERT INTO projects (codename, mandate_type, status, industry, region, short_description)
       VALUES (?, 'ma', 'draft', 'C27', 'Bayern', 'Nur für den Prüfstand.') RETURNING id`, [`${kennzeichen}_EINS`]);
    ok('eine Einfügung ohne Mandantenangabe geht durch', !!id, String(id));
    const p = await db.get('SELECT tenant_id FROM projects WHERE id = ?', [id]);
    ok('und landet im Mandanten 1', Number(p.tenant_id) === 1, String(p.tenant_id));
  }

  console.log('\n══ Im zweiten Mandanten, ohne ein einziges scoped ══');
  let idZwei = null;
  await db.imMandanten(m2, async () => {
    ok('der Kontext nennt den zweiten Mandanten', db.aktuellerMandant() === m2, String(db.aktuellerMandant()));

    idZwei = await db.insert(
      `INSERT INTO projects (codename, mandate_type, status, industry, region, short_description)
       VALUES (?, 'ma', 'draft', 'C27', 'Bayern', 'Nur für den Prüfstand.') RETURNING id`, [`${kennzeichen}_ZWEI`]);
    ok('eine Einfügung ohne Mandantenangabe geht durch', !!idZwei, String(idZwei));

    const p = await db.get('SELECT tenant_id, codename FROM projects WHERE id = ?', [idZwei]);
    ok('und landet im zweiten Mandanten, nicht in der Eins', p && Number(p.tenant_id) === m2,
      p ? String(p.tenant_id) : 'nicht gefunden');

    const eins = await db.get('SELECT id FROM projects WHERE codename = ?', [`${kennzeichen}_EINS`]);
    ok('das Mandat des ersten Mandanten ist hier unsichtbar', !eins, eins ? String(eins.id) : 'unsichtbar');

    const alle = await db.all('SELECT id FROM projects WHERE codename LIKE ?', [`${kennzeichen}%`]);
    ok('die Liste zeigt nur das eigene', alle.length === 1, String(alle.length));

    const geaendert = await db.run('UPDATE projects SET short_description = ? WHERE id = ?', ['geändert im zweiten', idZwei]);
    ok('Ändern wirkt im eigenen Mandanten', geaendert.rowCount === 1, String(geaendert.rowCount));
  });

  console.log('\n══ Zurück im ersten Mandanten ══');
  {
    ok('der Kontext steht wieder auf 1', db.aktuellerMandant() === 1, String(db.aktuellerMandant()));
    const zwei = await db.get('SELECT id FROM projects WHERE codename = ?', [`${kennzeichen}_ZWEI`]);
    ok('das Mandat des zweiten Mandanten ist hier unsichtbar', !zwei, zwei ? String(zwei.id) : 'unsichtbar');
    const eigen = await db.get('SELECT id FROM projects WHERE codename = ?', [`${kennzeichen}_EINS`]);
    ok('das eigene ist weiterhin da', !!eigen);
  }

  console.log('\n══ Innerhalb einer Mandantensicht wird sie weiterbenutzt ══');
  {
    const gesehen = await db.withTenant(m2, async (t) => {
      const a = await t.get('SELECT codename FROM projects WHERE id = ?', [idZwei]);
      // Dieselbe Abfrage über db.get, ohne t: muss dieselbe Transaktion treffen.
      const b = await db.get('SELECT codename FROM projects WHERE id = ?', [idZwei]);
      return { a: a && a.codename, b: b && b.codename };
    });
    ok('db.get sieht dasselbe wie die Sicht selbst', gesehen.a === gesehen.b && !!gesehen.a, JSON.stringify(gesehen));

    const frisch = await db.withTenant(m2, async (t) => {
      await t.run('UPDATE projects SET short_description = ? WHERE id = ?', ['in der Transaktion', idZwei]);
      const gelesen = await db.get('SELECT short_description FROM projects WHERE id = ?', [idZwei]);
      return gelesen && gelesen.short_description;
    });
    ok('und sieht, was in der Transaktion noch nicht geschrieben ist', frisch === 'in der Transaktion', String(frisch));
  }

  console.log('\n══ Die Middleware legt den Mandanten um die Anfrage ══');
  {
    const quelle = require('fs').readFileSync(`${__dirname}/../../middleware/tenant.js`, 'utf8');
    ok('die Anfrage läuft im Mandanten', /db\.imMandanten\(req\.tenantId, \(\) => next\(\)\)/.test(quelle));

    const daten = require('fs').readFileSync(`${__dirname}/../../db/database.js`, 'utf8');
    ok('der Datenzugriff kennt den Ablagekontext', /AsyncLocalStorage/.test(daten));
    ok('get, all, run und insert gehen darüber',
      (daten.match(/return imKontext\('/g) || []).length === 4,
      String((daten.match(/return imKontext\('/g) || []).length));
  }

  console.log('\n══ Aufräumen ══');
  {
    await db.imMandanten(m2, async () => {
      await db.run('DELETE FROM projects WHERE codename LIKE ?', [`${kennzeichen}%`]);
    });
    await db.run('DELETE FROM projects WHERE codename LIKE ?', [`${kennzeichen}%`]);
    await db.run('DELETE FROM tenants WHERE id = ?', [m2]).catch(() => {});
    ok('die Prüfmandate sind weg', (await db.all('SELECT id FROM projects WHERE codename LIKE ?', [`${kennzeichen}%`])).length === 0);
  }

  schluss();
})().catch((e) => { console.error('ABBRUCH:', e.message, '\n', (e.stack || '').split('\n').slice(0, 5).join('\n')); process.exit(1); });
