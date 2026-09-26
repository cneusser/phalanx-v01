// ─────────────────────────────────────────────────────────────────────────────
// Rundmail an registrierte Konten (v0.409).
//
// Aufbau und Schutzmechanismen wie beim Pflegemailing, weil sie sich bewährt
// haben: Kampagnensperre gegen zwei gleichzeitige Läufe, atomares Belegen je
// Empfänger gegen Doppelversand, Rationen innerhalb eines Zeitfensters, alles
// von Hand angestoßen. Ein Massenversand darf nie aus Versehen loslaufen.
//
// Empfängerkreis: bestätigte, aktive und freigeschaltete Konten. Nicht „alle".
// Adressen ohne bestätigte Registrierung schreiben wir nicht an, und wer im CRM
// widersprochen hat oder auf der Sperrliste steht, bleibt außen vor.
// ─────────────────────────────────────────────────────────────────────────────
const crypto = require('crypto');

const mail = require('./email');
const { imFenster, tokenHash, neuerToken } = require('./pflegeMailing');

const datenbank = () => require('../db/database');

// ── Vorlage ─────────────────────────────────────────────────────────────────
const STANDARD_BETREFF = 'CapitalMatch sieht neu aus, und das hat einen Grund';
const STANDARD_TITEL = 'Ein neues Gesicht für CapitalMatch';
const STANDARD_TEXT = `{{anrede}}

wir haben CapitalMatch in den vergangenen Tagen überarbeitet, und der Anstoß kam von Ihnen: aus dem Feedback der letzten Woche.

Die Rückmeldung war freundlich, aber deutlich. Die Seite habe zu sehr nach schnell zusammengestellter Software ausgesehen und zu wenig nach den Menschen, die dahinterstehen. Ein Nutzer hat offen gesagt, er habe die Plattform anfangs für eine Seite zum Abgreifen von Daten gehalten. Das hat gesessen, und es war berechtigt.

Was sich geändert hat:

Die Oberfläche folgt jetzt derselben Gestaltung wie phalanx.de. Wer zwischen den Auftritten wechselt, merkt keinen Bruch mehr, und unten rechts kommen Sie jederzeit zur Gruppe zurück.

Wir haben jede Aussage gestrichen, die sich nicht belegen lässt. Stattdessen steht da jetzt, wer hinter der Plattform arbeitet, mit Namen, Werdegang und nachprüfbaren Angaben.

Bei den Mandaten sehen Sie öffentlich nur noch Größenordnungen. Firmenname und genaue Zahlen gibt es erst nach Freischaltung und Vertraulichkeitsvereinbarung. Das schützt die Unternehmen, die uns ihre Nachfolge anvertrauen.

Und Sie können ab sofort auf jeder Seite direkt einen Termin mit mir buchen, ohne Umweg über ein Formular.

Schauen Sie gern einmal vorbei. Im Marktplatz stehen die aktuellen Mandate, und wenn Sie ein Vorhaben besprechen möchten, ob Verkauf, Zukauf oder Nachfolge, dann rufen Sie mich an oder suchen sich einen Termin aus. Ein erstes Gespräch kostet nichts und verpflichtet zu nichts.

Herzliche Grüße
Christian Neusser`;

/** Anrede aus einem Nutzerdatensatz. Nutzt dieselbe Regel wie alle Mails. */
function anrede(user) {
  return mail.greetingLine(user || {}).replace(/,$/, '');
}

/** {{anrede}} einsetzen; unbekannte Platzhalter verschwinden. */
function fuelle(vorlage, werte) {
  return String(vorlage || '')
    .replaceAll('{{anrede}}', werte.anrede || '')
    .replace(/\{\{[a-z_]+\}\}/gi, '');
}

/** Fließtext zu Absätzen. Leerzeile trennt, wie überall im Haus. */
function alsHtml(text) {
  const esc = (s) => String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return String(text || '').split(/\n{2,}/).map((a) => a.trim()).filter(Boolean)
    .map((a) => `<p>${esc(a).replace(/\n/g, '<br/>')}</p>`).join('\n');
}

// ── Empfänger ───────────────────────────────────────────────────────────────
/**
 * Wer wird angeschrieben?
 * Nur bestätigte, aktive und freigeschaltete Konten. Kein catch um die Abfrage:
 * Ein Fehler soll sichtbar werden und nicht als leere Empfängerliste enden.
 */
async function empfaenger(q, { tenant = 1 } = {}) {
  const spalten = await q.all(`
    SELECT column_name FROM information_schema.columns WHERE table_name = 'users'`).catch(() => []);
  const hat = (n) => spalten.some((c) => c.column_name === n);
  const bedingungen = ['u.is_active = 1', 'u.is_approved = 1', "u.email IS NOT NULL", "u.email <> ''"];
  // Die Spalte für die Adressbestätigung heißt je nach Stand anders.
  if (hat('email_verified')) bedingungen.push('u.email_verified = 1');
  else if (hat('email_verified_at')) bedingungen.push('u.email_verified_at IS NOT NULL');
  if (hat('anonymized_at')) bedingungen.push('u.anonymized_at IS NULL');

  const nutzer = await q.all(`
    SELECT u.id, u.email, u.salutation, u.title, u.first_name, u.last_name, u.role
      FROM users u
     WHERE ${bedingungen.join(' AND ')}
     ORDER BY u.id`);

  // Widerspruch im CRM und Sperrlisten gelten auch hier.
  const raus = new Set();
  for (const sql of [
    `SELECT lower(email) AS email FROM crm_contacts WHERE consent_status = 'opt_out' AND email IS NOT NULL`,
    'SELECT lower(email) AS email FROM pflege_sperren',
  ]) {
    for (const r of await q.all(sql).catch(() => [])) if (r.email) raus.add(r.email);
  }

  const zeilen = [];
  const ausgeschlossen = [];
  for (const u of nutzer) {
    const adresse = String(u.email).toLowerCase();
    if (raus.has(adresse)) { ausgeschlossen.push({ email: adresse, grund: 'Widerspruch oder Sperre' }); continue; }
    zeilen.push({ user_id: u.id, email: adresse, anrede: anrede(u), rolle: u.role });
  }
  void tenant;
  return { zeilen, geprueft: nutzer.length, ausgeschlossen };
}

// ── Empfänger anlegen ───────────────────────────────────────────────────────
async function empfaengerAnlegen(q, { tenant = 1, rundmailId }) {
  const { zeilen, geprueft, ausgeschlossen } = await empfaenger(q, { tenant });
  let angelegt = 0; let uebersprungen = 0;
  for (const z of zeilen) {
    const da = await q.get('SELECT id FROM rundmail_empfaenger WHERE rundmail_id = ? AND user_id = ?',
      [rundmailId, z.user_id]).catch(() => null);
    if (da) { uebersprungen += 1; continue; }
    await q.insert(
      `INSERT INTO rundmail_empfaenger (tenant_id, rundmail_id, user_id, email, token_hash)
       VALUES (?, ?, ?, ?, ?)`,
      [tenant, rundmailId, z.user_id, z.email, tokenHash(neuerToken())]);
    angelegt += 1;
  }
  return { angelegt, uebersprungen, geprueft, ausgeschlossen };
}

// ── Eine Mail bauen und abschicken ──────────────────────────────────────────
async function sendeEine(q, { zeile, rundmail, appUrl }) {
  const u = await q.get('SELECT salutation, title, first_name, last_name FROM users WHERE id = ?', [zeile.user_id]);
  const basis = String(appUrl || '').replace(/\/+$/, '');
  // Frischer Abmeldetoken, gespeichert wird nur sein Hashwert.
  const token = neuerToken();
  await q.run('UPDATE rundmail_empfaenger SET token_hash = ? WHERE id = ?', [tokenHash(token), zeile.id]);

  const text = fuelle(rundmail.text, { anrede: anrede(u) });
  const html = mail.mailShell(rundmail.titel, `
    ${alsHtml(text)}
    ${mail.ctaButton('Marktplatz ansehen', `${basis}/projekte`)}
  `, {
    promo: false,
    abmelden: {
      text: 'Solche Hinweise zur Plattform nicht mehr erhalten?',
      url: `${basis}/api/stammdaten/rundmail-abmelden/${token}`,
    },
  });

  await mail.sendMail({
    to: zeile.email,
    subject: rundmail.betreff,
    html,
    meta: { art: 'rundmail', rundmail_id: rundmail.id },
  });
}

// ── Versandlauf ─────────────────────────────────────────────────────────────
/**
 * Eine Ration versenden.
 * Erst die Kampagne sperren, dann jede Zeile einzeln belegen. Beides zusammen
 * verhindert, dass dieselbe Mail zweimal hinausgeht, auch wenn zwei Läufe
 * gleichzeitig starten.
 */
async function versendeRation(q, { tenant = 1, rundmailId, appUrl, jetzt = new Date(), senden = sendeEine } = {}) {
  const k = await q.get('SELECT * FROM rundmails WHERE id = ?', [rundmailId]);
  if (!k) return { fehler: 'Rundmail nicht gefunden' };
  if (k.status !== 'laeuft') return { uebersprungen: 'Rundmail ist nicht freigegeben' };
  if (!imFenster(k.fenster_von, k.fenster_bis, jetzt)) return { uebersprungen: 'außerhalb des Versandfensters' };

  const kennung = crypto.randomUUID();
  const belegt = await q.run(
    `UPDATE rundmails SET lauf_seit = now(), lauf_kennung = ?
      WHERE id = ? AND (lauf_seit IS NULL OR lauf_seit < now() - interval '1 hour')`,
    [kennung, rundmailId]);
  const habeSperre = typeof belegt === 'number' ? belegt > 0 : true;
  if (!habeSperre) return { uebersprungen: 'Ein Lauf ist bereits unterwegs' };
  const kontrolle = await q.get('SELECT lauf_kennung FROM rundmails WHERE id = ?', [rundmailId]);
  if (!kontrolle || kontrolle.lauf_kennung !== kennung) return { uebersprungen: 'Ein Lauf ist bereits unterwegs' };

  try {
    const ration = Math.max(1, Number(k.ration) || 40);
    const pause = Math.max(0, Number(k.pause_sekunden) || 0) * 1000;
    const kandidaten = await q.all(
      `SELECT * FROM rundmail_empfaenger
        WHERE rundmail_id = ? AND status = 'offen'
        ORDER BY id LIMIT ?`, [rundmailId, ration]);

    let versendet = 0; const fehler = [];
    for (const e of kandidaten) {
      const n = await q.run(
        `UPDATE rundmail_empfaenger SET belegt_am = now(), status = 'belegt'
          WHERE id = ? AND status = 'offen' AND belegt_am IS NULL`, [e.id]);
      if (typeof n === 'number' && n === 0) continue;

      try {
        await senden(q, { zeile: e, rundmail: k, appUrl });
        await q.run(`UPDATE rundmail_empfaenger SET status = 'versendet', versendet_am = now() WHERE id = ?`, [e.id]);
        versendet += 1;
      } catch (err) {
        fehler.push({ id: e.id, grund: err.message });
        // Unzustellbar heißt: Adresse sperren, damit sie in keinem weiteren
        // Mailing wieder auftaucht. Grund im Klartext, nicht nur ein Code.
        const dauerhaft = /550|5\.1\.1|no such user|does not exist|unknown recipient|mailbox unavailable/i.test(err.message || '');
        if (dauerhaft) {
          await q.run(
            `UPDATE rundmail_empfaenger SET status = 'unzustellbar', unzustellbar_am = now(), unzustellbar_grund = ? WHERE id = ?`,
            [String(err.message).slice(0, 300), e.id]);
          await q.run(
            `INSERT INTO pflege_sperren (tenant_id, email, grund, quelle) VALUES (?, ?, ?, 'bounce')
             ON CONFLICT (tenant_id, email) DO NOTHING`,
            [tenant, e.email, `Unzustellbar: ${String(err.message).slice(0, 200)}`]).catch(() => {});
        } else {
          await q.run(`UPDATE rundmail_empfaenger SET status = 'offen', belegt_am = NULL WHERE id = ?`, [e.id]);
        }
      }
      if (pause) await new Promise((r) => setTimeout(r, pause));
    }
    return { versendet, betrachtet: kandidaten.length, fehler };
  } finally {
    await q.run('UPDATE rundmails SET lauf_seit = NULL, lauf_kennung = NULL WHERE id = ? AND lauf_kennung = ?',
      [rundmailId, kennung]).catch(() => {});
  }
}

// ── Übersicht ───────────────────────────────────────────────────────────────
async function dashboard(q, rundmailId) {
  const z = await q.all(
    `SELECT status, COUNT(*)::int AS n FROM rundmail_empfaenger WHERE rundmail_id = ? GROUP BY status`,
    [rundmailId]).catch(() => []);
  const pro = Object.fromEntries(z.map((r) => [r.status, Number(r.n)]));
  const s = (k) => pro[k] || 0;
  return {
    gesamt: z.reduce((n, r) => n + Number(r.n), 0),
    offen: s('offen') + s('belegt'),
    versendet: s('versendet'),
    abgemeldet: s('abgemeldet'),
    unzustellbar: s('unzustellbar'),
  };
}

/** Abmeldung über den Einmal-Link. Gilt nur für Rundmails, nie für den Zugang. */
async function abmelden(token, { tenant = 1 } = {}) {
  const db = datenbank();
  const e = await db.get('SELECT * FROM rundmail_empfaenger WHERE token_hash = ?', [tokenHash(token)]).catch(() => null);
  if (!e) return { ok: false, fehler: 'Der Link ist ungültig.' };
  await db.run(`UPDATE rundmail_empfaenger SET status = 'abgemeldet', abgemeldet_am = now() WHERE id = ?`, [e.id]);
  await db.run(
    `INSERT INTO pflege_sperren (tenant_id, email, grund, quelle)
     VALUES (?, ?, 'Abmeldung von Hinweisen zur Plattform', 'abmeldung')
     ON CONFLICT (tenant_id, email) DO NOTHING`, [e.tenant_id || tenant, e.email]).catch(() => {});
  return { ok: true };
}

module.exports = {
  STANDARD_BETREFF, STANDARD_TITEL, STANDARD_TEXT,
  anrede, fuelle, alsHtml,
  empfaenger, empfaengerAnlegen, sendeEine, versendeRation, dashboard, abmelden,
};
