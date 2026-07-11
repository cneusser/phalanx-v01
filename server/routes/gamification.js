// Sprint 17 — Gamification / XP: eigener Punktestand.
const express = require('express');
const wrap = require('../utils/asyncHandler');
const { authenticate } = require('../middleware/auth');
const xp = require('../utils/xp');
const router = express.Router();

// Mein Punktestand + Level + jüngste Ereignisse
router.get('/me', authenticate, wrap(async (req, res) => {
  const s = await xp.summary(req.user.id);
  const recent = (s.recent || []).map(e => ({
    action: e.action,
    label: xp.ACTION_LABELS[e.action] || e.action,
    points: e.points,
    created_at: e.created_at,
  }));
  res.json({ success: true, data: { ...s, recent } });
}));

module.exports = router;
