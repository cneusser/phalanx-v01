// ─────────────────────────────────────────────────────────────────────────────
// Sprint 19: Zugriffsrollen auf Mandatsebene (Grundlage für Einladungen).
//
// Bis Sprint 18 galt: JEDE Zeile in project_members = Vollzugriff (pflegen,
// Exposé veröffentlichen, Safe schreiben/löschen). Mit „Betrachter" (viewer)
// wäre das ein Sicherheitsloch. Deshalb hier EINE zentrale Auflösung:
//
//   'manager' → Admin/Berater/Tenant-Owner, Ersteller, Mitglied mit member_role='editor'
//   'viewer'  → Mitglied mit member_role='viewer' (nur lesen)
//   null      → kein Zugriff
//
// `get` ist eine async (sql, params) => row Funktion, damit sowohl die
// Default-Verbindung (db.get) als auch tenant-scoped Aufrufe (scoped(req, …))
// genutzt werden können.
// ─────────────────────────────────────────────────────────────────────────────
const ADMIN_ROLES = ['super_admin', 'advisor', 'tenant_owner'];

async function roleFor(get, user, projectId) {
  if (!user || !projectId) return null;
  if (ADMIN_ROLES.includes(user.role)) return 'manager';

  const p = await get('SELECT created_by FROM projects WHERE id = ?', [projectId]);
  if (!p) return null;
  if (p.created_by === user.id) return 'manager';

  const m = await get(
    'SELECT member_role FROM project_members WHERE project_id = ? AND user_id = ?',
    [projectId, user.id]);
  if (!m) return null;
  return m.member_role === 'viewer' ? 'viewer' : 'manager'; // Default 'editor' → manager
}

// Darf pflegen (bearbeiten, veröffentlichen, hochladen, löschen, einladen)?
async function canManage(get, user, projectId) {
  return (await roleFor(get, user, projectId)) === 'manager';
}

// Darf einsehen (Betrachter ODER Pflegender)?
async function canView(get, user, projectId) {
  return (await roleFor(get, user, projectId)) !== null;
}

module.exports = { ADMIN_ROLES, roleFor, canManage, canView };
