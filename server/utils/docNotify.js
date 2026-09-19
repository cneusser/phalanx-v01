// ─────────────────────────────────────────────────────────────────────────────
// Hinweise auf neue Unterlagen bündeln (v0.396).
//
// Statt je Datei sofort eine Mail zu verschicken, wird ein Hinweis in eine
// Warteschlange gelegt und nach dem Wunsch des Empfängers gebündelt versendet:
// sofort, täglich, wöchentlich oder gar nicht.
//
// Bewusst wird in der Mail KEIN Dateiname genannt, sondern nur Mandat und
// Anzahl. Ein Dateiname wie „Gehaltserhoehung Geschaeftsfuehrer" verrät sonst
// schon im Postfach mehr, als er soll.
// ─────────────────────────────────────────────────────────────────────────────
const db = require('../db/database');

const RHYTHMEN = ['sofort', 'taeglich', 'woechentlich', 'aus'];
const STANDARD = 'taeglich';

function rhythmusOder(wert) {
  return RHYTHMEN.includes(String(wert || '')) ? String(wert) : STANDARD;
}

/** Ist für diesen Empfänger jetzt ein Versand fällig? */
function istFaellig({ rhythmus, aelteste, jetzt = new Date() }) {
  const r = rhythmusOder(rhythmus);
  if (r === 'aus') return false;
  if (!aelteste) return false;
  if (r === 'sofort') return true;
  const stunden = (jetzt.getTime() - new Date(aelteste).getTime()) / 3600000;
  if (r === 'taeglich') return stunden >= 24;
  if (r === 'woechentlich') return stunden >= 24 * 7;
  return false;
}

/** Text der Sammelmeldung: nennt Mandat und Anzahl, nie Dateinamen. */
function text({ codename, anzahl }) {
  const n = Number(anzahl) || 0;
  return n === 1
    ? `Für das Mandat <strong>${codename}</strong> wurde eine neue Unterlage bereitgestellt.`
    : `Für das Mandat <strong>${codename}</strong> wurden <strong>${n}</strong> neue Unterlagen bereitgestellt.`;
}

/** Hinweis einreihen. Mehrere Hinweise je Empfänger und Mandat werden gezählt. */
async function einreihen({ tenantId = 1, userId, projectId }) {
  if (!userId || !projectId) return;
  const offen = await db.get(
    'SELECT id, anzahl FROM doc_notify_queue WHERE user_id = ? AND project_id = ? AND sent_at IS NULL ORDER BY id LIMIT 1',
    [userId, projectId]).catch(() => null);
  if (offen) {
    await db.run('UPDATE doc_notify_queue SET anzahl = anzahl + 1 WHERE id = ?', [offen.id]).catch(() => {});
  } else {
    await db.run(
      'INSERT INTO doc_notify_queue (tenant_id, user_id, project_id, anzahl) VALUES (?, ?, ?, 1)',
      [tenantId, userId, projectId]).catch(() => {});
  }
}

/** Fällige Sammelmeldungen versenden. Rückgabe: Anzahl versendeter Mails. */
async function versendeFaellige(jetzt = new Date()) {
  const offen = await db.all(`
    SELECT q.user_id, q.project_id, SUM(q.anzahl)::int AS anzahl, MIN(q.created_at) AS aelteste,
           u.email, u.first_name, u.last_name, u.doc_notify_frequency, u.is_active,
           p.codename
      FROM doc_notify_queue q
      JOIN users u ON u.id = q.user_id
      JOIN projects p ON p.id = q.project_id
     WHERE q.sent_at IS NULL
     GROUP BY q.user_id, q.project_id, u.email, u.first_name, u.last_name, u.doc_notify_frequency, u.is_active, p.codename
  `).catch(() => []);

  const { sendProcessUpdateEmail } = require('./email');
  let gesendet = 0;
  for (const z of offen) {
    const rhythmus = rhythmusOder(z.doc_notify_frequency);
    if (!z.is_active) continue;
    if (rhythmus === 'aus') {
      // Nicht senden, aber abräumen, damit die Warteschlange nicht wächst.
      await db.run('UPDATE doc_notify_queue SET sent_at = now() WHERE user_id = ? AND project_id = ? AND sent_at IS NULL',
        [z.user_id, z.project_id]).catch(() => {});
      continue;
    }
    if (!istFaellig({ rhythmus, aelteste: z.aelteste, jetzt })) continue;
    try {
      await sendProcessUpdateEmail({
        to: z.email, firstName: z.first_name, person: z,
        title: `Neue Unterlagen: ${z.codename}`,
        message: `${text({ codename: z.codename, anzahl: z.anzahl })}`
          + '<br><br>Wie oft Sie solche Hinweise erhalten möchten, stellen Sie in Ihrem Profil ein.',
        ctaLabel: 'Unterlagen ansehen', ctaPath: `/projekte/${z.project_id}`,
      });
      await db.run('UPDATE doc_notify_queue SET sent_at = now() WHERE user_id = ? AND project_id = ? AND sent_at IS NULL',
        [z.user_id, z.project_id]).catch(() => {});
      gesendet += 1;
    } catch (e) {
      console.warn(`Sammelmeldung fehlgeschlagen (Nutzer ${z.user_id}):`, e.message);
    }
  }
  return gesendet;
}

function startScheduler() {
  if (process.env.DOC_NOTIFY_ENABLED === '0') { console.log('ℹ️  Unterlagen-Hinweise: abgeschaltet.'); return; }
  const tick = () => versendeFaellige()
    .then((n) => { if (n) console.log(`📄 Unterlagen-Hinweise: ${n} Sammelmeldung(en) versendet`); })
    .catch((e) => console.warn('Unterlagen-Hinweise fehlgeschlagen:', e.message));
  setTimeout(tick, 180 * 1000);
  setInterval(tick, 60 * 60 * 1000);   // stündlich prüfen, gesendet wird nach Rhythmus
}

module.exports = { RHYTHMEN, STANDARD, rhythmusOder, istFaellig, text, einreihen, versendeFaellige, startScheduler };
