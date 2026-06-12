const express = require('express');
const db = require('../db/database');
const { authenticate } = require('../middleware/auth');
const router = express.Router();

router.get('/', authenticate, (req, res) => {
  const user = db.prepare('SELECT id, email, role, first_name, last_name, company, position, buyer_type, phone, created_at FROM users WHERE id = ?').get(req.user.id);
  const profile = db.prepare('SELECT * FROM buyer_profiles WHERE user_id = ?').get(req.user.id);
  const parsed = profile ? { ...profile, industries: JSON.parse(profile.industries||'[]'), regions: JSON.parse(profile.regions||'[]'), deal_types: JSON.parse(profile.deal_types||'[]') } : null;
  res.json({ success: true, data: { user, profile: parsed } });
});

router.put('/', authenticate, (req, res) => {
  const { first_name, last_name, company, position, buyer_type, phone, industries, regions, revenue_min, revenue_max, ebitda_min, ebitda_max, deal_types, investment_style, notes } = req.body;
  if (first_name || last_name || company !== undefined || position !== undefined) {
    db.prepare(`UPDATE users SET first_name=COALESCE(?,first_name), last_name=COALESCE(?,last_name), company=COALESCE(?,company), position=COALESCE(?,position), buyer_type=COALESCE(?,buyer_type), phone=COALESCE(?,phone) WHERE id=?`)
      .run(first_name||null, last_name||null, company||null, position||null, buyer_type||null, phone||null, req.user.id);
  }
  const ep = db.prepare('SELECT id FROM buyer_profiles WHERE user_id = ?').get(req.user.id);
  if (ep) {
    db.prepare(`UPDATE buyer_profiles SET industries=COALESCE(?,industries), regions=COALESCE(?,regions), revenue_min=COALESCE(?,revenue_min), revenue_max=COALESCE(?,revenue_max), ebitda_min=COALESCE(?,ebitda_min), ebitda_max=COALESCE(?,ebitda_max), deal_types=COALESCE(?,deal_types), investment_style=COALESCE(?,investment_style), notes=COALESCE(?,notes), updated_at=datetime('now') WHERE user_id=?`)
      .run(industries?JSON.stringify(industries):null, regions?JSON.stringify(regions):null, revenue_min??null, revenue_max??null, ebitda_min??null, ebitda_max??null, deal_types?JSON.stringify(deal_types):null, investment_style||null, notes||null, req.user.id);
  } else {
    db.prepare(`INSERT INTO buyer_profiles (user_id, industries, regions, revenue_min, revenue_max, ebitda_min, ebitda_max, deal_types, investment_style) VALUES (?,?,?,?,?,?,?,?,?)`)
      .run(req.user.id, JSON.stringify(industries||[]), JSON.stringify(regions||[]), revenue_min||0, revenue_max||100, ebitda_min||0, ebitda_max||20, JSON.stringify(deal_types||[]), investment_style||'both');
  }
  res.json({ success: true, data: { message: 'Profil aktualisiert' } });
});

module.exports = router;
