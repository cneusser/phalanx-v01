// ─────────────────────────────────────────────────────────────────────────────
// Sprint 19 — Mandats-Einladungen (Betrachter / Pflegender) mit Status-Funnel.
//
//   Verwaltung (nur Pflegende des Mandats):
//     POST   /project/:projectId              Einladung aussprechen
//     GET    /project/:projectId              Team + Einladungs-Funnel
//     POST   /:id/resend                      Erinnerung senden
//     DELETE /:id                             Einladung widerrufen
//     PUT    /project/:projectId/member/:userId   Rolle ändern (viewer ↔ editor)
//     DELETE /project/:projectId/member/:userId   Mitglied entfernen
//
//   Annahme (öffentlich, per Token):
//     GET    /token/:token                    Einladung ansehen (setzt „opened")
//     POST   /token/:token/accept             annehmen (eingeloggt)
//     POST   /token/:token/register           Konto anlegen + annehmen (neu)
//     POST   /token/:token/decline            ablehnen
// ─────────────────────────────────────────────────────────────────────────────
const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db/database');
const wrap = require('../utils/asyncHandler');
const { authenticate, optionalAuth } = require('../middleware/auth');
const access = require('../utils/projectAccess');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'phalanx-secret';
const FRONTEND = () => process.env.FRONTEND_URL || 'https://www.capitalmatch.de';
const EXPIRY_DAYS = 14;
const _get = (sql, p) => db.get(sql, p);

const ROLE_LABEL = { viewer: 'Betrachter', editor: 'Pflegender' };
const isValidRole = (r) => ['viewer', 'editor'].includes(r);

// Pflege-Berechtigung für das Mandat (Admin/Ersteller/Editor-Mitglied)
async function guardManage(req, res, projectId) {
  if (!(await access.canManage(_get, req.user, projectId))) {
    res.status(403).json({ success: false, error: 'Nur Pflegende dieses Mandats dürfen einladen.' });
    return false;
  }
  return true;
}

// Abgelaufene Einladungen im Funnel korrekt anzeigen
const withExpiry = (inv) => {
  if (!inv) return inv;
  const expired = inv.expires_at && new Date(inv.expires_at).getTime() < Date.now();
  const open = ['invited', 'opened'].includes(inv.status);
  return { ...inv, status: expired && open ? 'expired' : inv.status };
};

// ── Einladung aussprechen ───────────────────────────────────────────────────
router.post('/project/:projectId', authenticate, wrap(async (req, res) => {
  const projectId = Number(req.params.projectId);
  if (!(await guardManage(req, res, projectId))) return;

  const email = String(req.body.email || '').toLowerCase().trim();
  const role = isValidRole(req.body.role) ? req.body.role : 'viewer';
  const message = String(req.body.message || '').slice(0, 500);
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return res.status(400).json({ success: false, error: 'Bitte eine gültige E-Mail-Adresse angeben.' });
  }

  const project = await db.get('SELECT id, codename FROM projects WHERE id = ?', [projectId]);
  if (!project) return res.status(404).json({ success: false, error: 'Mandat nicht gefunden' });

  // Bereits Mitglied? → direkt Rolle setzen statt einzuladen
  const existingUser = await db.get('SELECT id, first_name FROM users WHERE email = ?', [email]);
  if (existingUser) {
    const member = await db.get('SELECT id FROM project_members WHERE project_id = ? AND user_id = ?', [projectId, existingUser.id]);
    if (member) return res.status(409).json({ success: false, error: 'Diese Person ist bereits Teil des Mandats.' });
  }
  const openInv = await db.get(
    `SELECT id FROM project_invitations WHERE project_id = ? AND email = ? AND status IN ('invited','opened')`, [projectId, email]);
  if (openInv) return res.status(409).json({ success: false, error: 'Für diese E-Mail-Adresse besteht bereits eine offene Einladung.' });

  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + EXPIRY_DAYS * 24 * 3600 * 1000);
  const id = await db.insert(
    `INSERT INTO project_invitations (tenant_id, project_id, email, role, token, message, invited_by, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [req.tenantId || 1, projectId, email, role, token, message || null, req.user.id, expires]);

  db.auditLog(req.user.id, 'PROJECT_INVITE_SENT', 'project', projectId, `${email} als ${ROLE_LABEL[role]}`, req.ip);
  sendInviteMail({ email, token, role, message, project, inviter: req.user, existingUser });

  res.status(201).json({ success: true, data: { id, email, role, status: 'invited' } });
}));

function sendInviteMail({ email, token, role, message, project, inviter, existingUser }) {
  const { sendProcessUpdateEmail } = require('../utils/email');
  const inviterName = [inviter.title, inviter.first_name, inviter.last_name].filter(Boolean).join(' ');
  const roleText = role === 'editor'
    ? 'Sie können das Mandat <strong>bearbeiten und pflegen</strong> (Daten, Exposé, Unterlagen).'
    : 'Sie erhalten <strong>Leserechte</strong> auf das Mandat (Ansehen, keine Änderungen).';
  sendProcessUpdateEmail({
    to: email,
    firstName: existingUser ? existingUser.first_name : '',
    title: `Einladung zum Mandat ${project.codename}`,
    message:
      `<strong>${inviterName}</strong> lädt Sie als <strong>${ROLE_LABEL[role]}</strong> zum Mandat ` +
      `<strong>${project.codename}</strong> auf CapitalMatch ein.<br/><br/>${roleText}` +
      (message ? `<br/><br/><span style="display:block;background:#F4F8FC;border-left:3px solid #5B8FC9;padding:10px 14px;color:#333;">${message}</span>` : '') +
      `<br/><br/><span style="font-size:12px;color:#888;">Die Einladung ist ${EXPIRY_DAYS} Tage gültig.</span>`,
    ctaLabel: 'Einladung ansehen',
    ctaPath: `/einladung?token=${token}`,
  }).catch(() => {});
}

// ── Team + Einladungs-Funnel ────────────────────────────────────────────────
router.get('/project/:projectId', authenticate, wrap(async (req, res) => {
  const projectId = Number(req.params.projectId);
  if (!(await guardManage(req, res, projectId))) return;

  const members = await db.all(`
    SELECT pm.user_id, pm.member_role, pm.created_at,
           u.first_name || ' ' || u.last_name AS name, u.email, u.company
    FROM project_members pm JOIN users u ON u.id = pm.user_id
    WHERE pm.project_id = ? ORDER BY pm.created_at`, [projectId]);

  const invitations = await db.all(`
    SELECT i.id, i.email, i.role, i.status, i.message, i.invited_at, i.opened_at, i.accepted_at, i.expires_at,
           u.first_name || ' ' || u.last_name AS invited_by_name
    FROM project_invitations i LEFT JOIN users u ON u.id = i.invited_by
    WHERE i.project_id = ? ORDER BY i.invited_at DESC`, [projectId]);

  const list = invitations.map(withExpiry);
  // Funnel-Zähler: eingeladen → geöffnet → angenommen
  const funnel = {
    invited: list.filter(i => i.status === 'invited').length,
    opened: list.filter(i => i.status === 'opened').length,
    accepted: list.filter(i => i.status === 'accepted').length,
    declined: list.filter(i => i.status === 'declined').length,
    expired: list.filter(i => i.status === 'expired').length,
    revoked: list.filter(i => i.status === 'revoked').length,
  };
  res.json({ success: true, data: { members, invitations: list, funnel } });
}));

// ── Erinnerung / Widerruf ───────────────────────────────────────────────────
router.post('/:id/resend', authenticate, wrap(async (req, res) => {
  const inv = await db.get('SELECT * FROM project_invitations WHERE id = ?', [req.params.id]);
  if (!inv) return res.status(404).json({ success: false, error: 'Einladung nicht gefunden' });
  if (!(await guardManage(req, res, inv.project_id))) return;
  if (!['invited', 'opened'].includes(inv.status)) {
    return res.status(400).json({ success: false, error: 'Nur offene Einladungen können erneut gesendet werden.' });
  }
  const expires = new Date(Date.now() + EXPIRY_DAYS * 24 * 3600 * 1000);
  await db.run(`UPDATE project_invitations SET expires_at = ?, invited_at = now(), status = 'invited' WHERE id = ?`, [expires, inv.id]);
  const project = await db.get('SELECT id, codename FROM projects WHERE id = ?', [inv.project_id]);
  const existingUser = await db.get('SELECT id, first_name FROM users WHERE email = ?', [inv.email]);
  sendInviteMail({ email: inv.email, token: inv.token, role: inv.role, message: inv.message, project, inviter: req.user, existingUser });
  db.auditLog(req.user.id, 'PROJECT_INVITE_RESENT', 'project', inv.project_id, inv.email, req.ip);
  res.json({ success: true, data: { message: 'Erinnerung gesendet' } });
}));

router.delete('/:id', authenticate, wrap(async (req, res) => {
  const inv = await db.get('SELECT * FROM project_invitations WHERE id = ?', [req.params.id]);
  if (!inv) return res.status(404).json({ success: false, error: 'Einladung nicht gefunden' });
  if (!(await guardManage(req, res, inv.project_id))) return;
  await db.run(`UPDATE project_invitations SET status = 'revoked' WHERE id = ?`, [inv.id]);
  db.auditLog(req.user.id, 'PROJECT_INVITE_REVOKED', 'project', inv.project_id, inv.email, req.ip);
  res.json({ success: true, data: { message: 'Einladung widerrufen' } });
}));

// ── Mitglieder: Rolle ändern / entfernen ────────────────────────────────────
router.put('/project/:projectId/member/:userId', authenticate, wrap(async (req, res) => {
  const projectId = Number(req.params.projectId);
  if (!(await guardManage(req, res, projectId))) return;
  const role = isValidRole(req.body.role) ? req.body.role : null;
  if (!role) return res.status(400).json({ success: false, error: 'Ungültige Rolle' });
  await db.run(`UPDATE project_members SET member_role = ? WHERE project_id = ? AND user_id = ?`, [role, projectId, req.params.userId]);
  db.auditLog(req.user.id, 'PROJECT_MEMBER_ROLE_CHANGED', 'project', projectId, `User #${req.params.userId} → ${ROLE_LABEL[role]}`, req.ip);
  res.json({ success: true, data: { role } });
}));

router.delete('/project/:projectId/member/:userId', authenticate, wrap(async (req, res) => {
  const projectId = Number(req.params.projectId);
  if (!(await guardManage(req, res, projectId))) return;
  if (Number(req.params.userId) === req.user.id) {
    return res.status(400).json({ success: false, error: 'Sie können sich nicht selbst entfernen.' });
  }
  await db.run(`DELETE FROM project_members WHERE project_id = ? AND user_id = ?`, [projectId, req.params.userId]);
  db.auditLog(req.user.id, 'PROJECT_MEMBER_REMOVED', 'project', projectId, `User #${req.params.userId}`, req.ip);
  res.json({ success: true, data: { message: 'Zugriff entfernt' } });
}));

// ── Einladung ansehen (öffentlich; markiert „geöffnet") ─────────────────────
router.get('/token/:token', optionalAuth, wrap(async (req, res) => {
  const inv = await db.get('SELECT * FROM project_invitations WHERE token = ?', [req.params.token]);
  if (!inv) return res.status(404).json({ success: false, error: 'Einladung nicht gefunden' });
  const state = withExpiry(inv);

  if (state.status === 'invited') {
    await db.run(`UPDATE project_invitations SET status = 'opened', opened_at = now() WHERE id = ?`, [inv.id]).catch(() => {});
    state.status = 'opened';
  }
  const project = await db.get('SELECT id, codename, industry, region FROM projects WHERE id = ?', [inv.project_id]);
  const inviter = await db.get('SELECT first_name, last_name, company FROM users WHERE id = ?', [inv.invited_by]);
  const account = await db.get('SELECT id FROM users WHERE email = ?', [inv.email]);

  res.json({
    success: true,
    data: {
      status: state.status,
      email: inv.email,
      role: inv.role,
      role_label: ROLE_LABEL[inv.role],
      message: inv.message,
      expires_at: inv.expires_at,
      project: project ? { id: project.id, codename: project.codename, industry: project.industry, region: project.region } : null,
      inviter: inviter ? `${inviter.first_name} ${inviter.last_name}${inviter.company ? ' · ' + inviter.company : ''}` : null,
      has_account: !!account,
      // Passt der eingeloggte Nutzer zur Einladung?
      logged_in_matches: !!(req.user && req.user.email === inv.email),
    },
  });
}));

// Einladung → Mitgliedschaft (gemeinsame Logik)
async function acceptInvitation(inv, userId, ip) {
  await db.run(
    `INSERT INTO project_members (tenant_id, project_id, user_id, member_role)
     VALUES (?, ?, ?, ?)
     ON CONFLICT (project_id, user_id) DO UPDATE SET member_role = EXCLUDED.member_role`,
    [inv.tenant_id || 1, inv.project_id, userId, inv.role]);
  await db.run(
    `UPDATE project_invitations SET status = 'accepted', accepted_at = now(), user_id = ? WHERE id = ?`,
    [userId, inv.id]);
  db.auditLog(userId, 'PROJECT_INVITE_ACCEPTED', 'project', inv.project_id, `als ${ROLE_LABEL[inv.role]}`, ip);
}

// Gültigkeit prüfen
async function loadOpenInvitation(token) {
  const inv = await db.get('SELECT * FROM project_invitations WHERE token = ?', [token]);
  if (!inv) return { error: 'Einladung nicht gefunden' };
  if (['revoked', 'declined'].includes(inv.status)) return { error: 'Diese Einladung ist nicht mehr gültig.' };
  if (inv.status === 'accepted') return { error: 'Diese Einladung wurde bereits angenommen.' };
  if (inv.expires_at && new Date(inv.expires_at).getTime() < Date.now()) {
    return { error: 'Diese Einladung ist abgelaufen. Bitte fordern Sie eine neue an.' };
  }
  return { inv };
}

// ── Annehmen (eingeloggt) ───────────────────────────────────────────────────
router.post('/token/:token/accept', authenticate, wrap(async (req, res) => {
  const { inv, error } = await loadOpenInvitation(req.params.token);
  if (error) return res.status(400).json({ success: false, error });
  if (req.user.email !== inv.email) {
    return res.status(403).json({
      success: false,
      error: `Diese Einladung wurde an ${inv.email} gesendet. Bitte melden Sie sich mit dieser Adresse an.`,
    });
  }
  await acceptInvitation(inv, req.user.id, req.ip);
  res.json({ success: true, data: { project_id: inv.project_id, role: inv.role } });
}));

// ── Ablehnen ────────────────────────────────────────────────────────────────
router.post('/token/:token/decline', wrap(async (req, res) => {
  const { inv, error } = await loadOpenInvitation(req.params.token);
  if (error) return res.status(400).json({ success: false, error });
  await db.run(`UPDATE project_invitations SET status = 'declined' WHERE id = ?`, [inv.id]);
  res.json({ success: true, data: { message: 'Einladung abgelehnt' } });
}));

// ── Konto anlegen + Einladung annehmen ──────────────────────────────────────
// Der Token beweist den Besitz der E-Mail-Adresse → Konto wird direkt
// freigeschaltet und verifiziert (sonst liefe die Einladung in die
// Admin-Freigabeschlange und der Eingeladene käme nie hinein).
router.post('/token/:token/register', wrap(async (req, res) => {
  const { inv, error } = await loadOpenInvitation(req.params.token);
  if (error) return res.status(400).json({ success: false, error });

  const existing = await db.get('SELECT id FROM users WHERE email = ?', [inv.email]);
  if (existing) return res.status(409).json({ success: false, error: 'Für diese E-Mail besteht bereits ein Konto. Bitte melden Sie sich an.' });

  const { password, first_name, last_name, salutation, title, company, position, mobile, privacy_consent } = req.body;
  if (!password || String(password).length < 8) return res.status(400).json({ success: false, error: 'Passwort muss mindestens 8 Zeichen haben' });
  if (!first_name || !last_name) return res.status(400).json({ success: false, error: 'Bitte Vor- und Nachnamen angeben' });
  if (!['Herr', 'Frau', 'Divers'].includes(salutation)) return res.status(400).json({ success: false, error: 'Bitte wählen Sie eine Anrede' });
  if (!mobile || String(mobile).trim().length < 6) return res.status(400).json({ success: false, error: 'Bitte geben Sie eine Mobilnummer an (Voraussetzung für die 2-Faktor-Authentifizierung)' });
  if (!privacy_consent) return res.status(400).json({ success: false, error: 'Bitte stimmen Sie der Datenschutzerklärung zu' });

  const tenantId = inv.tenant_id || 1;
  const password_hash = bcrypt.hashSync(String(password), 10);
  const userId = await db.insert(
    `INSERT INTO users (tenant_id, email, password_hash, role, salutation, title, first_name, last_name, company, position, mobile,
                        is_approved, is_active, email_verified, privacy_consent_at)
     VALUES (?, ?, ?, 'seller', ?, ?, ?, ?, ?, ?, ?, 1, 1, 1, now())`,
    [tenantId, inv.email, password_hash, salutation, title || null, first_name, last_name, company || null, position || null, mobile]);

  await acceptInvitation(inv, userId, req.ip);
  db.auditLog(userId, 'REGISTER_VIA_INVITE', 'user', userId, `Mandat #${inv.project_id} als ${ROLE_LABEL[inv.role]}`, req.ip);

  // Direkt eingeloggt weiterleiten — der Token hat die Adresse bereits belegt.
  const jwtToken = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
  const user = await db.get('SELECT id, email, role, salutation, title, first_name, last_name, company FROM users WHERE id = ?', [userId]);
  res.status(201).json({ success: true, data: { token: jwtToken, user, project_id: inv.project_id, role: inv.role } });
}));

module.exports = router;
