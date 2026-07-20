/**
 * v0.300: Stufen in den Mailvorlagen auf die aktuelle Funnel-Leiter heben.
 *
 * Die Vorlagen tragen eine Zielstufe („beim Versand auf diese Stufe setzen").
 * Diese Werte stammen noch aus der ursprünglichen Leiter und wurden bei den
 * beiden Umnummerierungen (v0.291 Spätstufen, v0.296 Freigabe Verkäufer) nicht
 * mitgezogen. Dadurch hätte z. B. „NDA anfordern" auf „Match" gestuft.
 *
 *   ursprünglich → v0.291 → v0.296 (aktuell)
 *     0 Longlist        →  0 →  0
 *     1 Angesprochen    →  1 →  2
 *     2 Rückmeldung     →  2 →  3
 *     3 NDA             →  4 →  5
 *     4 IM/Unterlagen   →  5 →  6
 *     5 Gespräch        →  6 →  7
 *     6 Angebot/LOI     →  7 →  8
 *     7 Due Diligence   → 10 → 11
 *     8 Abgeschlossen   → 12 → 13
 *
 * Absteigend anwenden, damit keine Stufe eine andere überschreibt.
 */
const REMAP = [[8, 13], [7, 11], [6, 8], [5, 7], [4, 6], [3, 5], [2, 3], [1, 2]];

exports.up = async function (knex) {
  const has = await knex.schema.hasColumn('mail_templates', 'stage').catch(() => false);
  if (!has) return;
  for (const [from, to] of REMAP) {
    await knex.raw('UPDATE mail_templates SET stage = ? WHERE stage = ?', [to, from]).catch(() => {});
  }
};

exports.down = async function (knex) {
  const has = await knex.schema.hasColumn('mail_templates', 'stage').catch(() => false);
  if (!has) return;
  for (const [from, to] of [...REMAP].reverse()) {
    await knex.raw('UPDATE mail_templates SET stage = ? WHERE stage = ?', [from, to]).catch(() => {});
  }
};
