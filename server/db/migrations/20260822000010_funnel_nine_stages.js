/**
 * v0.302: Der Funnel wird auf neun klare Stufen verdichtet.
 *
 * Die 14 Stufen waren fachlich richtig, aber im Board unübersichtlich. Mehrere
 * Zwischenschritte (Rückmeldung, Match, Gespräch, Namensnennung, Due Diligence)
 * beschreiben Zustände innerhalb einer Phase und werden in diese eingeordnet.
 * Namensnennung und Due Diligence bleiben als Merkmal am Beteiligten erhalten
 * (identity_revealed bzw. Zugang), nur als eigene Spalte entfallen sie.
 *
 *   neu: 0 Longlist zur Freigabe · 1 Shortlist freigegeben · 2 Ansprache ·
 *        3 NDA · 4 Datenraum-Zugang · 5 LOI · 6 Verhandlung ·
 *        7 Closing / Signing · 8 Abschluss
 *
 * Verdichtung (alt → neu), in einem Durchgang per CASE, damit nichts kollidiert:
 *   0 Longlist→0 · 1 Freigabe Verkäufer→1 · 2 Angesprochen→2 · 3 Rückmeldung→2 ·
 *   4 Match→2 · 5 NDA→3 · 6 IM/Unterlagen→4 · 7 Gespräch→4 · 8 LOI eingereicht→5 ·
 *   9 LOI unterschrieben→6 · 10 Namensnennung→6 · 11 Due Diligence→6 ·
 *   12 Signing→7 · 13 Closing→8
 */
const CASE_SQL = `CASE funnel_stage
  WHEN 0 THEN 0 WHEN 1 THEN 1 WHEN 2 THEN 2 WHEN 3 THEN 2 WHEN 4 THEN 2
  WHEN 5 THEN 3 WHEN 6 THEN 4 WHEN 7 THEN 4 WHEN 8 THEN 5
  WHEN 9 THEN 6 WHEN 10 THEN 6 WHEN 11 THEN 6 WHEN 12 THEN 7 WHEN 13 THEN 8
  ELSE funnel_stage END`;

exports.up = async function (knex) {
  // Mailings können ins Archiv wandern, damit die Liste im Board kurz bleibt
  const hasArchived = await knex.schema.hasColumn('crm_campaigns', 'archived_at').catch(() => false);
  if (!hasArchived) {
    await knex.schema.alterTable('crm_campaigns', (t) => t.timestamp('archived_at', { useTz: true }));
  }

  await knex.raw(`UPDATE crm_deal_parties SET funnel_stage = ${CASE_SQL}`).catch(() => {});

  // Zielstufen der Mailvorlagen mitziehen (Spalte heißt dort ebenfalls stage)
  const hasStage = await knex.schema.hasColumn('mail_templates', 'stage').catch(() => false);
  if (hasStage) {
    await knex.raw(`UPDATE mail_templates SET stage = ${CASE_SQL.replace(/funnel_stage/g, 'stage')}`).catch(() => {});
  }

  // Freigegebene Kandidaten stehen ab jetzt auf „Shortlist freigegeben" (1),
  // noch offene bleiben in „Longlist zur Freigabe" (0).
  await knex.raw(
    `UPDATE crm_deal_parties SET funnel_stage = 1
      WHERE party_role = 'buyer' AND seller_approved = 1 AND funnel_stage = 0`).catch(() => {});
  await knex.raw(
    `UPDATE crm_deal_parties SET funnel_stage = 0
      WHERE party_role = 'buyer' AND COALESCE(seller_approved, 0) = 0 AND funnel_stage = 1`).catch(() => {});
};

exports.down = async function () {
  // Bewusst ohne Rücknahme: die Verdichtung lässt sich nicht verlustfrei umkehren.
};
