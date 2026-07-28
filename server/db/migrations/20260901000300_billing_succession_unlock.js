/**
 * Neuer Abrechnungstyp „succession_unlock": Freischaltung der Nachfolge-
 * Kandidaten je Mandat (Bezahlschritt für den Übergeber). Erweitert die
 * CHECK-Bedingung auf billing_events.event_type.
 */
exports.up = async function (knex) {
  await knex.raw('ALTER TABLE billing_events DROP CONSTRAINT IF EXISTS billing_events_type_check').catch(() => {});
  await knex.raw(`ALTER TABLE billing_events ADD CONSTRAINT billing_events_type_check
    CHECK (event_type IN ('subscription','deal_setup','dataroom_tier','succession_unlock'))`).catch(() => {});
};

exports.down = async function (knex) {
  await knex.raw('ALTER TABLE billing_events DROP CONSTRAINT IF EXISTS billing_events_type_check').catch(() => {});
  await knex.raw(`ALTER TABLE billing_events ADD CONSTRAINT billing_events_type_check
    CHECK (event_type IN ('subscription','deal_setup','dataroom_tier'))`).catch(() => {});
};
