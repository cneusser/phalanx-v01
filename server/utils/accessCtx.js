// Nutzer-Kontext für die feingranulare Freigabe-Auflösung (safeAccess.resolveLevel).
// Liefert { userId, buyerType, isParty, groupIds:Set<number> }.
const db = require('./../db/database');

async function buildUserCtx(user, projectId) {
  let buyerType = user && user.buyer_type ? user.buyer_type : null;
  if (!buyerType && user) {
    const u = await db.get('SELECT buyer_type FROM users WHERE id = ?', [user.id]).catch(() => null);
    buyerType = u ? u.buyer_type : null;
  }
  // Beteiligter am Mandat: hat ein Interesse (nicht abgelehnt) an diesem Projekt.
  const party = await db.get(
    `SELECT 1 FROM interests WHERE buyer_id = ? AND project_id = ? AND stage <> 'rejected' LIMIT 1`,
    [user.id, projectId]).catch(() => null);
  const gm = await db.all('SELECT group_id FROM safe_group_members WHERE user_id = ?', [user.id]).catch(() => []);
  return {
    userId: user.id,
    buyerType,
    isParty: !!party,
    groupIds: new Set((gm || []).map((g) => Number(g.group_id))),
  };
}

module.exports = { buildUserCtx };
