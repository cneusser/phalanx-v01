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
// ── Die Mandatsbindung der Beratung (v0.495) ────────────────────────────────
//
// Hier stand eine Zeile, die jedem Berater jedes Mandat öffnete, schreibend:
// Datenraum, Unterlagen, Freigaben, Vereinbarungen, Löschen. Die Plattform
// sagt an anderer Stelle ausdrücklich das Gegenteil: middleware/permissions.js
// beschreibt die Rolle als „sieht nur eigene Mandate" und hält mit
// projectScope() auch das Werkzeug dafür bereit. Benutzt wurde es nie auf
// einem schreibenden Weg.
//
// Solange eine einzige Person berät, fällt das nicht auf. Sobald eine zweite
// hinzukommt, ist jede Vertraulichkeitszusage gegenüber einem Mandanten nur
// noch organisatorisch gedeckt und nicht mehr technisch.
//
// Ab jetzt gilt für die Rolle advisor dasselbe wie für jede andere Person:
// Zugang hat, wer das Mandat angelegt hat oder ihm zugeordnet ist
// (project_members). Die Zuordnung macht die Verwaltung, der Weg dafür
// besteht seit Langem (POST /api/admin/projects/:id/members).
//
// Unveraendert alles sehen und tun: super_admin und tenant_owner. Sie tragen
// die Plattform, nicht ein einzelnes Mandat.
const ADMIN_ROLES = ['super_admin', 'advisor', 'tenant_owner'];

/** Wer ohne Zuordnung jedes Mandat pflegen darf. */
const VOLLZUGRIFF_ROLLEN = ['super_admin', 'tenant_owner'];

async function roleFor(get, user, projectId) {
  if (!user || !projectId) return null;
  if (VOLLZUGRIFF_ROLLEN.includes(user.role)) return 'manager';

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

module.exports = { ADMIN_ROLES, VOLLZUGRIFF_ROLLEN, roleFor, canManage, canView };
