// ─────────────────────────────────────────────────────────────────────────────
// Profil-Vollständigkeit: Investoren und Verkäufer müssen ihre Kontaktdaten
// gepflegt haben, BEVOR sie ein Mandat im Detail ansehen / Interesse bekunden
// (Investor) bzw. ein Mandat anlegen (Verkäufer) können.
// ─────────────────────────────────────────────────────────────────────────────
const db = require('../db/database');

const REQUIRED_FIELDS = ['first_name', 'last_name', 'company', 'position', 'phone'];

function missingProfileFields(user) {
  return REQUIRED_FIELDS.filter((f) => !user[f] || String(user[f]).trim() === '');
}

const FIELD_LABELS = {
  first_name: 'Vorname', last_name: 'Nachname', company: 'Unternehmen',
  position: 'Position', phone: 'Telefonnummer',
};

// Express-Middleware: blockiert buyer/seller mit unvollständigem Profil.
// Admins/Advisor passieren. Antwortet mit code PROFILE_INCOMPLETE, damit der
// Client zur Profilseite führen kann.
function requireCompleteProfile() {
  return async (req, res, next) => {
    try {
      if (['super_admin', 'advisor'].includes(req.user.role)) return next();
      const user = await db.get(
        `SELECT first_name, last_name, company, position, phone FROM users WHERE id = ?`,
        [req.user.id]
      );
      const missing = missingProfileFields(user || {});
      if (missing.length > 0) {
        return res.status(403).json({
          success: false,
          code: 'PROFILE_INCOMPLETE',
          error: `Bitte vervollständigen Sie zuerst Ihr Profil (fehlend: ${missing.map(f => FIELD_LABELS[f]).join(', ')}). Ihre Kontaktdaten sind Voraussetzung für die Teilnahme am Prozess.`,
          missing,
        });
      }
      next();
    } catch (e) { next(e); }
  };
}

module.exports = { requireCompleteProfile, missingProfileFields, REQUIRED_FIELDS };
