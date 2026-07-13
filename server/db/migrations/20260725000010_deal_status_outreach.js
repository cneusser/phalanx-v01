/**
 * Neuer Deal-Status „Ansprache" (outreach) zwischen „Teaser live" und „In Diligence".
 *
 * Der Marktplatz-Teaser steht — jetzt läuft die aktive Käuferansprache über den
 * CRM-Funnel. Erst wenn ein Interessent in die Prüfung geht, wechselt das Mandat
 * nach „In Diligence". Ohne diese Stufe sah jedes laufende Mandat gleich aus.
 */
exports.up = async function (knex) {
  await knex.raw(`ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_deal_status_check`);
  await knex.raw(`
    ALTER TABLE projects ADD CONSTRAINT projects_deal_status_check
    CHECK (deal_status IN ('draft','teaser_live','outreach','in_diligence','loi','closed','withdrawn'))
  `);
};

exports.down = async function (knex) {
  await knex.raw(`UPDATE projects SET deal_status = 'teaser_live' WHERE deal_status = 'outreach'`);
  await knex.raw(`ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_deal_status_check`);
  await knex.raw(`
    ALTER TABLE projects ADD CONSTRAINT projects_deal_status_check
    CHECK (deal_status IN ('draft','teaser_live','in_diligence','loi','closed','withdrawn'))
  `);
};
