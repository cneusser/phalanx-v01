/**
 * Seed: neuer DUB-Kontakt Alexander Kubald (M&A-Berater mit Suchmandat),
 * Interessent für das Mandat „Betongold". Kontakt + Beratungsunternehmen anlegen
 * und als Käufer-Partei am Mandat Betongold auf Stufe „Rückmeldung" in den Funnel
 * setzen (Interesse über DUB bekundet).
 *
 * DSGVO: consent_status = 'unknown'. Die Einladung mit Registrierungslink löst
 * der Berater danach per Klick im CRM aus (Double-Opt-in). Keine Mail aus der Migration.
 *
 * Idempotent: vorhandene Datensätze (Abgleich über E-Mail) werden übersprungen.
 */
exports.up = async function (knex) {
  const admin = await knex('users').where({ email: 'neusser@phalanx.de' }).first().catch(() => null);
  const adminId = admin ? admin.id : null;
  const idOf = (ins) => (typeof ins === 'object' && ins !== null ? ins.id : ins);

  // Beratungsunternehmen
  const norm = 'kubald';
  let company = await knex('crm_companies').where({ name_normalized: norm }).first().catch(() => null);
  if (!company) {
    const [ins] = await knex('crm_companies').insert({
      tenant_id: 1, name: 'Kubald (M&A-Beratung)', name_normalized: norm,
      company_type: 'Berater', created_by: adminId,
    }).returning('id');
    company = { id: idOf(ins) };
  }

  // Kontakt (eindeutig über E-Mail)
  let contact = await knex('crm_contacts').whereRaw('lower(email) = lower(?)', ['kubald@kubald.de']).first().catch(() => null);
  if (!contact) {
    const [ins] = await knex('crm_contacts').insert({
      tenant_id: 1, salutation: 'Herr', first_name: 'Alexander', last_name: 'Kubald',
      email: 'kubald@kubald.de', phone: '+49 172 5115555', mobile: '+49 172 5115555',
      location: 'Hannover', responsibility: 'M&A-Berater mit Suchmandat',
      buyer_type: 'advisor_mandate', relationship: 'kalt',
      consent_status: 'unknown', contact_status: 'active', created_by: adminId,
      notes: 'Quelle: DUB.de. M&A-Berater mit Suchmandat, hat Interesse an Mandat „Betongold" bekundet. '
        + 'Adresse: Henniesruh 16, 30655 Hannover. Kontakt: kubald@kubald.de · +49 172 5115555.',
      tags_json: JSON.stringify(['DUB.de', 'Betongold', 'Berater', 'Suchmandat']),
    }).returning('id');
    contact = { id: idOf(ins) };
  }

  // Zuordnung Kontakt <-> Unternehmen
  const link = await knex('crm_company_contacts').where({ company_id: company.id, contact_id: contact.id }).first().catch(() => null);
  if (!link) {
    await knex('crm_company_contacts').insert({ tenant_id: 1, company_id: company.id, contact_id: contact.id }).catch(() => {});
  }

  // Käufer-Partei am Mandat Betongold (Stufe 2 = Rückmeldung), falls Mandat vorhanden
  const bg = await knex('projects').where({ codename: 'Betongold' }).first().catch(() => null);
  if (bg) {
    const party = await knex('crm_deal_parties').where({ project_id: bg.id, contact_id: contact.id }).first().catch(() => null);
    if (!party) {
      await knex('crm_deal_parties').insert({
        tenant_id: 1, project_id: bg.id, company_id: company.id, contact_id: contact.id,
        party_role: 'advisor', funnel_stage: 2, party_status: 'open', replied: 1, mails_sent: 0,
        next_step: 'Interessensbekundung über DUB prüfen, Einladung zu CapitalMatch senden',
        stage_changed_at: knex.fn.now(), created_by: adminId,
      }).catch(() => {});
    }
  }

  console.log('👤 Seed Kandidat: Alexander Kubald (Betongold) angelegt/geprüft.');
};

exports.down = async function (knex) {
  const rows = await knex('crm_contacts').whereRaw('lower(email) = lower(?)', ['kubald@kubald.de']).select('id').catch(() => []);
  const ids = rows.map((r) => r.id);
  if (ids.length) {
    await knex('crm_deal_parties').whereIn('contact_id', ids).del().catch(() => {});
    await knex('crm_company_contacts').whereIn('contact_id', ids).del().catch(() => {});
    await knex('crm_contacts').whereIn('id', ids).del().catch(() => {});
  }
  await knex('crm_companies').where({ name_normalized: 'kubald' }).del().catch(() => {});
};
