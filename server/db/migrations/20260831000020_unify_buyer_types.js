/**
 * v0.313: Käufertypen vereinheitlichen.
 *
 * Es gab zwei Wertelisten nebeneinander:
 *   Registrierung: strategic · financial · family_office · successor · advisor
 *   CRM:           strategic · financial · private · advisor_mandate
 *
 * Das war nicht nur unschön, es war ein Fehler: Die Käufergruppen-Zielsteuerung
 * vergleicht projects.buyer_groups mit users.buyer_type. Wer sich als
 * „family_office", „successor" oder „advisor" registriert hatte, konnte deshalb
 * von keiner Zielgruppe erfasst werden.
 *
 * Kanonisch gilt ab jetzt überall:
 *   strategic · financial · business_angel · venture_capital ·
 *   family_office · successor · private · advisor_mandate
 *
 * Nur der Altwert 'advisor' muss umgeschlüsselt werden, die übrigen sind bereits
 * Teil der neuen Liste.
 */
exports.up = async function (knex) {
  await knex.raw(`UPDATE users SET buyer_type = 'advisor_mandate' WHERE buyer_type = 'advisor'`).catch(() => {});
  await knex.raw(`UPDATE crm_contacts SET buyer_type = 'advisor_mandate' WHERE buyer_type = 'advisor'`).catch(() => {});
};

exports.down = async function (knex) {
  await knex.raw(`UPDATE users SET buyer_type = 'advisor' WHERE buyer_type = 'advisor_mandate'`).catch(() => {});
};
