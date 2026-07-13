// ─────────────────────────────────────────────────────────────────────────────
// Sprint 13 — Granulare Rechte (CRM V).
//
// Bisher galt: Wer „advisor" war, durfte alles, was der Admin durfte. Sobald Dritte
// mit auf der Plattform arbeiten, ist das untragbar. Deshalb ein explizites
// Rechte-Modell — eine Matrix, keine verstreuten if-Abfragen.
//
// Rollen (Staff):
//   super_admin  Plattform-Eigentümer: alles, inkl. Nutzerverwaltung und Birdview
//   tenant_owner Mandanten-Eigentümer: alles im eigenen Mandanten
//   advisor      Berater: eigene Mandate führen, CRM nutzen, Mails versenden
//   assistant    Assistenz: pflegen und vorbereiten — aber NICHT versenden, NICHT löschen
//   analyst      Nur-Lese-Rolle: sehen und auswerten, nichts verändern
//
// Rollen (extern): buyer, seller — unverändert, kein Staff-Zugriff.
//
// Sichtbarkeit: advisor/assistant/analyst sehen nur Mandate, die ihnen gehören
// oder in denen sie Mitglied sind (siehe scopeProjects). super_admin/tenant_owner
// sehen alles.
// ─────────────────────────────────────────────────────────────────────────────

const PERMISSIONS = {
  super_admin: ['*'],
  tenant_owner: [
    'crm.read', 'crm.write', 'crm.delete', 'crm.export',
    'mail.send', 'mail.templates', 'mail.log',
    'projects.read', 'projects.write', 'projects.publish', 'projects.delete',
    'valuation.read', 'valuation.review',
    'users.read', 'users.manage',
    'tasks.read', 'tasks.write',
    'analytics.read', 'audit.read',
  ],
  advisor: [
    'crm.read', 'crm.write', 'crm.export',
    'mail.send', 'mail.templates', 'mail.log',
    'projects.read', 'projects.write', 'projects.publish',
    'valuation.read', 'valuation.review',
    'tasks.read', 'tasks.write',
    'analytics.read',
  ],
  assistant: [
    'crm.read', 'crm.write',
    'mail.log',                       // sehen, was rausging — aber nicht selbst senden
    'projects.read', 'projects.write',
    'valuation.read',
    'tasks.read', 'tasks.write',
  ],
  analyst: [
    'crm.read', 'crm.export',
    'mail.log',
    'projects.read',
    'valuation.read',
    'tasks.read',
    'analytics.read',
  ],
  buyer: [],
  seller: [],
};

const STAFF_ROLES = ['super_admin', 'tenant_owner', 'advisor', 'assistant', 'analyst'];
const ALL_PERMISSIONS = [...new Set(Object.values(PERMISSIONS).flat())].filter(p => p !== '*').sort();

// Menschenlesbare Beschreibungen für die Rechte-Matrix im Admin
const PERMISSION_LABELS = {
  'crm.read': 'CRM einsehen',
  'crm.write': 'CRM pflegen (Kontakte, Unternehmen, Funnel)',
  'crm.delete': 'CRM-Datensätze löschen',
  'crm.export': 'CRM exportieren (CSV)',
  'mail.send': 'E-Mails versenden (Ansprache, Einladungen, Vorlagen)',
  'mail.templates': 'Mailvorlagen ändern',
  'mail.log': 'Mail-Ausgang einsehen',
  'projects.read': 'Mandate einsehen',
  'projects.write': 'Mandate pflegen',
  'projects.publish': 'Mandate veröffentlichen',
  'projects.delete': 'Mandate löschen',
  'valuation.read': 'Bewertungen einsehen',
  'valuation.review': 'Bewertungen prüfen/freigeben',
  'users.read': 'Nutzer einsehen',
  'users.manage': 'Nutzer verwalten (freigeben, sperren, löschen)',
  'tasks.read': 'Wiedervorlagen einsehen',
  'tasks.write': 'Wiedervorlagen pflegen',
  'analytics.read': 'Auswertungen einsehen',
  'audit.read': 'Audit-Trail einsehen',
};

const ROLE_LABELS = {
  super_admin: 'Administrator',
  tenant_owner: 'Mandanten-Eigentümer',
  advisor: 'Berater',
  assistant: 'Assistenz',
  analyst: 'Analyst (nur lesen)',
  buyer: 'Investor / Käufer',
  seller: 'Verkäufer',
};

function permissionsFor(role) {
  const p = PERMISSIONS[role];
  if (!p) return [];
  return p.includes('*') ? ALL_PERMISSIONS : p;
}

function can(user, permission) {
  if (!user || !user.role) return false;
  const p = PERMISSIONS[user.role];
  if (!p) return false;
  return p.includes('*') || p.includes(permission);
}

// Express-Middleware: requirePermission('mail.send')
function requirePermission(...permissions) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ success: false, error: 'Nicht authentifiziert' });
    const ok = permissions.every(p => can(req.user, p));
    if (!ok) {
      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN',
        error: `Ihre Rolle (${ROLE_LABELS[req.user.role] || req.user.role}) hat dafür keine Berechtigung.`,
        data: { required: permissions },
      });
    }
    next();
  };
}

// Sieht dieser Nutzer alle Mandate — oder nur die eigenen?
function seesAllProjects(user) {
  return !!user && ['super_admin', 'tenant_owner'].includes(user.role);
}

// SQL-Fragment zur Einschränkung auf eigene Mandate.
// Gibt { sql, params } zurück; bei Vollsicht ein neutrales „TRUE".
function projectScope(user, alias = 'p') {
  if (seesAllProjects(user)) return { sql: 'TRUE', params: [] };
  return {
    sql: `(${alias}.created_by = ? OR EXISTS (
            SELECT 1 FROM project_members pm WHERE pm.project_id = ${alias}.id AND pm.user_id = ?))`,
    params: [user.id, user.id],
  };
}

module.exports = {
  PERMISSIONS, PERMISSION_LABELS, ROLE_LABELS, ALL_PERMISSIONS, STAFF_ROLES,
  permissionsFor, can, requirePermission, seesAllProjects, projectScope,
};
