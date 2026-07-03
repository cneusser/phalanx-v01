// ─────────────────────────────────────────────────────────────────────────────
// Profil-Vollständigkeit: Investoren und Verkäufer müssen ihre Kontaktdaten
// gepflegt haben, BEVOR sie ein Mandat im Detail ansehen / Interesse bekunden
// (Investor) bzw. ein Mandat anlegen (Verkäufer) können.
// ─────────────────────────────────────────────────────────────────────────────
const db = require('../db/database');

const REQUIRED_FIELDS = ['salutation', 'first_name', 'last_name', 'company', 'position', 'phone', 'street', 'postal_code', 'city'];

function missingProfileFields(user) {
  return REQUIRED_FIELDS.filter((f) => !user[f] || String(user[f]).trim() === '');
}

const FIELD_LABELS = {
  salutation: 'Anrede', first_name: 'Vorname', last_name: 'Nachname',
  company: 'Unternehmen', position: 'Position', phone: 'Telefonnummer',
  street: 'Straße', postal_code: 'PLZ', city: 'Ort',
};

// Express-Middleware: blockiert buyer/seller mit unvollständigem Profil.
// Admins/Advisor passieren. Antwortet mit code PROFILE_INCOMPLETE, damit der
// Client zur Profilseite führen kann.
function requireCompleteProfile() {
  return async (req, res, next) => {
    try {
      if (['super_admin', 'advisor'].includes(req.user.role)) return next();
      const user = await db.get(
        `SELECT salutation, first_name, last_name, company, position, phone, street, postal_code, city FROM users WHERE id = ?`,
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
