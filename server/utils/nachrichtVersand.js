// ─────────────────────────────────────────────────────────────────────────────
// Verzögerte Zustellung von Nachrichten (v0.399).
//
// Zwischen Abschicken und Zustellen liegt ein kurzes Fenster. In dieser Zeit
// gehört die Nachricht noch dem Absender: Er kann den Text ändern oder die
// Nachricht ganz zurücknehmen. Der Empfänger sieht sie in dieser Zeit nicht,
// und es geht keine Hinweis-Mail hinaus.
//
// Läuft das Fenster ab, versendet dieser Hintergrundlauf die Mail und die
// Nachricht erscheint im Thread des Empfängers. Ab dann ist sie unveränderlich.
//
// Die Länge des Fensters steht in NACHRICHT_FENSTER_MIN (Standard 10 Minuten).
// Der Wert 0 schaltet die Verzögerung ab: Dann wird wie früher sofort zugestellt.
// ─────────────────────────────────────────────────────────────────────────────
// Die Datenbank wird erst im Versandlauf gebraucht. Absichtlich spaet geladen,
// damit die reinen Rechenfunktionen ohne Datenbankverbindung pruefbar bleiben.
const datenbank = () => require('../db/database');

const STANDARD_MINUTEN = 10;

function fensterMinuten() {
  const roh = Number(process.env.NACHRICHT_FENSTER_MIN);
  if (!Number.isFinite(roh) || roh < 0) return STANDARD_MINUTEN;
  return Math.min(roh, 120);           // mehr als zwei Stunden wäre keine Nachricht mehr
}

// Zeitpunkt, ab dem eine jetzt abgeschickte Nachricht zugestellt wird.
function zustellungAb(jetzt = new Date()) {
  const min = fensterMinuten();
  return new Date(jetzt.getTime() + min * 60 * 1000);
}

// Wie lange darf der Absender diese Nachricht noch anfassen? In Sekunden,
// 0 bedeutet: Fenster vorbei oder bereits zugestellt.
function restsekunden(nachricht, jetzt = new Date()) {
  if (!nachricht || !nachricht.zustellung_ab) return 0;
  if (nachricht.benachrichtigt_am || nachricht.zurueckgezogen_am) return 0;
  const rest = new Date(nachricht.zustellung_ab).getTime() - jetzt.getTime();
  return rest > 0 ? Math.ceil(rest / 1000) : 0;
}

function aenderbar(nachricht, jetzt = new Date()) {
  return restsekunden(nachricht, jetzt) > 0;
}

// Zeilenumbrüche aus dem Eingabefeld in der Mail erhalten.
function alsHtml(text) {
  const { escapeHtml } = require('./escapeHtml');
  return escapeHtml(String(text || '')).replace(/\r?\n/g, '<br/>');
}

// ── Versand einer einzelnen fälligen Nachricht ──────────────────────────────
async function zustellen(zeile) {
  const { sendProcessUpdateEmail } = require('./email');
  const { escapeHtml } = require('./escapeHtml');
  const auszug = String(zeile.body || '').slice(0, 400);
  await sendProcessUpdateEmail({
    to: zeile.empfaenger_email,
    firstName: zeile.empfaenger_vorname,
    person: { first_name: zeile.empfaenger_vorname, last_name: zeile.empfaenger_nachname, email: zeile.empfaenger_email },
    title: `Neue Nachricht von ${escapeHtml(zeile.absender_vorname || '')} ${escapeHtml(zeile.absender_nachname || '')}`.trim(),
    message: `Sie haben eine neue Nachricht auf CapitalMatch erhalten:<br/><br/><span style="display:block;background:#F4F8FC;border-left:3px solid #5B8FC9;padding:10px 14px;color:#333;">${alsHtml(auszug)}</span>`,
    ctaLabel: 'Antworten', ctaPath: '/nachrichten',
  });
}

/**
 * Alle fälligen Nachrichten zustellen. Gibt die Anzahl versendeter Mails zurück.
 * Zurückgezogene Nachrichten werden übersprungen und still abgehakt.
 */
async function versendeFaellige(jetzt = new Date()) {
  const db = datenbank();
  const zeilen = await db.all(
    `SELECT m.id, m.body, m.zurueckgezogen_am,
            e.email AS empfaenger_email, e.first_name AS empfaenger_vorname, e.last_name AS empfaenger_nachname,
            a.first_name AS absender_vorname, a.last_name AS absender_nachname
       FROM messages m
       JOIN users e ON e.id = m.recipient_id
       JOIN users a ON a.id = m.sender_id
      WHERE m.benachrichtigt_am IS NULL
        AND m.zustellung_ab IS NOT NULL
        AND m.zustellung_ab <= ?
      ORDER BY m.id
      LIMIT 200`, [jetzt]);

  let versendet = 0;
  for (const zeile of zeilen) {
    if (zeile.zurueckgezogen_am) {
      await db.run(`UPDATE messages SET benachrichtigt_am = now() WHERE id = ?`, [zeile.id]);
      continue;
    }
    try {
      await zustellen(zeile);
      await db.run(`UPDATE messages SET benachrichtigt_am = now() WHERE id = ?`, [zeile.id]);
      versendet += 1;
    } catch (e) {
      // Nicht abhaken: Der nächste Lauf versucht es erneut.
      console.warn(`Nachricht ${zeile.id} konnte nicht zugestellt werden:`, e.message);
    }
  }
  return versendet;
}

function startScheduler() {
  if (process.env.NODE_ENV === 'test') return;
  const tick = () => versendeFaellige()
    .then((n) => { if (n) console.log(`✉️  Nachrichten zugestellt: ${n}`); })
    .catch((e) => console.warn('Nachrichten-Zustellung fehlgeschlagen:', e.message));
  setTimeout(tick, 45 * 1000);
  setInterval(tick, 60 * 1000);   // minütlich, das Fenster ist kurz
}

module.exports = {
  fensterMinuten, zustellungAb, restsekunden, aenderbar,
  versendeFaellige, zustellen, alsHtml, startScheduler, STANDARD_MINUTEN,
};
