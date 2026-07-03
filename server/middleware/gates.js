// ─────────────────────────────────────────────────────────────────────────────
// Sprint 2 — Serverseitige Zugriffs-Gates auf Basis der Interest-Stage.
// Jeder Zugriff (erlaubt UND verweigert) landet im append-only activity_log.
// Gates sind NICHT über Direkt-URLs oder API umgehbar: Autorisierung passiert
// ausschließlich hier auf dem Server.
// ─────────────────────────────────────────────────────────────────────────────
const db = require('../db/database');
const { stageAllows } = require('../utils/dealStateMachine');

const ADMIN_ROLES = ['super_admin', 'advisor', 'tenant_owner'];

// Aktuelle Interest-Stage eines Nutzers für ein Projekt (oder null)
async function getStage(userId, projectId) {
  const row = await db.get(
    `SELECT stage FROM interests WHERE buyer_id = ? AND project_id = ?`,
    [userId, projectId]
  );
  return row ? row.stage : null;
}

// ── Granulare Datenraum-Rechte (Sprint 4) ────────────────────────────────────
// permissions: (resource='dataroom', level='read'|'download') + (resource='qa', level='qa')
// Standard bei Datenraum-Freigabe: download + qa. Admin kann je Interessent
// einschränken (nur lesen, kein Q&A) oder entziehen.
async function grantDefaultPermissions(userId, projectId) {
  await db.run(`
    INSERT INTO permissions (project_id, user_id, resource, level) VALUES (?, ?, 'dataroom', 'download')
    ON CONFLICT (project_id, user_id, resource) DO UPDATE SET level = EXCLUDED.level`,
    [projectId, userId]);
  await db.run(`
    INSERT INTO permissions (project_id, user_id, resource, level) VALUES (?, ?, 'qa', 'qa')
    ON CONFLICT (project_id, user_id, resource) DO NOTHING`,
    [projectId, userId]);
}

/**
 * need: 'read' (Datenraum sehen), 'download' (Dateien laden), 'qa' (Fragen stellen)
 */
async function hasPermission(user, projectId, need) {
  if (ADMIN_ROLES.includes(user.role)) return true;
  if (need === 'qa') {
    const row = await db.get(`SELECT id FROM permissions WHERE project_id = ? AND user_id = ? AND resource = 'qa'`, [projectId, user.id]);
    return !!row;
  }
  const row = await db.get(`SELECT level FROM permissions WHERE project_id = ? AND user_id = ? AND resource = 'dataroom'`, [projectId, user.id]);
  if (!row) return false;
  if (need === 'read') return true;                 // read ODER download genügt
  return row.level === 'download';                  // download nur bei explizitem Recht
}

// Interest-Stage setzen (Upsert) — zentrale Stelle für alle Übergänge
async function setStage(userId, projectId, stage, actorId, ip) {
  await db.run(
    `INSERT INTO interests (project_id, buyer_id, stage)
     VALUES (?, ?, ?)
     ON CONFLICT (project_id, buyer_id)
     DO UPDATE SET stage = EXCLUDED.stage, updated_at = now()`,
    [projectId, userId, stage]
  );
  // Datenraum-Freigabe: Standard-Rechte (download + qa) setzen
  if (stage === 'dataroom_granted') {
    await grantDefaultPermissions(userId, projectId);
  }
  db.activityLog(actorId, `INTEREST_STAGE_${stage.toUpperCase()}`, 'interest', projectId, ip);
}

/**
 * Middleware-Factory: erzwingt, dass req.user das Gate der Ressource passiert
 * hat. projectId wird aus req.params[paramName] gelesen. Admins passieren.
 * Bei Erfolg steht req.interestStage zur Verfügung.
 */
function requireGate(resource, paramName = 'projectId') {
  return async (req, res, next) => {
    try {
      const projectId = req.params[paramName];
      if (ADMIN_ROLES.includes(req.user.role)) {
        req.interestStage = 'admin';
        db.activityLog(req.user.id, `ACCESS_${resource.toUpperCase()}_ADMIN`, resource, projectId, req.ip);
        return next();
      }
      const stage = await getStage(req.user.id, projectId);
      if (!stageAllows(stage, resource)) {
        db.activityLog(req.user.id, `ACCESS_${resource.toUpperCase()}_DENIED`, resource, projectId, req.ip);
        return res.status(403).json({
          success: false,
          error: 'Zugriff nicht freigeschaltet — erforderliches Gate noch nicht erreicht',
          stage: stage || null,
          required: resource,
        });
      }
      req.interestStage = stage;
      db.activityLog(req.user.id, `ACCESS_${resource.toUpperCase()}`, resource, projectId, req.ip);
      next();
    } catch (e) {
      next(e);
    }
  };
}

module.exports = { requireGate, getStage, setStage, hasPermission, grantDefaultPermissions, ADMIN_ROLES };
