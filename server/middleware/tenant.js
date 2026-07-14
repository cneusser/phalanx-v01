// ─────────────────────────────────────────────────────────────────────────────
// Sprint 5: Tenant-Auflösung über Subdomain.
// z. B. kunde1.capitalmatch.de → Tenant mit subdomain='kunde1'.
// Fallback: Default-Tenant 1 (phalanx). Ergebnis liegt an req.tenantId /
// req.tenant. Lookup wird 60 s im Speicher gecacht.
// ─────────────────────────────────────────────────────────────────────────────
const db = require('../db/database');

const cache = new Map(); // subdomain → { tenant, ts }
const TTL = 60 * 1000;

function extractSubdomain(host) {
  if (!host) return null;
  const clean = host.split(':')[0].toLowerCase();
  const parts = clean.split('.');
  // localhost, IPs, *.up.railway.app (Projekt-Subdomain ist KEIN Tenant) → kein Tenant-Subdomain
  if (parts.length < 3 || clean.endsWith('.railway.app') || clean === 'localhost') return null;
  const sub = parts[0];
  return ['www', 'app', 'api'].includes(sub) ? null : sub;
}

async function resolveTenant(req, _res, next) {
  try {
    req.tenantId = 1;
    const sub = extractSubdomain(req.headers['x-forwarded-host'] || req.headers.host);
    if (sub) {
      const cached = cache.get(sub);
      let tenant = cached && Date.now() - cached.ts < TTL ? cached.tenant : undefined;
      if (tenant === undefined) {
        tenant = await db.get(`SELECT * FROM tenants WHERE subdomain = ?`, [sub]) || null;
        cache.set(sub, { tenant, ts: Date.now() });
      }
      if (tenant) {
        req.tenant = tenant;
        req.tenantId = tenant.id;
      }
    }
    next();
  } catch (e) { next(e); }
}

module.exports = { resolveTenant };
