// ─────────────────────────────────────────────────────────────────────────────
// v0.272: Gemeinsame Ingest-Logik für Marktplatz-Leads.
//
// Wird von zwei Wegen genutzt:
//   · dem Admin-Dialog „Anfrage einfügen" (POST /api/crm/leads/ingest)
//   · dem Brevo-Inbound-Webhook (weitergeleitete E-Mail, POST /api/inbound/lead)
//
// `q` ist ein DB-Handle mit get/insert/run (mandantengebunden über scoped im
// Admin-Weg, im Webhook der Standard-Mandant). So bleibt die Logik an einer Stelle.
// ─────────────────────────────────────────────────────────────────────────────

// Mandat aus dem Codename-Hinweis der Anfrage finden (ilike)
async function findProjectByHint(q, hint) {
  if (!hint) return null;
  const like = `%${String(hint).toLowerCase()}%`;
  return q.get(`SELECT id, codename FROM projects WHERE lower(codename) LIKE ? ORDER BY id DESC LIMIT 1`, [like]).catch(() => null);
}

/**
 * Legt aus einem geparsten Lead Kontakt + Funnel-Partei an (oder aktualisiert sie).
 * @param {object} q       DB-Handle { get, insert, run }
 * @param {object} opts    { tenant, lead, projectId, actorId, auditLog }
 * @returns {object}       { contact_id, created, project_id, party_id, lead_source, lead_ref }
 */
async function ingestLead(q, { tenant = 1, lead, projectId = null, actorId = null, auditLog = null } = {}) {
  const c = (lead && lead.contact) || {};
  if (!c.last_name && !c.email) throw new Error('Ohne Name oder E-Mail lässt sich kein Kontakt anlegen.');

  if (!projectId) { const p = await findProjectByHint(q, lead.projectHint); projectId = p ? p.id : null; }

  const leadSource = lead.sourceLabel || 'Unternehmens-Marktplatz';
  const leadRef = [lead.inserat ? `Inserat ${lead.inserat}` : '', lead.ref && lead.ref !== lead.inserat ? `Referenz ${lead.ref}` : '']
    .filter(Boolean).join(', ');

  // Kontakt: per E-Mail wiederverwenden, sonst neu. Herkunft immer festhalten.
  const existingContact = c.email
    ? await q.get('SELECT * FROM crm_contacts WHERE lower(email) = lower(?) LIMIT 1', [c.email]).catch(() => null)
    : null;
  let contactId, created = false;
  if (existingContact) {
    contactId = existingContact.id;
    await q.run(
      `UPDATE crm_contacts SET
         phone = COALESCE(NULLIF(?, ''), phone), location = COALESCE(NULLIF(?, ''), location),
         lead_source = ?, lead_ref = ?, source = COALESCE(source, 'inbound')
       WHERE id = ?`,
      [c.phone || '', c.location || '', leadSource, leadRef, contactId]).catch(() => {});
  } else {
    contactId = await q.insert(
      `INSERT INTO crm_contacts (tenant_id, salutation, title, first_name, last_name, email, phone, location,
                                 source, lead_source, lead_ref, consent_status, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'inbound', ?, ?, 'unknown', ?)`,
      [tenant, c.salutation || null, c.title || null, c.first_name || '', c.last_name || (c.email || '').split('@')[0],
       c.email || null, c.phone || null, c.location || null, leadSource, leadRef, actorId]);
    created = true;
  }

  // Firma optional anlegen und verknüpfen (ohne Dublette)
  if (c.company) {
    const comp = await q.get('SELECT id FROM crm_companies WHERE lower(name) = lower(?) LIMIT 1', [c.company]).catch(() => null)
      || { id: await q.insert('INSERT INTO crm_companies (tenant_id, name, created_by) VALUES (?, ?, ?)', [tenant, c.company, actorId]) };
    const linked = await q.get('SELECT id FROM crm_company_contacts WHERE company_id = ? AND contact_id = ? LIMIT 1', [comp.id, contactId]).catch(() => null);
    if (!linked) await q.run('INSERT INTO crm_company_contacts (tenant_id, company_id, contact_id) VALUES (?, ?, ?)', [tenant, comp.id, contactId]).catch(() => {});
  }

  // In den Funnel: aktiver Inbound-Lead auf Stufe „Rückmeldung" (2)
  let party = null;
  if (projectId) {
    const existing = await q.get('SELECT id, funnel_stage FROM crm_deal_parties WHERE project_id = ? AND contact_id = ?', [projectId, contactId]).catch(() => null);
    if (existing) {
      await q.run(
        `UPDATE crm_deal_parties SET funnel_stage = GREATEST(funnel_stage, 3), party_status = 'active',
           source = CASE WHEN source = 'outreach' THEN source ELSE 'inbound' END,
           inbound_signal = 'marketplace', inbound_at = now() WHERE id = ?`, [existing.id]).catch(() => {});
      party = existing.id;
    } else {
      party = await q.insert(
        `INSERT INTO crm_deal_parties (tenant_id, project_id, contact_id, party_role, funnel_stage, party_status,
                                       source, inbound_signal, inbound_at, created_by)
         VALUES (?, ?, ?, 'buyer', 2, 'active', 'inbound', 'marketplace', now(), ?)`,
        [tenant, projectId, contactId, actorId]);
    }
  }

  if (auditLog) {
    auditLog(actorId, 'CRM_LEAD_INGEST', 'crm_contact', contactId,
      `${leadSource}${leadRef ? ' · ' + leadRef : ''}${projectId ? ' · Mandat #' + projectId : ' · ohne Mandat'}`, null);
  }

  return { contact_id: contactId, created, project_id: projectId, party_id: party, lead_source: leadSource, lead_ref: leadRef };
}

module.exports = { findProjectByHint, ingestLead };
