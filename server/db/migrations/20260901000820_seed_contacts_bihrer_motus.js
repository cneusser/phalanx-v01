/**
 * Seed: zwei neue Kandidaten für CapitalMatch.
 *
 *   1. Thomas Bihrer (Privatperson) · Interessent für Mandat „Cudd" (via DUB.de).
 *      Wird als CRM-Kontakt angelegt und als Käufer-Partei am Mandat Cudd auf
 *      Stufe „Rückmeldung" in den Funnel gesetzt (er hat Interesse bekundet).
 *
 *   2. Christoph Giesen · Motus Unternehmerkapital GmbH (Marke „Kernfels Gruppe").
 *      Buy-Side-Suchmandat (Finanzinvestor / Buy-and-Build). Kontakt + Unternehmen
 *      werden angelegt, das Suchprofil landet in den Notizen des Kontakts.
 *
 * DSGVO: beide mit consent_status = 'unknown'. Die eigentliche Einladung mit dem
 * tokenisierten Registrierungslink löst der Berater danach mit einem Klick im CRM
 * aus („Einladen"), das erzeugt die Double-Opt-in-Mail. Keine Mail aus der Migration.
 *
 * Idempotent: vorhandene Datensätze (Abgleich über E-Mail) werden übersprungen.
 */
exports.up = async function (knex) {
  const admin = await knex('users').where({ email: 'neusser@phalanx.de' }).first().catch(() => null);
  const adminId = admin ? admin.id : null;

  const idOf = (ins) => (typeof ins === 'object' && ins !== null ? ins.id : ins);
  async function upsertContact(data) {
    let c = await knex('crm_contacts').whereRaw('lower(email) = lower(?)', [data.email]).first().catch(() => null);
    if (c) return { id: c.id, existed: true };
    const [ins] = await knex('crm_contacts').insert({ tenant_id: 1, created_by: adminId, ...data }).returning('id');
    return { id: idOf(ins), existed: false };
  }

  // ── 1) Thomas Bihrer (Privatperson, Interessent Cudd) ──────────────────────
  const bihrer = await upsertContact({
    salutation: 'Herr',
    first_name: 'Thomas',
    last_name: 'Bihrer',
    email: 'thbihrer@hotmail.com',
    mobile: '+41 79 403 22 00',
    phone: '+41 79 403 22 00',
    location: 'Zürich, Schweiz',
    buyer_type: 'private',
    relationship: 'kalt',
    consent_status: 'unknown',
    contact_status: 'active',
    notes:
      'Quelle: DUB.de. Hat Interesse an Mandat „Cudd" (Etablierte Premium-Kinderlifestyle-Marke) bekundet. ' +
      'Adresse laut DUB: Witikonerstr., Zürich, Schweiz. Kontakt: thbihrer@hotmail.com · +41 79 403 22 00.',
    tags_json: JSON.stringify(['DUB.de', 'Cudd', 'Privatkäufer']),
  });

  // Käufer-Partei am Mandat Cudd (Stufe 2 = Rückmeldung), falls Mandat vorhanden.
  const cudd = await knex('projects').where({ codename: 'Cudd' }).first().catch(() => null);
  if (cudd) {
    const party = await knex('crm_deal_parties')
      .where({ project_id: cudd.id, contact_id: bihrer.id }).first().catch(() => null);
    if (!party) {
      await knex('crm_deal_parties').insert({
        tenant_id: 1, project_id: cudd.id, contact_id: bihrer.id,
        party_role: 'buyer', funnel_stage: 2, party_status: 'open',
        replied: 1, mails_sent: 0,
        next_step: 'Interessensbekundung über DUB prüfen, Einladung zu CapitalMatch senden',
        stage_changed_at: knex.fn.now(), created_by: adminId,
      }).catch(() => {});
    }
  }

  // ── 2) Motus Unternehmerkapital · Christoph Giesen (Buy-Side-Suchmandat) ────
  const norm = 'motus unternehmerkapital';
  let company = await knex('crm_companies').where({ name_normalized: norm }).first().catch(() => null);
  if (!company) {
    const [ins] = await knex('crm_companies').insert({
      tenant_id: 1, name: 'Motus Unternehmerkapital GmbH', name_normalized: norm,
      company_type: 'Finanzinvestor', created_by: adminId,
    }).returning('id');
    company = { id: idOf(ins) };
  }

  const suchprofil =
    'Buy-Side-Suchmandat (Marke „Kernfels Gruppe", www.kernfels.de). Aufbau eines gewerkeübergreifenden ' +
    'Anbieters für Planung, Integration und Betrieb von Leitstellen, Netzen und Sicherheitstechnik; Fokuskunden ' +
    'in Verteidigung und kritischer Infrastruktur. Ohne festen Exit-Zeitpunkt, getragen von mehreren Unternehmerfamilien.\n' +
    'Gewerke: Audio- und Videotechnik · Elektro- und Datentechnik · Sicherheitstechnik · Konnektivität · Cybersecurity ' +
    '(auch ohne heutigen Bezug zu Verteidigung oder KRITIS).\n' +
    'Größe: 0,5 bis 5,0 Mio. EUR nachhaltiges EBIT, ab 20 Mitarbeitende.\n' +
    'Region: DACH, im NATO-Raum grundsätzlich möglich.\n' +
    'Merkmale: langjährige Kundenbeziehungen, tiefe Gewerke-Expertise, gut ausgebildete Belegschaft.\n' +
    'Konstellationen: Nachfolge (strukturierte Übergabe 1 bis 5 Jahre) oder Teilverkauf mit Rückbeteiligung auf ' +
    'Gruppenebene, Unternehmer bleibt operativ an Bord. Zusage: Firmenname, Standort und Belegschaft bleiben erhalten.\n' +
    'Firmensitz: Schleißheimer Straße 27, 80333 München · Amtsgericht Hamburg, HRB 187660 · ' +
    'Geschäftsführung: Harvey Gross, Michael Wild.';

  const giesen = await upsertContact({
    salutation: 'Herr',
    first_name: 'Christoph',
    last_name: 'Giesen',
    responsibility: 'Partner',
    email: 'christoph@motus-unternehmerkapital.de',
    mobile: '+49 160 3000 416',
    phone: '+49 160 3000 416',
    location: 'München',
    buyer_type: 'financial',
    relationship: 'kalt',
    consent_status: 'unknown',
    contact_status: 'active',
    notes: suchprofil,
    tags_json: JSON.stringify(['Buy-Side', 'Suchmandat', 'Kernfels', 'Sicherheitstechnik', 'KRITIS']),
  });
  const linked = await knex('crm_company_contacts')
    .where({ company_id: company.id, contact_id: giesen.id }).first().catch(() => null);
  if (!linked) {
    await knex('crm_company_contacts').insert({
      tenant_id: 1, company_id: company.id, contact_id: giesen.id,
    }).catch(() => {});
  }

  console.log(`👥 Seed Kandidaten: Bihrer ${bihrer.existed ? '(vorhanden)' : 'neu'}, Giesen/Motus ${giesen.existed ? '(vorhanden)' : 'neu'}`);
};

exports.down = async function (knex) {
  // Nur die beiden Seed-Kontakte (und Bihrers Funnel-Eintrag) wieder lösen.
  const emails = ['thbihrer@hotmail.com', 'christoph@motus-unternehmerkapital.de'];
  const rows = await knex('crm_contacts').whereRaw('lower(email) = any(?)', [emails]).select('id').catch(() => []);
  const ids = rows.map((r) => r.id);
  if (ids.length) {
    await knex('crm_deal_parties').whereIn('contact_id', ids).del().catch(() => {});
    await knex('crm_company_contacts').whereIn('contact_id', ids).del().catch(() => {});
    await knex('crm_contacts').whereIn('id', ids).del().catch(() => {});
  }
  await knex('crm_companies').where({ name_normalized: 'motus unternehmerkapital' }).del().catch(() => {});
};
