// ─────────────────────────────────────────────────────────────────────────────
// Sprint 11: In-App-Chat & Kontakte.
//   Kontakte:  POST /connections {email}  ·  GET /connections  ·  PUT /connections/:id {action}
//   Nachrichten: GET /threads  ·  GET /thread/:userId  ·  POST /send {recipient_id, body}
// Nachrichten nur zwischen bestätigten Kontakten (oder mit Admin/Berater).
// ─────────────────────────────────────────────────────────────────────────────
const express = require('express');
const rateLimit = require('express-rate-limit');
const db = require('../db/database');
const wrap = require('../utils/asyncHandler');
const { authenticate } = require('../middleware/auth');
const router = express.Router();

const scoped = (req, fn) => (req.tenantId && req.tenantId !== 1) ? db.withTenant(req.tenantId, fn) : fn(db);
const ADMIN_ROLES = ['super_admin', 'advisor', 'tenant_owner'];
const isAdmin = (u) => u && ADMIN_ROLES.includes(u.role);
const msgLimiter = rateLimit({ windowMs: 5 * 60 * 1000, max: 60, standardHeaders: true, legacyHeaders: false });

// Sichtbarkeit (v0.399): Eine Nachricht im Bearbeitungsfenster gehoert noch dem
// Absender. Der Empfaenger sieht sie erst ab dem Zustellzeitpunkt. Bestandszeilen
// haben zustellung_ab = NULL und gelten als laengst zugestellt. Zurueckgezogene
// Nachrichten sieht nur noch niemand, die Zeile bleibt fuer die Nachvollziehbarkeit.
const SICHTBAR = (spalte = 'm') => `(${spalte}.zurueckgezogen_am IS NULL AND (${spalte}.sender_id = ? OR ${spalte}.zustellung_ab IS NULL OR ${spalte}.zustellung_ab <= now()))`;

// Dürfen zwei Nutzer miteinander schreiben? (bestätigte Verbindung oder Admin/Berater)
async function canMessage(req, meId, otherId, meUser, otherUser) {
  if (isAdmin(meUser) || isAdmin(otherUser)) return true;
  const c = await scoped(req, (t) => t.get(
    `SELECT id FROM connections WHERE status = 'accepted' AND
       ((requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?))`,
    [meId, otherId, otherId, meId]));
  return !!c;
}

// ── Kontakt anfragen (per E-Mail) ───────────────────────────────────────────
router.post('/connections', authenticate, msgLimiter, wrap(async (req, res) => {
  const email = String(req.body.email || '').toLowerCase().trim();
  if (!email) return res.status(400).json({ success: false, error: 'E-Mail-Adresse fehlt' });
  const target = await scoped(req, (t) => t.get(`SELECT id, first_name, last_name, email FROM users WHERE email = ? AND is_active = 1`, [email]));
  if (!target) return res.status(404).json({ success: false, error: 'Kein Nutzer mit dieser E-Mail-Adresse gefunden.' });
  if (target.id === req.user.id) return res.status(400).json({ success: false, error: 'Sie können sich nicht selbst hinzufügen.' });
  const existing = await scoped(req, (t) => t.get(
    `SELECT id, status FROM connections WHERE (requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?)`,
    [req.user.id, target.id, target.id, req.user.id]));
  if (existing) return res.status(409).json({ success: false, error: existing.status === 'accepted' ? 'Sie sind bereits verbunden.' : 'Eine Anfrage besteht bereits.' });
  const id = await scoped(req, (t) => t.insert(`INSERT INTO connections (tenant_id, requester_id, addressee_id) VALUES (?, ?, ?)`, [req.tenantId || 1, req.user.id, target.id]));
  db.activityLog(req.user.id, 'CONNECTION_REQUEST', 'connection', id, req.ip);
  const { sendProcessUpdateEmail } = require('../utils/email');
  sendProcessUpdateEmail({
    to: target.email, firstName: target.first_name, person: target,
    title: `Neue Kontaktanfrage von ${req.user.first_name} ${req.user.last_name}`,
    message: `<strong>${req.user.first_name} ${req.user.last_name}</strong> möchte sich auf CapitalMatch mit Ihnen vernetzen. Nehmen Sie die Anfrage an, um Nachrichten auszutauschen.`,
    ctaLabel: 'Anfrage ansehen', ctaPath: '/nachrichten',
  }).catch(() => {});
  res.status(201).json({ success: true, data: { id } });
}));

// ── Meine Kontakte + offene Anfragen ────────────────────────────────────────
router.get('/connections', authenticate, wrap(async (req, res) => {
  const rows = await scoped(req, (t) => t.all(`
    SELECT c.*, ru.first_name AS req_first, ru.last_name AS req_last, ru.company AS req_company, ru.email AS req_email,
           au.first_name AS adr_first, au.last_name AS adr_last, au.company AS adr_company, au.email AS adr_email
    FROM connections c
    JOIN users ru ON ru.id = c.requester_id
    JOIN users au ON au.id = c.addressee_id
    WHERE c.requester_id = ? OR c.addressee_id = ?
    ORDER BY c.created_at DESC`, [req.user.id, req.user.id]));
  const me = req.user.id;
  const map = (c) => {
    // E-Mail der Gegenseite erst preisgeben, wenn die Verbindung angenommen ist.
    const accepted = c.status === 'accepted';
    const other = c.requester_id === me
      ? { id: c.addressee_id, name: `${c.adr_first} ${c.adr_last}`, company: c.adr_company, email: accepted ? c.adr_email : null }
      : { id: c.requester_id, name: `${c.req_first} ${c.req_last}`, company: c.req_company, email: accepted ? c.req_email : null };
    return { id: c.id, status: c.status, direction: c.requester_id === me ? 'outgoing' : 'incoming', other };
  };
  res.json({ success: true, data: rows.map(map) });
}));

// ── Anfrage annehmen/ablehnen ───────────────────────────────────────────────
router.put('/connections/:id', authenticate, wrap(async (req, res) => {
  const action = req.body.action === 'accept' ? 'accepted' : req.body.action === 'decline' ? 'declined' : null;
  if (!action) return res.status(400).json({ success: false, error: 'Ungültige Aktion' });
  const c = await scoped(req, (t) => t.get(`SELECT * FROM connections WHERE id = ? AND addressee_id = ? AND status = 'pending'`, [req.params.id, req.user.id]));
  if (!c) return res.status(404).json({ success: false, error: 'Anfrage nicht gefunden' });
  await scoped(req, (t) => t.run(`UPDATE connections SET status = ?, decided_at = now() WHERE id = ?`, [action, req.params.id]));
  db.activityLog(req.user.id, action === 'accepted' ? 'CONNECTION_ACCEPT' : 'CONNECTION_DECLINE', 'connection', c.id, req.ip);
  if (action === 'accepted') {
    // Sprint 17: XP für zustande gekommenen Kontakt (beide Seiten)
    const xp = require('../utils/xp');
    xp.award(c.requester_id, 'CONNECTION_MADE', { refType: 'connection', refId: c.id }).catch(() => {});
    xp.award(c.addressee_id, 'CONNECTION_MADE', { refType: 'connection', refId: c.id }).catch(() => {});
  }
  res.json({ success: true, data: { status: action } });
}));

// ── Konversationsliste (Partner + letzte Nachricht + ungelesen) ─────────────
router.get('/threads', authenticate, wrap(async (req, res) => {
  const me = req.user.id;
  const msgs = await scoped(req, (t) => t.all(`
    SELECT m.*, u.first_name, u.last_name, u.company
    FROM messages m
    JOIN users u ON u.id = CASE WHEN m.sender_id = ? THEN m.recipient_id ELSE m.sender_id END
    WHERE (m.sender_id = ? OR m.recipient_id = ?) AND ${SICHTBAR('m')}
    ORDER BY m.created_at DESC`, [me, me, me, me]));
  const threads = {};
  for (const m of msgs) {
    const partner = m.sender_id === me ? m.recipient_id : m.sender_id;
    if (!threads[partner]) threads[partner] = { partner_id: partner, name: `${m.first_name} ${m.last_name}`, company: m.company, last: m.body, last_at: m.created_at, unread: 0 };
    if (m.recipient_id === me && !m.read_at) threads[partner].unread++;
  }
  res.json({ success: true, data: Object.values(threads) });
}));

// ── Thread mit einem Nutzer (+ als gelesen markieren) ───────────────────────
router.get('/thread/:userId', authenticate, wrap(async (req, res) => {
  const me = req.user.id; const other = Number(req.params.userId);
  const otherUser = await scoped(req, (t) => t.get(`SELECT id, first_name, last_name, company, email, role FROM users WHERE id = ?`, [other]));
  if (!otherUser) return res.status(404).json({ success: false, error: 'Nutzer nicht gefunden' });
  const allowed = await canMessage(req, me, other, req.user, otherUser);
  const rows = await scoped(req, (t) => t.all(
    `SELECT m.id, m.sender_id, m.recipient_id, m.body, m.read_at, m.created_at, m.type, m.project_id,
            m.zustellung_ab, m.benachrichtigt_am, m.bearbeitet_am,
            p.codename AS project_codename
     FROM messages m LEFT JOIN projects p ON p.id = m.project_id
     WHERE (((m.sender_id = ? AND m.recipient_id = ?) OR (m.sender_id = ? AND m.recipient_id = ?))
            AND ${SICHTBAR('m')})
     ORDER BY m.created_at ASC LIMIT 500`, [me, other, other, me, me]));
  // Restzeit je eigener Nachricht, damit die Oberflaeche den Zaehler anzeigen kann.
  const versand = require('../utils/nachrichtVersand');
  for (const r of rows) r.rest_sekunden = r.sender_id === me ? versand.restsekunden(r) : 0;
  await scoped(req, (t) => t.run(`UPDATE messages SET read_at = now() WHERE recipient_id = ? AND sender_id = ? AND read_at IS NULL AND zurueckgezogen_am IS NULL AND (zustellung_ab IS NULL OR zustellung_ab <= now())`, [me, other]));
  res.json({ success: true, data: { partner: { id: otherUser.id, name: `${otherUser.first_name} ${otherUser.last_name}`, company: otherUser.company }, allowed, messages: rows } });
}));

// ── Nachricht senden ────────────────────────────────────────────────────────
router.post('/send', authenticate, msgLimiter, wrap(async (req, res) => {
  const recipient_id = Number(req.body.recipient_id); const body = String(req.body.body || '').trim();
  if (!recipient_id || !body) return res.status(400).json({ success: false, error: 'Empfänger und Text erforderlich' });
  const other = await scoped(req, (t) => t.get(`SELECT id, first_name, last_name, email, role FROM users WHERE id = ? AND is_active = 1`, [recipient_id]));
  if (!other) return res.status(404).json({ success: false, error: 'Empfänger nicht gefunden' });
  if (!(await canMessage(req, req.user.id, recipient_id, req.user, other))) {
    return res.status(403).json({ success: false, error: 'Sie können erst schreiben, wenn die Kontaktanfrage angenommen wurde.' });
  }
  // v0.399: Die Nachricht wird eingereiht statt sofort zugestellt. Bis zum
  // Ablauf des Fensters kann der Absender sie aendern oder zuruecknehmen; erst
  // danach sieht der Empfaenger sie und die Hinweis-Mail geht hinaus.
  const versand = require('../utils/nachrichtVersand');
  const abZeit = versand.fensterMinuten() > 0 ? versand.zustellungAb() : null;
  const id = await scoped(req, (t) => t.insert(
    `INSERT INTO messages (tenant_id, sender_id, recipient_id, body, zustellung_ab) VALUES (?, ?, ?, ?, ?)`,
    [req.tenantId || 1, req.user.id, recipient_id, body, abZeit]));
  db.activityLog(req.user.id, 'MESSAGE_SENT', 'message', id, req.ip);
  if (!abZeit) {
    // Fenster abgeschaltet: wie frueher sofort benachrichtigen.
    versand.zustellen({
      id, body,
      empfaenger_email: other.email, empfaenger_vorname: other.first_name, empfaenger_nachname: other.last_name,
      absender_vorname: req.user.first_name, absender_nachname: req.user.last_name,
    }).then(() => db.run(`UPDATE messages SET benachrichtigt_am = now() WHERE id = ?`, [id])).catch(() => {});
  }
  res.status(201).json({ success: true, data: { id, rest_sekunden: abZeit ? versand.fensterMinuten() * 60 : 0 } });
}));

// ── Eigene Nachricht im Fenster aendern ─────────────────────────────────────
// Moeglich, solange die Nachricht noch nicht zugestellt ist. Danach bewusst
// nicht mehr: Was der Empfaenger gelesen hat, soll nicht nachtraeglich
// verschwinden koennen.
router.put('/:id', authenticate, wrap(async (req, res) => {
  const versand = require('../utils/nachrichtVersand');
  const id = Number(req.params.id);
  const body = String(req.body.body || '').trim();
  if (!body) return res.status(400).json({ success: false, error: 'Text erforderlich' });
  const m = await scoped(req, (t) => t.get(`SELECT * FROM messages WHERE id = ?`, [id]));
  if (!m || m.sender_id !== req.user.id) return res.status(404).json({ success: false, error: 'Nachricht nicht gefunden' });
  if (!versand.aenderbar(m)) {
    return res.status(409).json({ success: false, error: 'Diese Nachricht wurde bereits zugestellt und lässt sich nicht mehr ändern.' });
  }
  await scoped(req, (t) => t.run(`UPDATE messages SET body = ?, bearbeitet_am = now() WHERE id = ?`, [body, id]));
  db.activityLog(req.user.id, 'MESSAGE_EDITED', 'message', id, req.ip);
  res.json({ success: true, data: { id, rest_sekunden: versand.restsekunden(m) } });
}));

// ── Eigene Nachricht im Fenster zuruecknehmen ───────────────────────────────
// Weiche Ruecknahme: Die Zeile bleibt bestehen, wird aber niemandem mehr
// angezeigt und loest keine Mail aus.
router.delete('/:id', authenticate, wrap(async (req, res) => {
  const versand = require('../utils/nachrichtVersand');
  const id = Number(req.params.id);
  const m = await scoped(req, (t) => t.get(`SELECT * FROM messages WHERE id = ?`, [id]));
  if (!m || m.sender_id !== req.user.id) return res.status(404).json({ success: false, error: 'Nachricht nicht gefunden' });
  if (!versand.aenderbar(m)) {
    return res.status(409).json({ success: false, error: 'Diese Nachricht wurde bereits zugestellt und lässt sich nicht mehr zurücknehmen.' });
  }
  await scoped(req, (t) => t.run(`UPDATE messages SET zurueckgezogen_am = now() WHERE id = ?`, [id]));
  db.activityLog(req.user.id, 'MESSAGE_WITHDRAWN', 'message', id, req.ip);
  res.json({ success: true });
}));

// ── Sprint 15: „Interesse → Chat": Berater zum Mandat kontaktieren ─────────
// Verbindet den Käufer mit dem Mandatsberater und öffnet den Chat-Thread
// (auch ohne NDA). Gibt die Partner-Id (Berater) zurück, damit der Client den
// Thread direkt öffnen kann.
router.post('/contact-advisor', authenticate, msgLimiter, wrap(async (req, res) => {
  const projectId = Number(req.body.project_id);
  if (!projectId) return res.status(400).json({ success: false, error: 'project_id fehlt' });
  const project = await db.get(`SELECT id, codename FROM projects WHERE id = ? AND status = 'active'`, [projectId]);
  if (!project) return res.status(404).json({ success: false, error: 'Mandat nicht gefunden' });
  const advisorId = await require('../utils/dealChat').introduceBuyer({ project, buyer: req.user, reason: 'Kontaktaufnahme' });
  if (!advisorId) return res.status(409).json({ success: false, error: 'Für dieses Mandat ist aktuell kein Ansprechpartner hinterlegt.' });
  res.status(201).json({ success: true, data: { partner_id: advisorId } });
}));

module.exports = router;
