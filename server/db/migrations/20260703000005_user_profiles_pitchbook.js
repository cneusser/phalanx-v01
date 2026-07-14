/**
 * Pitchbook-Profilfelder für Investoren & Verkäufer:
 * Selbstdarstellung (about), Website, LinkedIn, sichtbar für Admin
 * (und ab Sprint 4 gegenüber der jeweiligen Gegenseite im Prozess).
 */
exports.up = async function (knex) {
  await knex.schema.alterTable('users', (t) => {
    t.text('about');
    t.text('website');
    t.text('linkedin_url');
  });
};

exports.down = async function (knex) {
  await knex.schema.alterTable('users', (t) => {
    t.dropColumns('about', 'website', 'linkedin_url');
  });
};
