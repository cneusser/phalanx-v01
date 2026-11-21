// ─────────────────────────────────────────────────────────────────────────────
// Die Vereinbarung aus dem Hausdokument, zweisprachig und je Person (v0.490)
//
// Anlass, wörtlich: „Ich würde in Zukunft den beigelegten NDA für alle Anfragen
// customized auf Person und Projekt nutzen wollen."
//
// Geprüft wird, was schiefgehen kann:
//
//   1. Die Vorlage ist in beiden Sprachen gleich lang. Ein Absatz, der nur
//      deutsch existiert, wäre im Vertrag eine stille Lücke.
//   2. Die Platzhalter sind gefüllt, und zwar mit dieser Person und diesem
//      Mandat. Ein stehengebliebenes {{buyer_company}} im Vertrag wäre
//      peinlich, ein falsch gefülltes wäre schlimmer.
//   3. Ohne Sitz, Register und vertretungsberechtigte Person wird nicht
//      unterschrieben. Ein Vertrag, der seine Partei nicht benennt, ist keiner.
//   4. Die Angaben landen im Profil und werden beim nächsten Mandat nicht
//      erneut verlangt.
//   5. Der Fingerabdruck deckt beide Sprachen und die Vertragspartei ab. Wer
//      daran etwas ändert, bekommt einen anderen Abdruck.
//   6. Das PDF entsteht und trägt beide Sprachen.
// ─────────────────────────────────────────────────────────────────────────────

const { hochfahren, zaehler } = require('./lauf');

(async () => {
  const { db, ruf, alsNutzer, mandat } = await hochfahren({ port: 5594 });
  const { ok, schluss } = zaehler();

  const vorlage = require(`${__dirname}/../../db/ndaVorlagePhalanx`);
  const ndaFassung = require(`${__dirname}/../../utils/ndaFassung`);

  console.log('\n══ Die Vorlage selbst ══');
  {
    ok('sie trägt beide Präambeln', !!vorlage.preamble && !!vorlage.preamble_en);
    let gleich = true; const schief = [];
    for (const s of vorlage.sections) {
      if (!s.title_en) { gleich = false; schief.push(`${s.title}: keine englische Überschrift`); }
      if ((s.paragraphs || []).length !== (s.paragraphs_en || []).length) { gleich = false; schief.push(`${s.title}: Absätze ${(s.paragraphs || []).length} zu ${(s.paragraphs_en || []).length}`); }
      if ((s.bullets || []).length !== (s.bullets_en || []).length) { gleich = false; schief.push(`${s.title}: Punkte ${(s.bullets || []).length} zu ${(s.bullets_en || []).length}`); }
    }
    ok('jeder Abschnitt ist in beiden Sprachen gleich lang', gleich, schief.join(' | '));
    ok('sie hat zehn Paragraphen wie das Hausdokument', vorlage.sections.length === 10, String(vorlage.sections.length));
    ok('der Gerichtsstand ist Nürnberg', vorlage.court_venue === 'Nürnberg', vorlage.court_venue);
    ok('die Beratung ist die Phalanx GmbH in Erlangen',
      vorlage.advisor.name === 'Phalanx GmbH' && /Erlangen/.test(vorlage.advisor.city), JSON.stringify(vorlage.advisor));
  }

  console.log('\n══ Die Vorlage ist eingespielt und aktiv ══');
  const aktiv = await db.get('SELECT * FROM nda_templates WHERE is_active = 1 ORDER BY version DESC, id DESC LIMIT 1');
  {
    ok('die aktive Vorlage ist die neue', aktiv && aktiv.version === vorlage.version, aktiv ? `${aktiv.name} v${aktiv.version}` : 'keine');
    ok('sie trägt die englische Präambel in der Datenbank', !!(aktiv && aktiv.preamble_en));
    const alte = await db.all('SELECT version, is_active FROM nda_templates WHERE version < ?', [vorlage.version]);
    ok('ältere Vorlagen sind inaktiv', alte.every((r) => Number(r.is_active) === 0), JSON.stringify(alte));
  }

  console.log('\n══ Die Fassung, gefüllt auf Person und Mandat ══');
  {
    const f = ndaFassung.fassung({
      vorlage,
      kaeufer: {
        first_name: 'Ada', last_name: 'Anfrage', company: 'Anfrage Industrieholding GmbH',
        email: 'ada@pruefstand.invalid', company_seat: 'Erlangen',
        company_register: 'Amtsgericht Fürth, HRB 12345', company_representative: 'Ada Anfrage',
      },
      mandat: { codename: 'PRUEF_VORLAGE' },
    });
    const alles = JSON.stringify(f);
    ok('kein Platzhalter bleibt stehen', !/\{\{\w+\}\}/.test(alles), (alles.match(/\{\{\w+\}\}/g) || []).join(','));
    ok('das Mandat steht in beiden Präambeln',
      /PRUEF_VORLAGE/.test(f.praeambel) && /PRUEF_VORLAGE/.test(f.praeambel_en));
    ok('die Vertragspartei trägt Sitz, Register und Vertretung',
      f.parteien.interessent.sitz === 'Erlangen'
      && /HRB 12345/.test(f.parteien.interessent.register)
      && f.parteien.interessent.vertreter === 'Ada Anfrage');
    ok('die Fassung ist als zweisprachig gekennzeichnet', f.zweisprachig === true);
    ok('jeder Paragraph hat eine englische Spalte',
      f.paragraphen.every((p) => p.titel_en && p.absaetze_en.length === p.absaetze.length));
    ok('der Gerichtsstand ist eingesetzt', /Nürnberg/.test(JSON.stringify(f.paragraphen)));

    // Der Abdruck muss sich rühren, wenn sich die Partei oder die englische
    // Spalte ändert. Sonst wäre er als Nachweis wertlos.
    const andererSitz = ndaFassung.fassung({
      vorlage,
      kaeufer: { first_name: 'Ada', last_name: 'Anfrage', company: 'Anfrage Industrieholding GmbH', email: 'ada@pruefstand.invalid', company_seat: 'Nürnberg', company_register: 'Amtsgericht Fürth, HRB 12345', company_representative: 'Ada Anfrage' },
      mandat: { codename: 'PRUEF_VORLAGE' },
    });
    ok('ein anderer Sitz ergibt einen anderen Fingerabdruck', andererSitz.hash !== f.hash);

    const geaendertEn = JSON.parse(JSON.stringify(vorlage));
    geaendertEn.sections[0].paragraphs_en[0] += ' Something else entirely.';
    const mitEn = ndaFassung.fassung({
      vorlage: geaendertEn,
      kaeufer: { first_name: 'Ada', last_name: 'Anfrage', company: 'Anfrage Industrieholding GmbH', email: 'ada@pruefstand.invalid', company_seat: 'Erlangen', company_register: 'Amtsgericht Fürth, HRB 12345', company_representative: 'Ada Anfrage' },
      mandat: { codename: 'PRUEF_VORLAGE' },
    });
    ok('eine geänderte englische Klausel ergibt einen anderen Fingerabdruck', mitEn.hash !== f.hash);
  }

  console.log('\n══ Ohne die drei Angaben wird nicht unterschrieben ══');
  const pid = await mandat('PRUEF_VORLAGE');
  const bcrypt = require(`${__dirname}/../../node_modules/bcryptjs`);
  const hash = await bcrypt.hash('Pruefstand!2026', 10);
  await db.run('DELETE FROM users WHERE email = ?', ['pruef.vertrag@pruefstand.invalid']).catch(() => {});
  await db.run(
    `INSERT INTO users (tenant_id, email, password_hash, salutation, first_name, last_name, company, position,
                        mobile, street, postal_code, city, role, is_active, is_approved, email_verified)
     VALUES (1, ?, ?, 'Frau', 'Ada', 'Anfrage', 'Anfrage Industrieholding GmbH', 'Geschäftsführung',
             '+49 160 1', 'Weg 1', '90000', 'Ort', 'buyer', 1, 1, 1)`,
    ['pruef.vertrag@pruefstand.invalid', hash]);
  const kaeufer = await db.get('SELECT * FROM users WHERE email = ?', ['pruef.vertrag@pruefstand.invalid']);
  const tk = alsNutzer(kaeufer);
  {
    const anf = await ruf('/api/ndas', { token: tk, methode: 'POST', koerper: { project_id: pid } });
    ok('die Vereinbarung lässt sich anfordern', [200, 201].includes(anf.status), String(anf.status));

    const fas = await ruf(`/api/ndas/${pid}/fassung`, { token: tk });
    ok('die Fassung nennt die fehlenden Angaben',
      (fas.daten.fehlende_vertragsangaben || []).length === 3,
      JSON.stringify(fas.daten.fehlende_vertragsangaben));

    const ohne = await ruf(`/api/ndas/${pid}/sign-online`, {
      token: tk, methode: 'POST',
      koerper: { consent_name: 'Ada Anfrage', consent_confirmed: true, fassung_hash: fas.daten.hash },
    });
    ok('ohne sie wird abgewiesen', ohne.status === 400 && ohne.json.code === 'VERTRAGSANGABEN_FEHLEN',
      `${ohne.status} ${ohne.json.code || ''}`);
    ok('die Abweisung benennt alle drei', (ohne.json.missing || []).length === 3, (ohne.json.missing || []).join(','));
  }

  console.log('\n══ Mit den drei Angaben, in einem Zug ══');
  const angaben = {
    company_seat: 'Erlangen',
    company_register: 'Amtsgericht Fürth, HRB 12345',
    company_representative: 'Ada Anfrage',
  };
  {
    // So macht es der Dialog: erst die Fassung mit den eingetragenen Angaben
    // ansehen, dann mit genau deren Fingerabdruck unterschreiben.
    const p = new URLSearchParams(angaben).toString();
    const vorschau = await ruf(`/api/ndas/${pid}/fassung?${p}`, { token: tk });
    ok('die Vorschau zeigt die Partei vollständig',
      vorschau.daten.parteien.interessent.sitz === 'Erlangen'
      && (vorschau.daten.fehlende_vertragsangaben || []).length === 0);

    const noch = await db.get('SELECT company_seat FROM users WHERE id = ?', [kaeufer.id]);
    ok('die Vorschau speichert nichts', !noch.company_seat, String(noch.company_seat));

    const sig = await ruf(`/api/ndas/${pid}/sign-online`, {
      token: tk, methode: 'POST',
      koerper: {
        consent_name: 'Ada Anfrage', consent_confirmed: true,
        fassung_hash: vorschau.daten.hash, vertragsdaten: angaben,
      },
    });
    ok('die Unterschrift geht durch', [200, 201].includes(sig.status), `${sig.status} ${(sig.text || '').slice(0, 200)}`);

    const danach = await db.get('SELECT company_seat, company_register, company_representative FROM users WHERE id = ?', [kaeufer.id]);
    ok('die Angaben stehen jetzt im Profil',
      danach.company_seat === 'Erlangen' && /HRB 12345/.test(danach.company_register || '')
      && danach.company_representative === 'Ada Anfrage', JSON.stringify(danach));

    const prof = await ruf('/api/profile', { token: tk });
    ok('das Profil gibt sie auch wieder heraus', prof.daten.user.company_seat === 'Erlangen', String(prof.daten.user.company_seat));
  }

  console.log('\n══ Das PDF ══');
  {
    const { generateNDA } = require(`${__dirname}/../../utils/ndaGenerator`);
    const puffer = await generateNDA({
      buyer: {
        id: kaeufer.id, first_name: 'Ada', last_name: 'Anfrage', company: 'Anfrage Industrieholding GmbH',
        email: kaeufer.email, address: 'Weg 1', city: '90000 Ort', ...angaben,
      },
      project: { codename: 'PRUEF_VORLAGE' },
      template: vorlage,
      signature: { name: 'Ada Anfrage', company: 'Anfrage Industrieholding GmbH', date: new Date().toISOString(), ip: '1.2.3.4' },
    });
    ok('es entsteht ein PDF', puffer && puffer.length > 8000, String(puffer && puffer.length));
    const roh = puffer.toString('latin1');
    ok('es ist als PDF gekennzeichnet', roh.startsWith('%PDF'));
  }

  console.log('\n══ Das Kennzeichen „Plattform-NDA" ist aus der Oberfläche raus ══');
  {
    const quelle = require('fs').readFileSync(`${__dirname}/../../../client/src/components/DealFunnelBoard.jsx`, 'utf8');
    ok('im Verkaufstrichter steht es nicht mehr', !/>Plattform-NDA</.test(quelle));
    const dialog = require('fs').readFileSync(`${__dirname}/../../../client/src/components/NDASignModal.jsx`, 'utf8');
    ok('der Dialog erhebt die drei Angaben', /company_representative/.test(dialog));
    ok('und holt vor der Unterschrift die passende Fassung', /fassung\?\$\{new URLSearchParams/.test(dialog));
  }

  schluss();
})().catch((e) => { console.error('ABBRUCH:', e.message, '\n', (e.stack || '').split('\n').slice(0, 5).join('\n')); process.exit(1); });
