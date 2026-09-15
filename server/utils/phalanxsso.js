// ─────────────────────────────────────────────────────────────────────────────
// SSO „Mit Phalanx OS anmelden" (OpenID Connect, Authorization Code + PKCE S256).
//
// Nur für Admin-/Staff-Konten. Verknüpfung über den stabilen OIDC-'sub'. Beim
// ersten Login wird ein bestehendes Admin-/Staff-Konto mit übereinstimmender,
// verifizierter E-Mail verknüpft; sonst Ablehnung (kein automatisches Anlegen).
// Käufer- und Verkäufer-Logins bleiben unberührt.
//
// Der Zwischenzustand (state, code_verifier, nonce) liegt zustandslos in einem
// kurzlebigen, signierten, httpOnly-Cookie (JWT). Kein Server-Session-Store nötig.
// ─────────────────────────────────────────────────────────────────────────────

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const db = require('../db/database');
const pool = require('../sync/phalanxpool');
const { getJwtSecret } = require('./jwtSecret');

const JWT_SECRET = getJwtSecret();
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const STAFF_ROLES = ['super_admin', 'tenant_owner', 'advisor', 'assistant', 'analyst'];
const COOKIE = 'pxsso';

function frontendUrl() {
  return (process.env.FRONTEND_URL || 'https://www.capitalmatch.de').replace(/\/+$/, '');
}
function redirectUri() {
  return process.env.PHALANX_OS_REDIRECT_URI || `${frontendUrl()}/api/auth/phalanx/callback`;
}
function b64url(buf) {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function pkcePair() {
  const verifier = b64url(crypto.randomBytes(32));
  const challenge = b64url(crypto.createHash('sha256').update(verifier).digest());
  return { verifier, challenge };
}
function parseCookies(req) {
  const out = {};
  const raw = req.headers.cookie || '';
  raw.split(';').forEach((p) => {
    const i = p.indexOf('=');
    if (i > -1) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  });
  return out;
}
function setStateCookie(res, payload) {
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '10m' });
  const secure = process.env.NODE_ENV === 'production';
  res.setHeader('Set-Cookie',
    `${COOKIE}=${encodeURIComponent(token)}; HttpOnly; Path=/api/auth/phalanx; Max-Age=600; SameSite=Lax${secure ? '; Secure' : ''}`);
}
function clearStateCookie(res) {
  const secure = process.env.NODE_ENV === 'production';
  res.setHeader('Set-Cookie',
    `${COOKIE}=; HttpOnly; Path=/api/auth/phalanx; Max-Age=0; SameSite=Lax${secure ? '; Secure' : ''}`);
}

// JWKS-Set je jwks_uri zwischenspeichern (jose ist ESM, daher dynamisch laden).
let _jose = null;
const _jwksByUri = new Map();
async function jose() { if (!_jose) _jose = await import('jose'); return _jose; }
async function jwks(uri) {
  if (!_jwksByUri.has(uri)) { const j = await jose(); _jwksByUri.set(uri, j.createRemoteJWKSet(new URL(uri))); }
  return _jwksByUri.get(uri);
}

// ── GET /api/auth/phalanx/start ──────────────────────────────────────────────
async function start(req, res) {
  if (!pool.isConfigured()) return res.status(503).json({ success: false, error: 'Phalanx OS ist nicht konfiguriert.' });
  const disc = await pool.discovery();
  const c = pool.config();
  const { verifier, challenge } = pkcePair();
  const state = b64url(crypto.randomBytes(16));
  const nonce = b64url(crypto.randomBytes(16));
  setStateCookie(res, { state, verifier, nonce });
  const qs = new URLSearchParams({
    response_type: 'code',
    client_id: c.clientId,
    redirect_uri: redirectUri(),
    scope: 'openid profile email roles',
    state,
    nonce,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  });
  res.redirect(`${disc.authorization_endpoint}?${qs.toString()}`);
}

function fail(res, reason) {
  clearStateCookie(res);
  return res.redirect(`${frontendUrl()}/login?sso_error=${encodeURIComponent(reason)}`);
}

// ── GET /api/auth/phalanx/callback ───────────────────────────────────────────
async function callback(req, res) {
  try {
    if (!pool.isConfigured()) return fail(res, 'nicht_konfiguriert');
    const { code, state, error } = req.query;
    if (error) return fail(res, String(error));
    if (!code || !state) return fail(res, 'fehlende_parameter');

    const cookies = parseCookies(req);
    let stateData;
    try { stateData = jwt.verify(cookies[COOKIE] || '', JWT_SECRET); }
    catch { return fail(res, 'sitzung_abgelaufen'); }
    if (!stateData || stateData.state !== state) return fail(res, 'state_ungueltig');

    const disc = await pool.discovery();
    const c = pool.config();

    // Code gegen Tokens tauschen (PKCE, client_secret_post)
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code: String(code),
      redirect_uri: redirectUri(),
      client_id: c.clientId,
      client_secret: c.clientSecret,
      code_verifier: stateData.verifier,
    });
    const tokRes = await fetch(disc.token_endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body,
    });
    if (!tokRes.ok) return fail(res, 'token_tausch_fehlgeschlagen');
    const tok = await tokRes.json();
    if (!tok.id_token) return fail(res, 'kein_id_token');

    // ID-Token prüfen (RS256 via JWKS, Issuer + Audience + Nonce)
    const j = await jose();
    const keyset = await jwks(disc.jwks_uri);
    let payload;
    try {
      ({ payload } = await j.jwtVerify(tok.id_token, keyset, { issuer: disc.issuer, audience: c.clientId }));
    } catch { return fail(res, 'id_token_ungueltig'); }
    if (stateData.nonce && payload.nonce && payload.nonce !== stateData.nonce) return fail(res, 'nonce_ungueltig');

    const sub = String(payload.sub || '');
    if (!sub) return fail(res, 'kein_subject');
    const email = String(payload.email || '').toLowerCase();
    const emailVerified = payload.email_verified === true || payload.email_verified === 'true';

    // 1. Verknüpfung über sub
    let user = await db.get('SELECT * FROM users WHERE phalanx_os_sub = ?', [sub]).catch(() => null);

    // 2. Erstanmeldung: bestehendes Admin-/Staff-Konto mit verifizierter E-Mail verknüpfen
    if (!user && email && emailVerified) {
      const cand = await db.get('SELECT * FROM users WHERE lower(email) = ?', [email]).catch(() => null);
      if (cand && STAFF_ROLES.includes(cand.role)) {
        await db.run('UPDATE users SET phalanx_os_sub = ? WHERE id = ?', [sub, cand.id]).catch(() => {});
        user = cand;
        db.auditLog(cand.id, 'SSO_LINKED', 'user', cand.id, `Phalanx-OS-sub verknüpft (${email})`, req.ip);
      }
    }

    if (!user) return fail(res, 'kein_konto');
    if (!STAFF_ROLES.includes(user.role)) return fail(res, 'kein_staff_konto');
    if (!user.is_active) return fail(res, 'konto_inaktiv');

    // App-Token ausstellen (wie regulärer Login) und an die SPA übergeben (Hash, nicht Query)
    const appToken = jwt.sign({ userId: user.id, tv: user.token_version || 0 }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    db.auditLog(user.id, 'SSO_LOGIN', 'user', user.id, 'Login über Phalanx OS', req.ip);
    clearStateCookie(res);
    return res.redirect(`${frontendUrl()}/sso#token=${encodeURIComponent(appToken)}`);
  } catch (e) {
    return fail(res, 'unerwarteter_fehler');
  }
}

module.exports = { start, callback, STAFF_ROLES, redirectUri };
