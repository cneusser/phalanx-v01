// ─────────────────────────────────────────────────────────────────────────────
// Startklar: die geführte Strecke statt eines Punktestands (v0.493)
//
// Anlass, wörtlich: „Batches und Punkte gut, aber warum bekomme ich für den
// Plattform NDA keine Punkte. Was kann ich mit den Punkten machen?" und, als
// Entscheidung: „Eventuell wäre hier eine Art Profilvollständigkeit als Ersatz
// sinnvoll. Kannst Du hier nicht eine Art geführte Strecke machen, wo noch
// Daten fehlen, damit alles optimal läuft und genutzt werden kann?"
//
// Die Punkte waren eine Währung ohne Gegenwert: Man konnte nichts dafür
// bekommen, und die Zahl sagte niemandem, was als Nächstes zu tun ist. Diese
// Datei beantwortet stattdessen eine Frage, die sich jeder stellt: Was fehlt
// noch, damit die Plattform für mich arbeitet?
//
// Jeder Schritt nennt
//   · was fehlt (nicht „Profil unvollständig", sondern die Felder),
//   · wozu es gebraucht wird, und
//   · wohin es führt, als fertiger Verweis mit den fehlenden Feldern daran.
//
// Die Reihenfolge ist die der Strecke selbst: ansehen, unterschreiben,
// gefunden werden. Was schon erledigt ist, bleibt sichtbar, damit der Fortschritt
// nicht verschwindet.
// ─────────────────────────────────────────────────────────────────────────────

const db = require('../db/database');
const { FRUEH, VOR_UNTERSCHRIFT, FIELD_LABELS, missingProfileFields } = require('./profileCompleteness');

// Die Angaben, die die Vereinbarung über die Vertragspartei nennt (v0.490).
const VERTRAGSFELDER = ['company_seat', 'company_register', 'company_representative'];
const VERTRAGSNAMEN = {
  company_seat: 'Sitz',
  company_register: 'Register und Nummer',
  company_representative: 'Vertretungsberechtigte Person',
};

/** Hat dieses Suchprofil überhaupt ein Kriterium? */
function hatKriterien(p) {
  if (!p) return false;
  const liste = (w) => { try { const a = JSON.parse(w || '[]'); return Array.isArray(a) && a.length > 0; } catch { return false; } };
  return liste(p.industries) || liste(p.regions) || liste(p.deal_types)
    || p.revenue_min != null || p.revenue_max != null
    || p.ebitda_min != null || p.ebitda_max != null;
}

/**
 * Die Schritte für eine Person.
 *
 * @returns {Promise<{schritte: Array, offen: number, erledigt: number, gesamt: number, fertig: boolean}>}
 */
async function fuer(userId) {
  const user = await db.get(
    `SELECT salutation, first_name, last_name, company, position, mobile, phone, street, postal_code, city,
            company_seat, company_register, company_representative
       FROM users WHERE id = ?`, [userId]) || {};
  const profil = await db.get('SELECT * FROM buyer_profiles WHERE user_id = ?', [userId]);
  const gespeicherteSuchen = await db.get(
    'SELECT COUNT(*)::int AS c FROM search_profiles WHERE user_id = ?', [userId]).catch(() => ({ c: 0 }));

  const fehltFrueh = missingProfileFields(user, 'frueh');
  const fehltVoll = missingProfileFields(user, 'voll').filter((f) => !FRUEH.includes(f));
  const fehltVertrag = VERTRAGSFELDER.filter((f) => !user[f] || String(user[f]).trim() === '');

  const schritte = [
    {
      kennung: 'kontakt',
      titel: 'Wer Sie sind',
      wozu: 'Vier Angaben genügen, um ein Mandat im Detail anzusehen.',
      fehlt: fehltFrueh,
      fehlt_namen: fehltFrueh.map((f) => FIELD_LABELS[f]),
      erledigt: fehltFrueh.length === 0,
      weiter: `/profil${fehltFrueh.length ? `?fehlt=${fehltFrueh.join(',')}&grund=frueh` : ''}`,
      weiter_text: 'Zum Profil',
    },
    {
      kennung: 'kontaktdaten',
      titel: 'Wie wir Sie erreichen',
      wozu: 'Position, Mobilnummer und Anschrift brauchen wir, sobald Sie eine Vertraulichkeitsvereinbarung anfordern.',
      fehlt: fehltVoll,
      fehlt_namen: fehltVoll.map((f) => FIELD_LABELS[f]),
      erledigt: fehltVoll.length === 0,
      weiter: `/profil${fehltVoll.length ? `?fehlt=${fehltVoll.join(',')}&grund=nda` : ''}`,
      weiter_text: 'Zum Profil',
    },
    {
      kennung: 'vertragspartei',
      titel: 'Ihre Gesellschaft im Vertrag',
      wozu: 'Sitz, Register und vertretungsberechtigte Person stehen im Kopf der Vereinbarung. Fehlen sie, lässt sich nicht unterzeichnen.',
      fehlt: fehltVertrag,
      fehlt_namen: fehltVertrag.map((f) => VERTRAGSNAMEN[f]),
      erledigt: fehltVertrag.length === 0,
      weiter: `/profil${fehltVertrag.length ? `?fehlt=${fehltVertrag.join(',')}&grund=vertrag` : ''}`,
      weiter_text: 'Zum Profil',
    },
    {
      kennung: 'suchkriterien',
      titel: 'Wonach Sie suchen',
      wozu: 'Mit Branchen, Regionen und Größenordnung schlagen wir Ihnen passende Mandate vor, statt Sie alles durchsehen zu lassen.',
      fehlt: hatKriterien(profil) ? [] : ['suchkriterien'],
      fehlt_namen: hatKriterien(profil) ? [] : ['Branchen, Regionen, Größenordnung'],
      erledigt: hatKriterien(profil),
      weiter: '/profil?bereich=suchkriterien',
      weiter_text: 'Suchkriterien pflegen',
    },
    {
      kennung: 'suchauftrag',
      titel: 'Ein gespeicherter Suchauftrag',
      wozu: 'Gespeicherte Suchen melden sich, sobald ein passendes Mandat dazukommt. Ohne sie müssen Sie selbst nachsehen.',
      fehlt: (gespeicherteSuchen && gespeicherteSuchen.c > 0) ? [] : ['suchauftrag'],
      fehlt_namen: (gespeicherteSuchen && gespeicherteSuchen.c > 0) ? [] : ['noch kein Suchauftrag gespeichert'],
      erledigt: !!(gespeicherteSuchen && gespeicherteSuchen.c > 0),
      weiter: '/suchprofile',
      weiter_text: 'Zu den Suchaufträgen',
      freiwillig: true,
    },
  ];

  const erledigt = schritte.filter((s) => s.erledigt).length;
  return {
    schritte,
    erledigt,
    gesamt: schritte.length,
    offen: schritte.length - erledigt,
    // „Fertig" meint: alles, was nötig ist. Der Suchauftrag ist freiwillig und
    // hält den Balken nicht auf.
    fertig: schritte.every((s) => s.erledigt || s.freiwillig),
  };
}

module.exports = { fuer, VERTRAGSFELDER, VERTRAGSNAMEN, hatKriterien };
