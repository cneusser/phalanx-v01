#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Die Demowelt der Teststufe (v0.482)
//
// Anlass, wörtlich: „In der Testebene kann ich Daten und so weiter, Demo-Daten
// etc. ganz gut nutzen. Meine Idee ist einfach, dass ich hier mehr
// Möglichkeiten habe, auch mal mit Kundendaten zu hantieren."
//
// Alles hier ist erfunden. Kein Codename, keine Firma, kein Name und keine
// Adresse stammt aus einem echten Mandat. Das ist nicht Vorsicht um ihrer
// selbst willen: Ein anonymisierter Auszug einer M&A-Plattform ist nie wirklich
// anonym, weil Codename, Branche und Umsatzband zusammen oft schon genügen.
//
// Die Welt ist so gebaut, dass jeder Schritt des Prozesses mindestens einmal
// vorkommt und zwar in jedem Stand, in dem er vorkommen kann. Vier Interessenten
// an einem Mandat, und jeder steht woanders:
//
//   • einer hat nur angefragt                      (nichts freigegeben)
//   • einer hat die Vereinbarung zum Unterschreiben (nda_pending)
//   • einer hat unterschrieben, Datenraum fehlt     (nda_signed)
//   • einer ist im Datenraum                        (dataroom_granted)
//
// Dazu ein Mandat als Startup-Finanzierung, weil dort die Ausnahme ohne
// Unterschrift gilt, und ein Mandat im Entwurf, das noch nicht öffentlich ist.
//
// Zwei Dateien im Datenraum, eine davon ausdrücklich vertraulich. Genau daran
// hing der Fehler aus v0.481, und wer die Teststufe durchspielt, soll ihn
// wiederfinden können, wenn er zurückkommt.
//
// Aufruf:
//     CM_STUFE=teststufe node server/scripts/demowelt.js
//     CM_STUFE=teststufe node server/scripts/demowelt.js --zuruecksetzen
//
// „--zuruecksetzen" löscht die Demowelt und baut sie neu. Gelöscht wird
// ausschliesslich, was diese Datei angelegt hat: Mandate mit dem Vorsatz
// „DEMO_" und Konten auf der Domäne @demo.capitalmatch.invalid. Es wird nie
// etwas anderes angefasst, und auf der Produktion läuft es gar nicht.
// ─────────────────────────────────────────────────────────────────────────────

const path = require('path');
const stufen = require('../utils/stufe');

const DOMAENE = '@demo.capitalmatch.invalid';
const VORSATZ = 'DEMO_';

// ── Die erfundenen Mandate ──────────────────────────────────────────────────
const MANDATE = [
  {
    codename: `${VORSATZ}NORDLICHT`,
    art: 'ma',
    industry: 'C28 – Maschinenbau',
    region: 'Schleswig-Holstein',
    revenue_band: '10 bis 25 Mio. EUR',
    ebitda_band: '1 bis 2,5 Mio. EUR',
    deal_type: 'Nachfolge',
    status: 'active',
    kurz: 'Erfundener Sondermaschinenbauer an der Küste, zwei Werke, Nachfolge '
        + 'ohne Kandidaten in der Familie. Dient nur der Teststufe.',
    highlights: [
      'Auftragsbestand über zwölf Monate',
      'Eigene Konstruktion, Fertigung im Haus',
      'Zwei Drittel Wiederholkunden',
    ],
  },
  {
    codename: `${VORSATZ}TALSOHLE`,
    art: 'ma',
    industry: 'C10 – Nahrungsmittel',
    region: 'Thüringen',
    revenue_band: '25 bis 50 Mio. EUR',
    ebitda_band: 'negativ',
    deal_type: 'Sondersituation',
    status: 'active',
    kurz: 'Erfundener Lebensmittelverarbeiter in der Restrukturierung, Umbau '
        + 'eingeleitet, Kapitalbedarf offen. Dient nur der Teststufe.',
    highlights: [
      'Umbau eingeleitet, Personalkosten sinken',
      'Marken in zwei Handelsketten gelistet',
      'Kapitalbedarf im einstelligen Millionenbereich',
    ],
  },
  {
    codename: `${VORSATZ}SETZLING`,
    art: 'fundraising',
    industry: 'J62 – Software',
    region: 'Berlin',
    revenue_band: 'unter 2,5 Mio. EUR',
    ebitda_band: 'negativ',
    deal_type: 'Wachstumsfinanzierung',
    status: 'active',
    kurz: 'Erfundenes Softwarehaus für Lagerlogistik, Serie A. Hier gilt die '
        + 'Ausnahme: Investoren bekommen Unterlagen ohne Unterschrift. '
        + 'Dient nur der Teststufe.',
    highlights: [
      'Wiederkehrende Erlöse wachsen',
      'Vier zahlende Pilotkunden',
      'Gründerteam vollständig an Bord',
    ],
  },
  {
    codename: `${VORSATZ}ENTWURF`,
    art: 'ma',
    industry: 'F43 – Bauinstallation',
    region: 'Bayern',
    revenue_band: '2,5 bis 10 Mio. EUR',
    ebitda_band: '0,5 bis 1 Mio. EUR',
    deal_type: 'Nachfolge',
    status: 'draft',
    kurz: 'Erfundener Elektroinstallateur, noch im Entwurf und deshalb nicht '
        + 'auf dem Marktplatz. Dient nur der Teststufe.',
    highlights: ['Noch nicht veröffentlicht'],
  },
];

// ── Die erfundenen Interessenten, je mit ihrem Stand ────────────────────────
const INTERESSENTEN = [
  { email: `anfrage${DOMAENE}`,   vorname: 'Ada',   nachname: 'Anfrage',   firma: 'Anfrage Industrieholding',  typ: 'strategic',     stand: 'angefragt' },
  { email: `wartet${DOMAENE}`,    vorname: 'Bodo',  nachname: 'Wartet',    firma: 'Wartet Capital',            typ: 'financial',     stand: 'vereinbarung_versendet' },
  { email: `gezeichnet${DOMAENE}`, vorname: 'Cem',  nachname: 'Gezeichnet', firma: 'Gezeichnet Beteiligungen', typ: 'family_office', stand: 'unterschrieben' },
  { email: `datenraum${DOMAENE}`, vorname: 'Dana',  nachname: 'Datenraum', firma: 'Datenraum Partners',        typ: 'strategic',     stand: 'im_datenraum' },
];

// Zwei Verkaeufer, nicht einer. Mit nur einem gehoeren alle Demomandate
// derselben Person, und dann laesst sich die wichtigste Frage der
// Verkaeufersicht gar nicht stellen: Kommt jemand an ein fremdes Mandat?
// Aufgefallen beim ersten Durchgang des Drehbuchs auf der Teststufe, Punkt 1.5.
// ── Erfundenes Personal (v0.500) ───────────────────────────────────────────
//
// Anlass: Zweimal hintereinander endete eine Pruefung an derselben Stelle.
// Die Rechte-Matrix aus v0.495 liess sich von aussen nicht anfassen, weil es
// auf der Teststufe kein Konto mit interner Rolle gibt, und die Uebernahme
// eines Nutzers ins CRM (v0.499) ebenso wenig. Beides musste ich Christian
// zum Klicken geben, statt es selbst zu pruefen.
//
// Diese vier Konten schliessen die Luecke. Sie sind erfunden, tragen dasselbe
// Demokennwort und entstehen nur auf der Teststufe; das Skript weigert sich
// anderswo zu laufen (nurAufDerTeststufe). Die Verwaltung ist bewusst dabei:
// Ohne sie laesst sich keine Freigabe und keine Mandatszuordnung pruefen.
const PERSONAL = [
  { email: `verwaltung${DOMAENE}`, vorname: 'Vera', nachname: 'Verwaltung', firma: 'Phalanx GmbH', rolle: 'super_admin' },
  { email: `beratung${DOMAENE}`,   vorname: 'Bernd', nachname: 'Beratung',  firma: 'Phalanx GmbH', rolle: 'advisor' },
  { email: `assistenz${DOMAENE}`,  vorname: 'Anna', nachname: 'Assistenz',  firma: 'Phalanx GmbH', rolle: 'assistant' },
  { email: `analyse${DOMAENE}`,    vorname: 'Ada',  nachname: 'Analyse',    firma: 'Phalanx GmbH', rolle: 'analyst' },
];

const VERKAEUFER = { email: `verkaeufer${DOMAENE}`, vorname: 'Elke', nachname: 'Verkauf', firma: 'Nordlicht Holding' };
const VERKAEUFER_ZWEI = { email: `verkaeufer2${DOMAENE}`, vorname: 'Falk', nachname: 'Zweitverkauf', firma: 'Talsohle Beteiligungen' };

// Jedes Demokonto bekommt ein vollstaendiges Profil.
//
// Die Plattform verlangt neun Felder, bevor ein Interessent ein Mandat
// ueberhaupt im Detail ansehen darf (utils/profileCompleteness.js). Ohne sie
// endet jeder Durchgang am selben Punkt, mit „Bitte vervollstaendigen Sie
// zuerst Ihr Profil", und die eigentliche Frage wird nie geprueft. Genau das
// passierte beim ersten Durchgang auf der Teststufe.
//
// Dass diese Huerde hoch ist, bleibt eine eigene Beobachtung fuer die
// Vereinfachung. Hier wird sie nur aus dem Weg geraeumt.
const ANSCHRIFT = {
  salutation: 'Frau', position: 'Geschäftsführung',
  mobile: '+49 160 0000000', phone: '+49 911 0000000',
  street: 'Demoweg 1', postal_code: '90000', city: 'Demostadt',
};

// ── Die erfundenen Unterlagen ───────────────────────────────────────────────
const UNTERLAGEN = [
  { ordner: '00 Teaser',               name: 'Teaser.pdf',              stufe: 'public',   vertraulich: false },
  { ordner: '01 Informationsmemorandum', name: 'Memorandum.pdf',        stufe: 'nda',      vertraulich: false },
  { ordner: '02 Unterlagen',           name: 'Jahresabschluss.pdf',     stufe: 'dataroom', vertraulich: false },
  { ordner: '02 Unterlagen',           name: 'Personalliste.pdf',       stufe: 'dataroom', vertraulich: true },
];

/**
 * Die Demowelt aufsetzen.
 *
 * Wird sowohl vom Befehl unten als auch von der Route
 * POST /api/admin/teststufe/demowelt aufgerufen. Die Route reicht ihre eigene
 * Datenbankverbindung herein, weil die Anwendung dort schon laeuft.
 *
 * @returns {Promise<{mandate: string[], konten: Array, kennwort: string, entfernt: object|null}>}
 */
async function aufsetzen({ db, zuruecksetzen = false, leise = false } = {}) {
  stufen.nurAufDerTeststufe('Die Demowelt');
  const sag = (...a) => { if (!leise) console.log(...a); };

  let entfernt = null;
  if (zuruecksetzen) entfernt = await raeumen(db, leise);

  const admin = await db.get("SELECT * FROM users WHERE role = 'super_admin' ORDER BY id LIMIT 1");
  if (!admin) throw new Error('Es gibt kein Verwaltungskonto. Die Anwendung muss einmal gestartet worden sein.');

  const bcrypt = require('bcryptjs');
  const kennwort = process.env.DEMO_KENNWORT || 'Teststufe!2026';
  const hash = await bcrypt.hash(kennwort, 10);

  // ── Konten ────────────────────────────────────────────────────────────────
  const konto = async (p, rolle, typ) => {
    await db.run(
      `INSERT INTO users (tenant_id, email, password_hash, first_name, last_name, company, role, buyer_type,
                          salutation, position, mobile, phone, street, postal_code, city,
                          is_active, is_approved, email_verified, language)
       VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, 1, 'de')
       ON CONFLICT (email) DO UPDATE SET is_approved = 1, is_active = 1, email_verified = 1,
                                         password_hash = EXCLUDED.password_hash,
                                         -- v0.500: Auch die Rolle nachziehen. Sonst bliebe ein
                                         -- Demokonto nach einer Umbenennung auf der alten Rolle.
                                         role = EXCLUDED.role,
                                         salutation = EXCLUDED.salutation, position = EXCLUDED.position,
                                         mobile = EXCLUDED.mobile, street = EXCLUDED.street,
                                         postal_code = EXCLUDED.postal_code, city = EXCLUDED.city`,
      [p.email, hash, p.vorname, p.nachname, p.firma || null, rolle, typ || null,
        ANSCHRIFT.salutation, ANSCHRIFT.position, ANSCHRIFT.mobile, ANSCHRIFT.phone,
        ANSCHRIFT.street, ANSCHRIFT.postal_code, ANSCHRIFT.city]);
    return db.get('SELECT * FROM users WHERE email = ?', [p.email]);
  };

  // Das Personal zuerst: Die Beratung soll den Mandaten zugeordnet werden
  // koennen, sobald sie angelegt sind (v0.495 bindet sie daran).
  const personal = [];
  for (const p of PERSONAL) personal.push({ ...p, konto: await konto(p, p.rolle, null) });
  const beratung = personal.find((p) => p.rolle === 'advisor');

  const verkaeufer = await konto(VERKAEUFER, 'seller', null);
  const verkaeuferZwei = await konto(VERKAEUFER_ZWEI, 'seller', null);
  const kaeufer = [];
  for (const p of INTERESSENTEN) kaeufer.push({ ...p, konto: await konto(p, 'buyer', p.typ) });

  // ── Mandate ───────────────────────────────────────────────────────────────
  const angelegt = [];
  for (const m of MANDATE) {
    const id = await db.insert(
      `INSERT INTO projects (tenant_id, codename, mandate_type, status, created_by, industry, region,
                             revenue_band, ebitda_band, deal_type, short_description, highlights,
                             buyer_groups, visibility, sprache, uebersetzung_status)
       VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'public', 'de', 'fehlt') RETURNING id`,
      [m.codename, m.art, m.status, m.codename === `${VORSATZ}TALSOHLE` ? verkaeuferZwei.id : verkaeufer.id,
        m.industry, m.region, m.revenue_band,
        m.ebitda_band, m.deal_type, m.kurz, JSON.stringify(m.highlights),
        JSON.stringify(['strategic', 'financial', 'family_office'])]);
    angelegt.push({ ...m, id });
  }
  const nordlicht = angelegt.find((m) => m.codename === `${VORSATZ}NORDLICHT`);
  // v0.500: Die Beratung betreut NORDLICHT, TALSOHLE nicht. Damit laesst sich
  // die Mandatsbindung aus v0.495 an echten Daten pruefen, in beide
  // Richtungen: eigenes Mandat geht, fremdes nicht.
  if (beratung && nordlicht) {
    await db.run(
      `INSERT INTO project_members (tenant_id, project_id, user_id, member_role)
       VALUES (1, ?, ?, 'editor') ON CONFLICT DO NOTHING`,
      [nordlicht.id, beratung.konto.id]).catch(() => {});
  }
  const setzling = angelegt.find((m) => m.codename === `${VORSATZ}SETZLING`);

  // ── Datenraum: Ordner, Dateien, eine davon vertraulich ───────────────────
  const { getStorage } = require('../providers/storage');
  for (const m of angelegt) {
    const ordnerId = new Map();
    let pos = 0;
    for (const u of UNTERLAGEN) {
      if (!ordnerId.has(u.ordner)) {
        pos += 1;
        const id = await db.insert(
          `INSERT INTO safe_items (tenant_id, project_id, parent_id, name, is_folder, position, uploaded_by,
                                   sichtbar_ab, stand)
           VALUES (1, ?, NULL, ?, 1, ?, ?, 'public', 'freigegeben') RETURNING id`,
          [m.id, u.ordner, pos, admin.id]);
        ordnerId.set(u.ordner, id);
      }
    }
    let dpos = 0;
    for (const u of UNTERLAGEN) {
      dpos += 1;
      const inhalt = Buffer.from(
        `%PDF-1.4\n% Erfundene Unterlage der Teststufe\n% Mandat ${m.codename}\n% ${u.name}\n`
        + `% Diese Datei enthaelt keine echten Angaben.\n`);
      const schluessel = `demowelt/${m.id}/${u.name}`;
      await getStorage().put(schluessel, inhalt, 'application/pdf');
      const itemId = await db.insert(
        `INSERT INTO safe_items (tenant_id, project_id, parent_id, name, is_folder, position, uploaded_by,
                                 confidential, storage_key, size, mime, sichtbar_ab, stand)
         VALUES (1, ?, ?, ?, 0, ?, ?, ?, ?, ?, 'application/pdf', ?, 'freigegeben') RETURNING id`,
        [m.id, ordnerId.get(u.ordner), u.name, dpos, admin.id,
          u.vertraulich ? 1 : 0, schluessel, inhalt.length, u.stufe]);
      // Derselbe Bestand auch in der alten Ablage, wie in der Produktion.
      await db.run(
        `INSERT INTO documents (tenant_id, project_id, filename, file_type, file_size, access_level,
                                category, uploaded_by, storage_key, safe_item_id, folder)
         VALUES (1, ?, ?, 'application/pdf', ?, ?, ?, ?, ?, ?, ?)`,
        [m.id, u.name, inhalt.length,
          u.stufe === 'public' ? 'public' : (u.stufe === 'nda' ? 'nda' : 'approved'),
          u.stufe === 'public' ? 'teaser' : (u.stufe === 'nda' ? 'im' : 'dataroom'),
          admin.id, schluessel, itemId, u.ordner]);
    }
  }

  // ── Die vier Stände am Mandat NORDLICHT ──────────────────────────────────
  const { setStage } = require('../middleware/gates');
  for (const k of kaeufer) {
    const uid = k.konto.id;
    if (k.stand === 'angefragt') {
      await setStage(uid, nordlicht.id, 'requested', admin.id, null);
      await db.run("INSERT INTO nda_requests (tenant_id, project_id, user_id, status) VALUES (1,?,?,'requested')", [nordlicht.id, uid]);
    } else if (k.stand === 'vereinbarung_versendet') {
      await setStage(uid, nordlicht.id, 'nda_pending', admin.id, null);
      await db.run("INSERT INTO nda_requests (tenant_id, project_id, user_id, status, sent_at) VALUES (1,?,?,'sent', now())", [nordlicht.id, uid]);
    } else if (k.stand === 'unterschrieben') {
      await setStage(uid, nordlicht.id, 'nda_signed', admin.id, null);
      await setStage(uid, nordlicht.id, 'im_granted', admin.id, null);
      await db.run("INSERT INTO nda_requests (tenant_id, project_id, user_id, status, signed_at) VALUES (1,?,?,'signed', now())", [nordlicht.id, uid]);
    } else if (k.stand === 'im_datenraum') {
      await db.run("INSERT INTO nda_requests (tenant_id, project_id, user_id, status, signed_at, approved_at, approved_by) VALUES (1,?,?,'approved', now(), now(), ?)", [nordlicht.id, uid, admin.id]);
      await setStage(uid, nordlicht.id, 'dataroom_granted', admin.id, null);
    }
  }
  // Einer der Interessenten sieht sich zusätzlich die Finanzierung an, ohne
  // Unterschrift. Das ist die Ausnahme, die es nur dort gibt.
  await setStage(kaeufer[0].konto.id, setzling.id, 'requested', admin.id, null);

  // ── Ein Gespräch mit Mandatsbezug, damit der Chat nicht leer ist ─────────
  await db.run(
    `INSERT INTO connections (tenant_id, requester_id, recipient_id, status)
     VALUES (1, ?, ?, 'accepted') ON CONFLICT DO NOTHING`,
    [kaeufer[2].konto.id, admin.id]).catch(() => {});
  await db.run(
    `INSERT INTO messages (tenant_id, sender_id, recipient_id, body, project_id)
     VALUES (1, ?, ?, ?, ?)`,
    [kaeufer[2].konto.id, admin.id,
      'Guten Tag, ich habe die Vereinbarung unterzeichnet. Wann bekomme ich den Datenraum?',
      nordlicht.id]).catch(() => {});

  // ── Bericht ───────────────────────────────────────────────────────────────
  sag('\n🧪 Demowelt der Teststufe steht.\n');
  sag(`   Mandate:        ${angelegt.map((m) => m.codename).join(', ')}`);
  sag(`   Verkäufer:      ${VERKAEUFER.email} (drei Mandate)`);
  sag(`                   ${VERKAEUFER_ZWEI.email} (nur ${VORSATZ}TALSOHLE)`);
  sag('   Personal (erfunden, nur hier):');
  for (const p of personal) sag(`     ${String(p.email).padEnd(42)} ${p.rolle}`);
  sag(`                   Beratung betreut ${VORSATZ}NORDLICHT, ${VORSATZ}TALSOHLE nicht.`);
  sag('   Interessenten, je mit eigenem Stand:');
  for (const k of kaeufer) sag(`     ${String(k.email).padEnd(42)} ${k.stand}`);
  sag(`\n   Kennwort für alle Demokonten: ${kennwort}`);
  sag('   Änderbar über DEMO_KENNWORT.\n');
  sag('   Im Datenraum liegt je Mandat „Personalliste.pdf" als vertraulich.');
  sag('   Daran hing der Fehler aus v0.481: Sie darf auf keinem Weg beim Interessenten landen.\n');

  return {
    mandate: angelegt.map((m) => ({ codename: m.codename, id: m.id, art: m.art, status: m.status })),
    verkaeufer: [VERKAEUFER.email, VERKAEUFER_ZWEI.email],
    konten: kaeufer.map((k) => ({ email: k.email, stand: k.stand })),
    personal: personal.map((p) => ({ email: p.email, rolle: p.rolle })),
    kennwort,
    entfernt,
  };
}

/** Nur die Demowelt entfernen, nichts sonst. */
async function raeumen(db, leise = false) {
  const mandate = await db.all('SELECT id, codename FROM projects WHERE codename LIKE ?', [`${VORSATZ}%`]);
  const konten = await db.all('SELECT id, email FROM users WHERE email LIKE ?', [`%${DOMAENE}`]);
  const mids = mandate.map((m) => m.id);
  const uids = konten.map((k) => k.id);

  // Die Reihenfolge folgt den Fremdschlüsseln. Mandate zuerst, dann Konten.
  for (const id of mids) {
    for (const tabelle of ['safe_grants', 'safe_access_log', 'safe_items', 'document_grants']) {
      await db.run(`DELETE FROM ${tabelle} WHERE project_id = ?`, [id]).catch(() => {});
    }
    await db.run('DELETE FROM document_grants WHERE document_id IN (SELECT id FROM documents WHERE project_id = ?)', [id]).catch(() => {});
    for (const tabelle of ['documents', 'nda_requests', 'interests', 'permissions', 'messages', 'exposes']) {
      await db.run(`DELETE FROM ${tabelle} WHERE project_id = ?`, [id]).catch(() => {});
    }
    await db.run('DELETE FROM projects WHERE id = ?', [id]).catch(() => {});
  }
  for (const id of uids) {
    for (const tabelle of ['interests', 'permissions', 'nda_requests', 'safe_group_members']) {
      await db.run(`DELETE FROM ${tabelle} WHERE ${tabelle === 'nda_requests' || tabelle === 'permissions' ? 'user_id' : (tabelle === 'interests' ? 'buyer_id' : 'user_id')} = ?`, [id]).catch(() => {});
    }
    await db.run('DELETE FROM messages WHERE sender_id = ? OR recipient_id = ?', [id, id]).catch(() => {});
    await db.run('DELETE FROM connections WHERE requester_id = ? OR recipient_id = ?', [id, id]).catch(() => {});
    await db.run('DELETE FROM users WHERE id = ?', [id]).catch(() => {});
  }
  if (!leise) console.log(`🧹 Demowelt entfernt: ${mandate.length} Mandate, ${konten.length} Konten.`);
  return { mandate: mandate.length, konten: konten.length };
}

module.exports = { aufsetzen, raeumen, VORSATZ, DOMAENE };

// Als Befehl aufgerufen: eigene Verbindung oeffnen und berichten.
if (require.main === module) {
  (async () => {
    stufen.nurAufDerTeststufe('Die Demowelt');
    const db = require('../db/database');
    await db.initialize();
    await aufsetzen({ db, zuruecksetzen: process.argv.includes('--zuruecksetzen') });
    process.exit(0);
  })().catch((e) => { console.error('\n❌', e.message, '\n'); process.exit(1); });
}
