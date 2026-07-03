const express = require('express');
const db = require('../db/database');
const { authenticate } = require('../middleware/auth');
const wrap = require('../utils/asyncHandler');
const router = express.Router();

router.get('/', authenticate, wrap(async (req, res) => {
  const user = await db.get('SELECT id, email, role, first_name, last_name, company, position, buyer_type, phone, created_at FROM users WHERE id = ?', [req.user.id]);
  const profile = await db.get('SELECT * FROM buyer_profiles WHERE user_id = ?', [req.user.id]);
  const parsed = profile ? { ...profile, industries: JSON.parse(profile.industries||'[]'), regions: JSON.parse(profile.regions||'[]'), deal_types: JSON.parse(profile.deal_types||'[]') } : null;
  res.json({ success: true, data: { user, profile: parsed } });
}));

router.put('/', authenticate, wrap(async (req, res) => {
  const { first_name, last_name, company, position, buyer_type, phone, industries, regions, revenue_min, revenue_max, ebitda_min, ebitda_max, deal_types, investment_style, notes } = req.body;
  if (first_name || last_name || company !== undefined || position !== undefined) {
    await db.run(`UPDATE users SET first_name=COALESCE(?,first_name), last_name=COALESCE(?,last_name), company=COALESCE(?,company), position=COALESCE(?,position), buyer_type=COALESCE(?,buyer_type), phone=COALESCE(?,phone) WHERE id=?`,
      [first_name||null, last_name||null, company||null, position||null, buyer_type||null, phone||null, req.user.id]);
  }
  const ep = await db.get('SELECT id FROM buyer_profiles WHERE user_id = ?', [req.user.id]);
  if (ep) {
    await db.run(`UPDATE buyer_profiles SET industries=COALESCE(?,industries), regions=COALESCE(?,regions), revenue_min=COALESCE(?,revenue_min), revenue_max=COALESCE(?,revenue_max), ebitda_min=COALESCE(?,ebitda_min), ebitda_max=COALESCE(?,ebitda_max), deal_types=COALESCE(?,deal_types), investment_style=COALESCE(?,investment_style), notes=COALESCE(?,notes), updated_at=now() WHERE user_id=?`,
      [industries?JSON.stringify(industries):null, regions?JSON.stringify(regions):null, revenue_min??null, revenue_max??null, ebitda_min??null, ebitda_max??null, deal_types?JSON.stringify(deal_types):null, investment_style||null, notes||null, req.user.id]);
  } else {
    await db.run(`INSERT INTO buyer_profiles (user_id, industries, regions, revenue_min, revenue_max, ebitda_min, ebitda_max, deal_types, investment_style) VALUES (?,?,?,?,?,?,?,?,?)`,
      [req.user.id, JSON.stringify(industries||[]), JSON.stringify(regions||[]), revenue_min||0, revenue_max||100, ebitda_min||0, ebitda_max||20, JSON.stringify(deal_types||[]), investment_style||'both']);
  }
  res.json({ success: true, data: { message: 'Profil aktualisiert' } });
}));

module.exports = router;
