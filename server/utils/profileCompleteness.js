// ─────────────────────────────────────────────────────────────────────────────
// Profil-Vollständigkeit in zwei Stufen (v0.488)
//
// Bis v0.487 gab es eine Liste mit neun Pflichtfeldern, und sie galt überall:
// Anrede, Vorname, Nachname, Unternehmen, Position, Mobilnummer, Straße, PLZ
// und Ort mussten gepflegt sein, bevor jemand ein Mandat auch nur im Detail
// ansehen durfte.
//
// Gemessen im Testdrehbuch war das die früheste und härteste Hürde der ganzen
// Strecke, und sie stand an der Stelle, an der ein Interessent am wenigsten
// Grund hat, sie zu nehmen: Er weiss noch nicht, ob ihn das Mandat überhaupt
// interessiert. Anschrift und Mobilnummer sind an dieser Stelle nicht
// begründbar. Vor einer Vertraulichkeitsvereinbarung sind sie es sehr wohl,
// denn dort wird die Person Vertragspartei.
//
// Deshalb zwei Stufen:
//
//   FRUEH            Anrede, Vorname, Nachname, Unternehmen
//                    Nötig, um ein Mandat im Detail zu sehen. Vier Angaben,
//                    die jeder sofort zur Hand hat.
//
//   VOR_UNTERSCHRIFT zusätzlich Position, Mobilnummer, Straße, PLZ, Ort
//                    Nötig, um eine Vereinbarung anzufordern oder ein eigenes
//                    Mandat anzulegen. Hier ist die Abfrage begründet.
//
// Die E-Mail steht in keiner der beiden Listen. Sie ist die Anmeldung selbst
// und liegt seit der Registrierung vor.
// ─────────────────────────────────────────────────────────────────────────────
const db = require('../db/database');

const FRUEH = ['salutation', 'first_name', 'last_name', 'company'];
// Mobilnummer ist Pflicht (Grundlage 2FA); Festnetz `phone` bleibt optional.
const VOR_UNTERSCHRIFT = [...FRUEH, 'position', 'mobile', 'street', 'postal_code', 'city'];

// Bestandsname, damit alter Code und Prüfungen weiter übersetzen. Er meint
// die vollständige Liste.
const REQUIRED_FIELDS = VOR_UNTERSCHRIFT;

const STUFEN = { frueh: FRUEH, voll: VOR_UNTERSCHRIFT };

function missingProfileFields(user, stufe = 'voll') {
  const felder = STUFEN[stufe] || VOR_UNTERSCHRIFT;
  return felder.filter((f) => !user[f] || String(user[f]).trim() === '');
}

const FIELD_LABELS = {
  salutation: 'Anrede', first_name: 'Vorname', last_name: 'Nachname',
  company: 'Unternehmen', position: 'Position', mobile: 'Mobilnummer', phone: 'Telefonnummer',
  street: 'Straße', postal_code: 'PLZ', city: 'Ort',
};

// Warum gerade jetzt? Der Satz steht in der Meldung und erspart dem Nutzer die
// Frage, wozu das gut sein soll.
const ANLASS = {
  frueh: 'Damit wir wissen, wer das Mandat ansieht, brauchen wir diese Angaben.',
  voll: 'Für eine Vertraulichkeitsvereinbarung werden Sie Vertragspartei. Dafür brauchen wir Ihre vollständigen Kontaktdaten.',
};

/**
 * Express-Middleware. Blockiert buyer und seller mit unvollständigem Profil.
 * Verwaltung und Beratung passieren.
 *
 * @param stufe 'frueh' (vier Angaben) oder 'voll' (neun Angaben)
 *
 * Die Antwort nennt code PROFILE_INCOMPLETE, die fehlenden Felder als
 * Schlüssel und als Beschriftung, die Stufe und den Anlass. Der Client führt
 * den Nutzer damit auf die Profilseite, statt ihn suchen zu lassen.
 */
function requireCompleteProfile(stufe = 'voll') {
  return async (req, res, next) => {
    try {
      if (['super_admin', 'advisor'].includes(req.user.role)) return next();
      const user = await db.get(
        `SELECT salutation, first_name, last_name, company, position, mobile, phone, street, postal_code, city FROM users WHERE id = ?`,
        [req.user.id]
      );
      const missing = missingProfileFields(user || {}, stufe);
      if (missing.length > 0) {
        const namen = missing.map((f) => FIELD_LABELS[f]);
        return res.status(403).json({
          success: false,
          code: 'PROFILE_INCOMPLETE',
          error: `Bitte ergänzen Sie noch ${namen.length === 1 ? 'eine Angabe' : `${namen.length} Angaben`}: ${namen.join(', ')}. ${ANLASS[stufe] || ''}`,
          missing,
          missing_labels: namen,
          stufe,
          anlass: ANLASS[stufe] || null,
        });
      }
      next();
    } catch (e) { next(e); }
  };
}

module.exports = {
  requireCompleteProfile, missingProfileFields,
  REQUIRED_FIELDS, FRUEH, VOR_UNTERSCHRIFT, STUFEN, FIELD_LABELS,
};
