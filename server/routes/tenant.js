// ─────────────────────────────────────────────────────────────────────────────
// Sprint 5 — Öffentlicher Branding-Endpoint je Tenant.
// Der Client lädt hiermit Name/Farben/Logo des über die Subdomain
// aufgelösten Mandanten (Fallback: Default-Tenant).
// ─────────────────────────────────────────────────────────────────────────────
const express = require('express');
const db = require('../db/database');
const wrap = require('../utils/asyncHandler');
const router = express.Router();

router.get('/branding', wrap(async (req, res) => {
  const tenant = req.tenant || await db.get(`SELECT * FROM tenants WHERE id = 1`);
  res.json({
    success: true,
    data: {
      slug: tenant.slug,
      display_name: tenant.display_name || tenant.name,
      primary_color: tenant.primary_color || '#0D1B36',
      accent_color: tenant.accent_color || '#29ABE2',
      logo_url: tenant.logo_url || null,
    },
  });
}));

module.exports = router;
