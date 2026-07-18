/**
 * v0.291, Stufe A des DUB-Verkäufer-Benchmarks (siehe ROADMAP Sprint 25).
 *
 * Zwei Dinge:
 *   1. Käufertyp am Kontakt: neue Spalte crm_contacts.buyer_type
 *      (strategic | financial | private | advisor_mandate | NULL). Dient als
 *      Klassifikation und Filter im CRM und später im Käufer-Matching.
 *   2. Der Deal-Funnel bekommt die transaktionsnahen Spätstufen bis Closing.
 *      Die vorderen Stufen 0..2 (Longlist, Angesprochen, Rückmeldung) bleiben
 *      unverändert, weil die Automatik (outreach, inbound, campaigns) auf ihnen
 *      aufsetzt. Ab Stufe 3 wird die Leiter neu geordnet:
 *
 *        alt: 3 NDA · 4 IM · 5 Gespräch · 6 Angebot/LOI · 7 DD · 8 Abgeschlossen
 *        neu: 3 Match · 4 NDA · 5 IM · 6 Gespräch · 7 LOI eingereicht ·
 *             8 LOI unterschrieben · 9 Namensnennung · 10 Due Diligence ·
 *             11 Signing · 12 Closing
 *
 *      Bestandsdaten werden entsprechend hochgemappt (absteigend, damit keine
 *      Stufen kollidieren). dealSync-Ziele werden im Code parallel angehoben.
 */
exports.up = async function (knex) {
  // 1) Käufertyp am Kontakt
  const hasBuyerType = await knex.schema.hasColumn('crm_contacts', 'buyer_type').catch(() => false);
  if (!hasBuyerType) {
    await knex.schema.alterTable('crm_contacts', (t) => {
      // strategic | financial | private | advisor_mandate | NULL (unbekannt)
      t.text('buyer_type');
    });
  }

  // 2) Bestandsstufen auf die neue Leiter heben (absteigend, kollisionsfrei)
  const remap = [[8, 12], [7, 10], [6, 7], [5, 6], [4, 5], [3, 4]];
  for (const [from, to] of remap) {
    await knex.raw('UPDATE crm_deal_parties SET funnel_stage = ? WHERE funnel_stage = ?', [to, from]).catch(() => {});
  }
};

exports.down = async function (knex) {
  // Stufen zurückmappen (aufsteigend)
  const remap = [[4, 3], [5, 4], [6, 5], [7, 6], [10, 7], [12, 8]];
  for (const [from, to] of remap) {
    await knex.raw('UPDATE crm_deal_parties SET funnel_stage = ? WHERE funnel_stage = ?', [to, from]).catch(() => {});
  }
  const hasBuyerType = await knex.schema.hasColumn('crm_contacts', 'buyer_type').catch(() => false);
  if (hasBuyerType) {
    await knex.schema.alterTable('crm_contacts', (t) => t.dropColumn('buyer_type'));
  }
};
