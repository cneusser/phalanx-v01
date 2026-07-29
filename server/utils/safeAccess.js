// ─────────────────────────────────────────────────────────────────────────────
// Zugriffs-Auflösung für Safe-Freigaben (Drooms-Modell). Reine Funktionen, damit
// sie testbar bleiben. Die Vererbung (Ordner-Grant wirkt auf Inhalt) wird dadurch
// abgebildet, dass der Aufrufer die Grants der Datei UND aller Elternordner sammelt.
// ─────────────────────────────────────────────────────────────────────────────

// Rang der Stufen: download schließt read ein.
function levelRank(level) {
  return level === 'download' ? 2 : level === 'read' ? 1 : 0;
}

// Passt eine Freigabe auf den Nutzer-Kontext?
//   userCtx = { userId, buyerType, isParty, groupIds:Set<number> }
function grantMatchesUser(grant, userCtx) {
  switch (grant.subject_type) {
    case 'user':        return Number(grant.subject_ref) === Number(userCtx.userId);
    case 'buyer_group': return !!userCtx.buyerType && String(grant.subject_ref) === String(userCtx.buyerType);
    case 'party_all':   return !!userCtx.isParty;
    case 'group':       return userCtx.groupIds instanceof Set && userCtx.groupIds.has(Number(grant.subject_ref));
    default:            return false;
  }
}

// Höchste zutreffende Stufe aus einer Liste von Grants (Datei + Elternordner).
// Rückgabe: null | 'read' | 'download'
function resolveLevel(grants, userCtx) {
  let best = 0;
  for (const g of grants || []) {
    if (grantMatchesUser(g, userCtx)) best = Math.max(best, levelRank(g.level));
  }
  return best === 2 ? 'download' : best === 1 ? 'read' : null;
}

module.exports = { levelRank, grantMatchesUser, resolveLevel };
