// ─────────────────────────────────────────────────────────────────────────────
// Erinnerungen an ausstehende NDA-Unterschriften (v0.391).
//
// Ein NDA im Status „versendet" wartet auf die Online-Unterschrift des Käufers.
// Bleibt sie aus, erinnert die Plattform nach 3 und nach 7 Tagen, danach nicht
// mehr. Das weitere Nachfassen bleibt bewusst Sache der Beratung.
//
// Die Fälligkeitslogik steht als reine Funktion hier (ohne Datenbank, testbar),
// der schreibende Teil darunter.
// ─────────────────────────────────────────────────────────────────────────────
const db = require('../db/database');

const TAG = 24 * 60 * 60 * 1000;

// Rhythmus in Tagen nach dem Versand, überschreibbar über ENV (z. B. "5,12").
function planTage() {
  const roh = String(process.env.NDA_REMINDER_TAGE || '3,7')
    .split(',').map((s) => Number(s.trim())).filter((n) => Number.isFinite(n) && n > 0);
  return roh.length ? roh : [3, 7];
}

/**
 * Ist für diese NDA-Anfrage jetzt eine Erinnerung fällig?
 * Erwartet: { status, sent_at, online_consent_at, reminder_count, last_reminder_at }
 * Regeln: nur Status „sent", keine Unterschrift, Rhythmus erreicht, Obergrenze
 * nicht überschritten, und nie zwei Erinnerungen binnen 24 Stunden.
 */
function istFaellig(nda, jetzt = new Date(), tage = planTage()) {
  if (!nda || nda.status !== 'sent') return false;
  if (nda.online_consent_at) return false;
  if (!nda.sent_at) return false;
  const anzahl = Number(nda.reminder_count || 0);
  if (anzahl >= tage.length) return false;                       // Serie abgeschlossen
  const alterTage = (jetzt.getTime() - new Date(nda.sent_at).getTime()) / TAG;
  if (alterTage < tage[anzahl]) return false;                    // noch zu früh
  if (nda.last_reminder_at && (jetzt.getTime() - new Date(nda.last_reminder_at).getTime()) < TAG) {
    return false;                                                // heute schon erinnert
  }
  return true;
}

function nachricht({ codename, anzahl, tage }) {
  const letzte = anzahl + 1 >= tage.length;
  const kern = `für das Mandat <strong>${codename || ''}</strong> liegt Ihre Vertraulichkeitsvereinbarung weiterhin zur Unterzeichnung bereit. `
    + 'Sie können sie online in wenigen Augenblicken zeichnen; danach stehen Ihnen das Informationsmemorandum und die weiteren Unterlagen offen.';
  return letzte
    ? `${kern}<br><br>Sollte für Sie kein Interesse mehr bestehen, genügt eine kurze Rückmeldung, dann nehmen wir Sie aus dem Prozess.`
    : kern;
}

// Eine Erinnerung verschicken und den Zähler fortschreiben.
async function erinnern(nda, { manuell = false, actorId = null, ip = null } = {}) {
  const buyer = await db.get('SELECT id, email, first_name, last_name FROM users WHERE id = ?', [nda.user_id]).catch(() => null);
  const proj = await db.get('SELECT id, codename FROM projects WHERE id = ?', [nda.project_id]).catch(() => null);
  if (!buyer || !buyer.email) return false;

  const tage = planTage();
  const anzahl = Number(nda.reminder_count || 0);
  const { sendProcessUpdateEmail } = require('./email');
  await sendProcessUpdateEmail({
    to: buyer.email, firstName: buyer.first_name, person: buyer,
    title: `Erinnerung: NDA für ${proj ? proj.codename : 'das Mandat'} noch nicht unterzeichnet`,
    message: nachricht({ codename: proj ? proj.codename : '', anzahl, tage }),
    ctaLabel: 'NDA jetzt unterzeichnen', ctaPath: `/projekte/${nda.project_id}`,
  });
  await db.run(
    `UPDATE nda_requests SET reminder_count = COALESCE(reminder_count, 0) + 1, last_reminder_at = now() WHERE id = ?`,
    [nda.id]).catch(() => {});
  db.auditLog(actorId, manuell ? 'NDA_REMINDER_MANUAL' : 'NDA_REMINDER_AUTO', 'nda_request', nda.id,
    `Erinnerung ${anzahl + 1} an ${buyer.email}`, ip);
  return true;
}

// Alle fälligen Erinnerungen verschicken. Rückgabe: Anzahl versendeter Mails.
async function runNdaReminders() {
  const tage = planTage();
  const rows = await db.all(`
    SELECT nr.id, nr.user_id, nr.project_id, nr.status, nr.sent_at, nr.online_consent_at,
           nr.reminder_count, nr.last_reminder_at
      FROM nda_requests nr
      JOIN projects p ON p.id = nr.project_id
      JOIN users u ON u.id = nr.user_id
     WHERE nr.status = 'sent' AND nr.online_consent_at IS NULL
       AND u.is_active = 1 AND p.status = 'active'`).catch(() => []);
  const jetzt = new Date();
  let gesendet = 0;
  for (const nda of rows) {
    if (!istFaellig(nda, jetzt, tage)) continue;
    try { if (await erinnern(nda)) gesendet++; }
    catch (e) { console.warn(`NDA-Erinnerung fehlgeschlagen (NDA ${nda.id}):`, e.message); }
  }
  return gesendet;
}

// Manuelle Einzel-Erinnerung aus der Verwaltung (ohne Rücksicht auf den Rhythmus,
// aber mit derselben Sperre gegen zwei Mails am selben Tag).
async function erinnereEinzeln(ndaId, { actorId, ip, force = false } = {}) {
  const nda = await db.get('SELECT * FROM nda_requests WHERE id = ?', [ndaId]).catch(() => null);
  if (!nda) return { ok: false, error: 'NDA nicht gefunden.' };
  if (nda.online_consent_at) return { ok: false, error: 'Dieser NDA ist bereits unterschrieben.' };
  if (nda.status !== 'sent') return { ok: false, error: 'Erinnerung nur möglich, wenn der NDA versendet und noch offen ist.' };
  if (!force && nda.last_reminder_at && (Date.now() - new Date(nda.last_reminder_at).getTime()) < TAG) {
    return { ok: false, error: 'Heute wurde bereits erinnert. Bitte morgen erneut versuchen.' };
  }
  const ok = await erinnern(nda, { manuell: true, actorId, ip });
  return ok ? { ok: true } : { ok: false, error: 'Keine E-Mail-Adresse hinterlegt.' };
}

function startScheduler() {
  if (process.env.NDA_REMINDERS_ENABLED === '0') { console.log('ℹ️  NDA-Erinnerungen: abgeschaltet.'); return; }
  const tick = () => runNdaReminders()
    .then((n) => { if (n) console.log(`✍️  NDA-Erinnerungen: ${n} Mail(s) versendet`); })
    .catch((e) => console.warn('NDA-Erinnerungen fehlgeschlagen:', e.message));
  setTimeout(tick, 150 * 1000);
  setInterval(tick, 6 * 60 * 60 * 1000);   // viermal täglich prüfen, gesendet wird nach Rhythmus
}

module.exports = { istFaellig, planTage, runNdaReminders, erinnereEinzeln, erinnern, nachricht, startScheduler };
