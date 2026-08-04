// Einladungszweck an crm_invitations: 'default' (Plattform) oder 'successor'
// (Nachfolge-Netzwerk). Damit die Einwilligungsseite den Käufertyp vorbelegen kann.
exports.up = async function (knex) {
  const has = await knex.schema.hasColumn('crm_invitations', 'purpose').catch(() => false);
  if (!has) await knex.schema.alterTable('crm_invitations', (t) => { t.text('purpose').notNullable().defaultTo('default'); });
};
exports.down = async function (knex) {
  const has = await knex.schema.hasColumn('crm_invitations', 'purpose').catch(() => false);
  if (has) await knex.schema.alterTable('crm_invitations', (t) => { t.dropColumn('purpose'); }).catch(() => {});
};
