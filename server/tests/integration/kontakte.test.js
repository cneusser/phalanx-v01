// ─────────────────────────────────────────────────────────────────────────────
// Ein Nutzerkonto findet den Weg ins CRM (v0.499)
//
// Anlass, wörtlich: „Ich kann nicht auf Wiedemeyer tippen und wenn ich ihm im
// CRM Suche finde ich ihn nicht? Wie kann das sein?"
//
// Zwei Dinge, eine Beobachtung:
//
//   1. Der Klick auf den Namen in der Nutzerliste lief ins Leere. Die Route
//      gibt { id, created } zurück, gelesen wurde `contact_id`. Das ist
//      undefined, die Schublade bekam nichts zu zeigen, und es sah aus, als
//      sei der Name gar nicht anklickbar.
//   2. Wer sich selbst registriert, wird ein Nutzerkonto, kein CRM-Kontakt.
//      Das ist richtig so, war aber unsichtbar.
//
// Geprüft wird: die Route antwortet mit einer Kennung, sie legt nur einmal an,
// die neue Liste nennt genau die Konten ohne Kontakt, und nach der Übernahme
// ist die Person dort weg und im CRM zu finden.
// ─────────────────────────────────────────────────────────────────────────────

const { hochfahren, zaehler } = require('./lauf');

(async () => {
  const { db, ruf, alsNutzer } = await hochfahren({ port: 5603 });
  const { ok, schluss } = zaehler();

  const admin = await db.get("SELECT * FROM users WHERE role = 'super_admin' ORDER BY id LIMIT 1");
  const tAdmin = alsNutzer(admin);

  const bcrypt = require(`${__dirname}/../../node_modules/bcryptjs`);
  const hash = await bcrypt.hash('Pruefstand!2026', 10);
  const email = 'pruef.ohnekontakt@pruefstand.invalid';
  await db.run('DELETE FROM crm_contacts WHERE lower(email) = ?', [email]).catch(() => {});
  await db.run('DELETE FROM users WHERE email = ?', [email]).catch(() => {});
  await db.run(
    `INSERT INTO users (tenant_id, email, password_hash, salutation, first_name, last_name, company, position,
                        mobile, role, is_active, is_approved, email_verified)
     VALUES (1, ?, ?, 'Herr', 'Lars', 'Lose', 'Lose Beteiligungen', 'Geschäftsführung', '+49 160 7', 'buyer', 1, 1, 1)`,
    [email, hash]);
  const nutzer = await db.get('SELECT * FROM users WHERE email = ?', [email]);

  console.log('\n══ Das Konto fehlt im CRM, und das sieht man jetzt ══');
  {
    const kontakte = await ruf(`/api/crm/contacts?q=${encodeURIComponent('Lose')}`, { token: tAdmin });
    ok('die Kontaktsuche findet ihn nicht', (kontakte.daten || []).length === 0, String((kontakte.daten || []).length));

    const offen = await ruf(`/api/crm/konten-ohne-kontakt?q=${encodeURIComponent('Lose')}`, { token: tAdmin });
    ok('die neue Liste antwortet', offen.status === 200, String(offen.status));
    ok('und nennt genau dieses Konto',
      (offen.daten || []).length === 1 && offen.daten[0].email === email,
      JSON.stringify((offen.daten || []).map((u) => u.email)));
    ok('mit Namen und Unternehmen', offen.daten[0].last_name === 'Lose' && offen.daten[0].company === 'Lose Beteiligungen');
  }

  console.log('\n══ Die Übernahme ══');
  let kontaktId = null;
  {
    const r = await ruf(`/api/crm/contacts/from-user/${nutzer.id}`, { token: tAdmin, methode: 'POST' });
    ok('sie geht durch', r.status === 200, String(r.status));
    ok('und nennt eine Kennung', !!(r.daten && r.daten.id), JSON.stringify(r.daten));
    ok('die Antwort sagt, dass angelegt wurde', r.daten.created === true, String(r.daten.created));
    kontaktId = r.daten.id;

    const nochmal = await ruf(`/api/crm/contacts/from-user/${nutzer.id}`, { token: tAdmin, methode: 'POST' });
    ok('ein zweiter Klick legt nichts Neues an', nochmal.daten.created === false && nochmal.daten.id === kontaktId,
      JSON.stringify(nochmal.daten));
  }

  console.log('\n══ Danach ist er im CRM und nicht mehr in der Liste ══');
  {
    const kontakte = await ruf(`/api/crm/contacts?q=${encodeURIComponent('Lose')}`, { token: tAdmin });
    ok('die Kontaktsuche findet ihn jetzt', (kontakte.daten || []).some((k) => k.email === email),
      JSON.stringify((kontakte.daten || []).map((k) => k.email)));

    const offen = await ruf(`/api/crm/konten-ohne-kontakt?q=${encodeURIComponent('Lose')}`, { token: tAdmin });
    ok('und die Liste der offenen Konten ist leer', (offen.daten || []).length === 0,
      JSON.stringify((offen.daten || []).map((u) => u.email)));

    const kontakt = await db.get('SELECT * FROM crm_contacts WHERE id = ?', [kontaktId]);
    ok('der Kontakt zeigt auf das Konto', Number(kontakt.user_id) === Number(nutzer.id), String(kontakt.user_id));
    ok('und trägt die Herkunft', kontakt.lead_source === 'account', String(kontakt.lead_source));
  }

  console.log('\n══ Die Verwaltung bleibt aussen vor ══');
  {
    const alle = await ruf('/api/crm/konten-ohne-kontakt', { token: tAdmin });
    ok('die eigene Verwaltung steht nicht in der Liste',
      !(alle.daten || []).some((u) => ['super_admin', 'advisor'].includes(u.role)),
      JSON.stringify((alle.daten || []).map((u) => u.role)));
  }

  console.log('\n══ Die Oberfläche ══');
  {
    const adminSeite = require('fs').readFileSync(`${__dirname}/../../../client/src/pages/Admin.jsx`, 'utf8');
    ok('der Klick auf den Namen liest die richtige Kennung', /r\.id \|\| r\.contact_id/.test(adminSeite));
    ok('und meldet sich, wenn nichts kommt', /Kontakt konnte nicht geoeffnet werden/.test(adminSeite));

    const crmSeite = require('fs').readFileSync(`${__dirname}/../../../client/src/pages/Crm.jsx`, 'utf8');
    ok('das CRM holt die Konten ohne Kontakt', /konten-ohne-kontakt/.test(crmSeite));
    ok('und bietet die Übernahme an', /Als Kontakt übernehmen/.test(crmSeite));
    ok('angelegt wird nur auf Klick', /uebernehmen\(u\)/.test(crmSeite));
  }

  schluss();
})().catch((e) => { console.error('ABBRUCH:', e.message, '\n', (e.stack || '').split('\n').slice(0, 5).join('\n')); process.exit(1); });
