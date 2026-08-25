/**
 * Vorbereitetes Suchprofil am CRM-Kontakt.
 *
 * Neue Spalte crm_contacts.pending_search_profile_json: der Berater kann für einen
 * eingeladenen Käufer ein Suchprofil hinterlegen. Sobald sich die Person registriert,
 * wird daraus ein echtes Suchprofil des Kontos (search_profiles), das automatisch
 * gegen neue Mandate matcht. Danach wird die Spalte geleert.
 *
 * Seed: für Christoph Giesen (Motus Unternehmerkapital / Kernfels Gruppe) wird das
 * Buy-Side-Suchprofil vorbereitet, damit er ab Registrierung Mandate erhält.
 */
const PROFILE = JSON.stringify({
  name: 'Kernfels Gruppe: Sicherheits- und Kommunikationstechnik (Buy-and-Build)',
  notify_frequency: 'instant',
  // Bewusst breit gehalten (alle neuen M&A-/Nachfolge-Mandate), damit nichts
  // Passendes verloren geht. Gewerke, Größe und Region lassen sich im Konto
  // jederzeit verfeinern; der Abgleich unterstützt Listen für industries/regions.
  criteria: {
    mandate_type: 'ma',
    industries: [],
    regions: [],
    deal_types: [],
  },
});

exports.up = async function (knex) {
  const has = await knex.schema.hasColumn('crm_contacts', 'pending_search_profile_json').catch(() => false);
  if (!has) {
    await knex.schema.alterTable('crm_contacts', (t) => t.text('pending_search_profile_json'));
  }
  await knex('crm_contacts')
    .whereRaw('lower(email) = lower(?)', ['christoph@motus-unternehmerkapital.de'])
    .whereNull('user_id')
    .update({ pending_search_profile_json: PROFILE })
    .catch(() => {});
};

exports.down = async function (knex) {
  const has = await knex.schema.hasColumn('crm_contacts', 'pending_search_profile_json').catch(() => false);
  if (has) {
    await knex.schema.alterTable('crm_contacts', (t) => t.dropColumn('pending_search_profile_json'));
  }
};
