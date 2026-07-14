// ─────────────────────────────────────────────────────────────────────────────
// Sprint 15: Connect & Interaktion Käufer ↔ Berater.
// Verwandelt Interesse/NDA in eine automatische Verbindung + mandatsbezogenen
// Chat-Thread und schreibt Prozess-Ereignisse als Systemnachrichten in die
// Deal-Timeline. Läuft auf der Default-Tenant-Verbindung (wie ndas.js/admin.js).
// Alle Funktionen sind defensiv (werfen nie), damit der auslösende Prozess
// (NDA anlegen, Deal-Status ändern) nie an der Chat-Nebenwirkung scheitert.
// ─────────────────────────────────────────────────────────────────────────────
const db = require('../db/database');

// Berater (Mandatsverantwortlicher) eines Projekts auflösen: created_by,
// sonst erster aktiver super_admin.
async function resolveAdvisor(projectId) {
  const p = await db.get(`SELECT created_by, tenant_id FROM projects WHERE id = ?`, [projectId]).catch(() => null);
  const tenantId = (p && p.tenant_id) || 1;
  if (p && p.created_by) {
    const owner = await db.get(`SELECT id FROM users WHERE id = ? AND is_active = 1`, [p.created_by]).catch(() => null);
    if (owner) return { advisorId: owner.id, tenantId };
  }
  const admin = await db.get(`SELECT id FROM users WHERE role = 'super_admin' AND is_active = 1 ORDER BY id LIMIT 1`).catch(() => null);
  return { advisorId: admin ? admin.id : null, tenantId };
}

// Akzeptierte Verbindung zwischen Käufer und Berater sicherstellen.
async function ensureConnection(tenantId, buyerId, advisorId) {
  if (!buyerId || !advisorId || buyerId === advisorId) return;
  const existing = await db.get(
    `SELECT id, status FROM connections
       WHERE (requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?)`,
    [buyerId, advisorId, advisorId, buyerId]).catch(() => null);
  if (existing) {
    if (existing.status !== 'accepted') {
      await db.run(`UPDATE connections SET status = 'accepted', decided_at = now() WHERE id = ?`, [existing.id]).catch(() => {});
    }
    return;
  }
  await db.insert(
    `INSERT INTO connections (tenant_id, requester_id, addressee_id, status, decided_at)
     VALUES (?, ?, ?, 'accepted', now())`,
    [tenantId || 1, buyerId, advisorId]).catch(() => {});
}

// Systemnachricht in den Thread schreiben (sichtbar für beide; ungelesen beim Empfänger).
async function postSystemMessage({ tenantId, senderId, recipientId, projectId, body }) {
  if (!senderId || !recipientId || senderId === recipientId) return null;
  return db.insert(
    `INSERT INTO messages (tenant_id, sender_id, recipient_id, body, project_id, type)
     VALUES (?, ?, ?, ?, ?, 'system')`,
    [tenantId || 1, senderId, recipientId, body, projectId || null]).catch(() => null);
}

// Interesse → Intro → Chat. Verbindet Käufer und Berater, postet (einmalig je
// Mandat) eine Intro-Systemnachricht an beide Seiten und schickt eine Intro-Mail.
// Rückgabe: advisorId (für „Chat öffnen") oder null.
async function introduceBuyer({ project, buyer, reason }) {
  try {
    if (!project || !buyer) return null;
    const { advisorId, tenantId } = await resolveAdvisor(project.id);
    if (!advisorId || advisorId === buyer.id) return advisorId || null;
    await ensureConnection(tenantId, buyer.id, advisorId);

    // Nur beim ersten Mal je Mandat eine Intro posten (kein Spam bei Wiederholung).
    const seen = await db.get(
      `SELECT id FROM messages WHERE project_id = ?
         AND ((sender_id = ? AND recipient_id = ?) OR (sender_id = ? AND recipient_id = ?)) LIMIT 1`,
      [project.id, advisorId, buyer.id, buyer.id, advisorId]).catch(() => null);

    if (!seen) {
      const who = `${buyer.first_name || ''} ${buyer.last_name || ''}`.trim() + (buyer.company ? ` (${buyer.company})` : '');
      await postSystemMessage({
        tenantId, senderId: advisorId, recipientId: buyer.id, projectId: project.id,
        body: `👋 Willkommen! Sie sind jetzt direkt mit Ihrem Berater zum Mandat „${project.codename}" verbunden. Stellen Sie hier jederzeit Ihre Fragen, wir melden uns zeitnah.`,
      });
      await postSystemMessage({
        tenantId, senderId: buyer.id, recipientId: advisorId, projectId: project.id,
        body: `📌 ${who} hat Interesse an „${project.codename}" bekundet${reason ? ` (${reason})` : ''}.`,
      });
      const { sendProcessUpdateEmail } = require('./email');
      sendProcessUpdateEmail({
        to: buyer.email, firstName: buyer.first_name,
        title: `Sie sind mit Ihrem Berater verbunden, ${project.codename}`,
        message: `Zu Ihrem Interesse an <strong>${project.codename}</strong> haben wir einen direkten Draht zu Ihrem Berater eingerichtet. Stellen Sie Ihre Fragen ab sofort bequem im Nachrichten-Bereich der Plattform, ohne Umweg über E-Mail.`,
        ctaLabel: 'Zum Chat', ctaPath: '/nachrichten',
      }).catch(() => {});
    }
    return advisorId;
  } catch (e) {
    console.warn('[dealChat.introduceBuyer]', e.message);
    return null;
  }
}

// Prozess-Ereignis an EINEN Käufer (z. B. „NDA unterzeichnet"). Postet an den
// Käufer und optional einen Hinweis an den Berater.
async function eventForBuyer({ project, buyerId, body, notifyAdvisorBody }) {
  try {
    const { advisorId, tenantId } = await resolveAdvisor(project.id);
    if (!advisorId || !buyerId || advisorId === buyerId) return;
    await ensureConnection(tenantId, buyerId, advisorId);
    if (body) await postSystemMessage({ tenantId, senderId: advisorId, recipientId: buyerId, projectId: project.id, body });
    if (notifyAdvisorBody) await postSystemMessage({ tenantId, senderId: buyerId, recipientId: advisorId, projectId: project.id, body: notifyAdvisorBody });
  } catch (e) { console.warn('[dealChat.eventForBuyer]', e.message); }
}

// Prozess-Ereignis an ALLE interessierten Käufer eines Mandats (z. B. Deal-Status).
async function broadcastDealEvent({ project, body }) {
  try {
    const { advisorId, tenantId } = await resolveAdvisor(project.id);
    if (!advisorId || !body) return;
    const buyers = await db.all(
      `SELECT DISTINCT uid FROM (
         SELECT buyer_id AS uid FROM interests WHERE project_id = ?
         UNION SELECT user_id AS uid FROM nda_requests WHERE project_id = ?
       ) q`, [project.id, project.id]).catch(() => []);
    for (const b of buyers) {
      if (!b.uid || b.uid === advisorId) continue;
      await ensureConnection(tenantId, b.uid, advisorId);
      await postSystemMessage({ tenantId, senderId: advisorId, recipientId: b.uid, projectId: project.id, body });
    }
  } catch (e) { console.warn('[dealChat.broadcastDealEvent]', e.message); }
}

module.exports = { resolveAdvisor, ensureConnection, postSystemMessage, introduceBuyer, eventForBuyer, broadcastDealEvent };
