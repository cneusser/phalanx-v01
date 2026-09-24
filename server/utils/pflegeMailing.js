// ─────────────────────────────────────────────────────────────────────────────
// Aktualisierungsmailing für Firmen-Stammdaten (v0.405).
//
// Das Mailing fragt nicht allgemein nach aktuellen Daten, sondern nennt je
// Empfänger genau die Felder, die bei seiner Firma fehlen. Der Link führt ohne
// Anmeldung auf eine Seite mit genau diesen Feldern. Wer nichts ändern will,
// bestätigt mit einem Klick.
//
// Vier Dinge sind hier sicherheitsrelevant und deshalb ausführlich kommentiert:
//   1. Der Token wird nur gehasst gespeichert und gilt einmal.
//   2. Vor dem Senden wird jede Einladung atomar belegt, sonst schickt ein
//      zweiter Lauf dieselbe Mail noch einmal.
//   3. Je Kampagne gibt es eine Sperre, damit zwei Läufe nicht nebeneinander
//      arbeiten.
//   4. Ohne Einwilligung kommt niemand in einen Verteiler.
// ─────────────────────────────────────────────────────────────────────────────
const crypto = require('crypto');

const voll = require('./vollstaendigkeit');

const datenbank = () => require('../db/database');

// ── Token ───────────────────────────────────────────────────────────────────
function neuerToken() {
  return crypto.randomBytes(24).toString('base64url');   // kurz genug für eine Mail
}
function tokenHash(token) {
  return crypto.createHash('sha256').update(String(token || '')).digest('hex');
}

// ── Versandfenster ──────────────────────────────────────────────────────────
// „08:00" bis „18:00" in der Zeitzone des Servers. Über Mitternacht hinweg wird
// bewusst nicht unterstützt: Ein Mailing, das nachts läuft, will man nicht.
function imFenster(von, bis, jetzt = new Date()) {
  const zuMinuten = (s) => {
    const m = String(s || '').match(/^(\d{1,2}):(\d{2})$/);
    if (!m) return null;
    return Number(m[1]) * 60 + Number(m[2]);
  };
  const a = zuMinuten(von); const b = zuMinuten(bis);
  if (a == null || b == null || a >= b) return true;     // unbrauchbare Angabe sperrt nicht
  const jetztMin = jetzt.getHours() * 60 + jetzt.getMinutes();
  return jetztMin >= a && jetztMin < b;
}

// ── Textbausteine ───────────────────────────────────────────────────────────
function anrede(kontakt) {
  const s = String((kontakt && kontakt.salutation) || '').toLowerCase();
  const nach = (kontakt && kontakt.last_name) || '';
  if (s.startsWith('herr') && nach) return `Sehr geehrter Herr ${nach}`;
  if (s.startsWith('frau') && nach) return `Sehr geehrte Frau ${nach}`;
  const voll2 = [kontakt && kontakt.first_name, nach].filter(Boolean).join(' ');
  return voll2 ? `Guten Tag ${voll2}` : 'Guten Tag';
}

function fuelle(vorlage, werte) {
  return String(vorlage || '')
    .replaceAll('{{anrede}}', werte.anrede || '')
    .replaceAll('{{firma}}', werte.firma || '')
    .replaceAll('{{fehlende_felder}}', werte.fehlende_felder || '')
    .replaceAll('{{link}}', werte.link || '');
}

// Der abgestimmte Text. Er steht hier als Vorgabe und lässt sich je Kampagne
// überschreiben.
const STANDARD_BETREFF = 'Kurz zu Ihren Angaben bei CapitalMatch';
const STANDARD_TEXT = `{{anrede}},

Sie sind bei CapitalMatch als {{firma}} hinterlegt. Damit Anfragen zu Ihnen passen und Sie nicht mit Themen behelligt werden, die Sie nicht betreffen, bitte ich Sie um eine kurze Prüfung Ihrer Angaben.

Bei Ihnen fehlen derzeit: {{fehlende_felder}}

Über diesen Link können Sie die Angaben direkt ergänzen, ohne Anmeldung, in zwei Minuten: {{link}}

Wenn alles stimmt, genügt ein Klick auf „Angaben bestätigen". Dann weiß ich, dass der Stand aktuell ist, und melde mich in dieser Sache nicht wieder.

Herzliche Grüße
Christian Neusser`;

const STANDARD_ERINNERUNG = `{{anrede}},

vor einer Woche hatte ich Sie um eine kurze Prüfung Ihrer Angaben gebeten. Falls es untergegangen ist, hier noch einmal der Link: {{link}}

Bei Ihnen fehlen derzeit: {{fehlende_felder}}

Wenn alles stimmt, genügt ein Klick auf „Angaben bestätigen".

Herzliche Grüße
Christian Neusser`;

// ── Empfängerliste ──────────────────────────────────────────────────────────
/**
 * Wer soll angeschrieben werden?
 * Alle Ansprechpersonen von Firmen mit mindestens einem fehlenden Pflichtfeld,
 * eine Zeile je Person. Ausgeschlossen sind: fehlende oder gesperrte Adresse,
 * Widerspruch im CRM und fehlende Einwilligung.
 */
async function empfaenger(q, { tenant = 1 } = {}) {
  // Kein Loeschkennzeichen an crm_companies, und kein stilles catch: Ein Fehler
  // darf nicht als leere Empfaengerliste enden.
  const firmen = await q.all(`
    SELECT c.id, c.name, c.sektor, c.region, c.employees, c.street, c.postal_code, c.city, c.country
      FROM crm_companies c
     ORDER BY c.name`);
  if (!firmen.length) return { zeilen: [], firmenGeprueft: 0, ohneAnsprechperson: [] };

  const kontakte = await q.all(`
    SELECT k.id, k.first_name, k.last_name, k.salutation, k.email,
           COALESCE(cc.position, k.responsibility) AS responsibility,
           k.consent_status, k.contact_status, cc.company_id
      FROM crm_company_contacts cc
      JOIN crm_contacts k ON k.id = cc.contact_id
     WHERE k.anonymized_at IS NULL AND cc.ended_on IS NULL`);
  const proFirma = new Map();
  for (const k of kontakte) {
    const l = proFirma.get(Number(k.company_id)) || [];
    l.push(k); proFirma.set(Number(k.company_id), l);
  }

  const gesperrt = new Set((await q.all('SELECT email FROM pflege_sperren').catch(() => []))
    .map((r) => String(r.email || '').toLowerCase()));

  const zeilen = [];
  const ohneAnsprechperson = [];
  for (const f of firmen) {
    const liste = proFirma.get(Number(f.id)) || [];
    const { fehlend, labels, vollstaendig } = voll.pruefe(f, liste);
    if (vollstaendig) continue;

    const anschreibbar = liste.filter((k) => {
      if (!k.email || !String(k.email).includes('@')) return false;
      if (gesperrt.has(String(k.email).toLowerCase())) return false;
      if (k.contact_status && k.contact_status !== 'active') return false;
      // Ohne Einwilligung kommt niemand in einen Verteiler.
      return k.consent_status === 'opt_in';
    });
    if (!anschreibbar.length) { ohneAnsprechperson.push({ id: f.id, name: f.name, fehlend: labels }); continue; }

    for (const k of anschreibbar) {
      zeilen.push({
        company_id: f.id, firma: f.name, contact_id: k.id, email: String(k.email).toLowerCase(),
        anrede: anrede(k), fehlend, labels,
      });
    }
  }
  void tenant;
  return { zeilen, firmenGeprueft: firmen.length, ohneAnsprechperson };
}

// ── Einladungen anlegen ─────────────────────────────────────────────────────
async function einladungenAnlegen(q, { tenant = 1, kampagneId }) {
  const { zeilen, ohneAnsprechperson } = await empfaenger(q, { tenant });
  let angelegt = 0; let uebersprungen = 0;
  const klartext = new Map();      // nur im Speicher, für den ersten Versand
  for (const z of zeilen) {
    const da = await q.get('SELECT id FROM pflege_einladungen WHERE kampagne_id = ? AND contact_id = ?',
      [kampagneId, z.contact_id]).catch(() => null);
    if (da) { uebersprungen += 1; continue; }
    const token = neuerToken();
    const id = await q.insert(
      `INSERT INTO pflege_einladungen (tenant_id, kampagne_id, company_id, contact_id, email, token_hash, fehlend_json)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [tenant, kampagneId, z.company_id, z.contact_id, z.email, tokenHash(token), JSON.stringify(z.fehlend)]);
    klartext.set(Number(id), token);
    angelegt += 1;
  }
  return { angelegt, uebersprungen, ohneAnsprechperson, klartext };
}

// ── Versandlauf ─────────────────────────────────────────────────────────────
/**
 * Eine Ration versenden.
 * Die Kampagne wird zuerst gesperrt (atomar), dann wird jede Einladung einzeln
 * belegt. Beides zusammen verhindert, dass dieselbe Mail zweimal hinausgeht,
 * auch wenn zwei Läufe gleichzeitig starten.
 */
async function versendeRation(q, { tenant = 1, kampagneId, appUrl, jetzt = new Date(), erinnerung = false, senden = sendeEinladung } = {}) {
  const k = await q.get('SELECT * FROM pflege_kampagnen WHERE id = ?', [kampagneId]);
  if (!k) return { fehler: 'Kampagne nicht gefunden' };
  if (k.status !== 'laeuft') return { uebersprungen: 'Kampagne läuft nicht' };
  if (!imFenster(k.fenster_von, k.fenster_bis, jetzt)) return { uebersprungen: 'außerhalb des Versandfensters' };

  // Sperre setzen. Nur wer sie bekommt, sendet. Eine Sperre, die älter als eine
  // Stunde ist, gilt als verwaist und wird übernommen.
  const kennung = crypto.randomUUID();
  const belegt = await q.run(
    `UPDATE pflege_kampagnen SET lauf_seit = now(), lauf_kennung = ?
      WHERE id = ? AND (lauf_seit IS NULL OR lauf_seit < now() - interval '1 hour')`,
    [kennung, kampagneId]);
  const habeSperre = typeof belegt === 'number' ? belegt > 0 : true;
  if (!habeSperre) return { uebersprungen: 'Ein Lauf ist bereits unterwegs' };
  const kontrolle = await q.get('SELECT lauf_kennung FROM pflege_kampagnen WHERE id = ?', [kampagneId]);
  if (!kontrolle || kontrolle.lauf_kennung !== kennung) return { uebersprungen: 'Ein Lauf ist bereits unterwegs' };

  try {
    const ration = Math.max(1, Number(k.ration) || 30);
    const pause = Math.max(0, Number(k.pause_sekunden) || 0) * 1000;
    const tage = Math.max(1, Number(k.erinnerung_nach_tagen) || 7);

    const kandidaten = erinnerung
      ? await q.all(
        `SELECT * FROM pflege_einladungen
          WHERE kampagne_id = ? AND status = 'versendet' AND erinnert_am IS NULL
            AND versendet_am < now() - (? || ' days')::interval
          ORDER BY id LIMIT ?`, [kampagneId, tage, ration])
      : await q.all(
        `SELECT * FROM pflege_einladungen
          WHERE kampagne_id = ? AND status = 'offen'
          ORDER BY id LIMIT ?`, [kampagneId, ration]);

    let versendet = 0; const fehler = [];
    for (const e of kandidaten) {
      // Atomar belegen: Nur wer die Zeile umschreibt, darf senden.
      const feld = erinnerung ? 'erinnert_am' : 'belegt_am';
      const bedingung = erinnerung
        ? `id = ? AND erinnert_am IS NULL`
        : `id = ? AND status = 'offen' AND belegt_am IS NULL`;
      const n = await q.run(
        `UPDATE pflege_einladungen SET ${feld} = now()${erinnerung ? '' : ", status = 'belegt'"} WHERE ${bedingung}`,
        [e.id]);
      if (typeof n === 'number' && n === 0) continue;

      try {
        await senden(q, { einladung: e, kampagne: k, appUrl, erinnerung });
        if (!erinnerung) {
          await q.run(`UPDATE pflege_einladungen SET status = 'versendet', versendet_am = now() WHERE id = ?`, [e.id]);
        }
        versendet += 1;
      } catch (err) {
        fehler.push({ id: e.id, grund: err.message });
        if (!erinnerung) await q.run(`UPDATE pflege_einladungen SET status = 'offen', belegt_am = NULL WHERE id = ?`, [e.id]);
      }
      if (pause) await new Promise((r) => setTimeout(r, pause));
    }
    return { versendet, betrachtet: kandidaten.length, fehler };
  } finally {
    await q.run('UPDATE pflege_kampagnen SET lauf_seit = NULL, lauf_kennung = NULL WHERE id = ? AND lauf_kennung = ?',
      [kampagneId, kennung]).catch(() => {});
  }
}

// Eine einzelne Mail bauen und abschicken.
async function sendeEinladung(q, { einladung, kampagne, appUrl, erinnerung = false, tokenKlartext = null }) {
  const { sendProcessUpdateEmail } = require('./email');
  const { escapeHtml } = require('./escapeHtml');
  const firma = await q.get('SELECT name FROM crm_companies WHERE id = ?', [einladung.company_id]).catch(() => null);
  const kontakt = await q.get('SELECT first_name, last_name, salutation FROM crm_contacts WHERE id = ?', [einladung.contact_id]).catch(() => null);

  // Der Klartext des Tokens steht nur beim Anlegen zur Verfügung. Für spätere
  // Läufe wird ein frischer vergeben und der alte ersetzt.
  let token = tokenKlartext;
  if (!token) {
    token = neuerToken();
    await q.run('UPDATE pflege_einladungen SET token_hash = ? WHERE id = ?', [tokenHash(token), einladung.id]);
  }
  const basis = String(appUrl || '').replace(/\/+$/, '');
  const link = `${basis}/stammdaten/${token}`;

  const fehlend = JSON.parse(einladung.fehlend_json || '[]');
  const werte = {
    anrede: anrede(kontakt),
    firma: (firma && firma.name) || 'Ihr Unternehmen',
    fehlende_felder: voll.alsSatz(fehlend.map(voll.labelVon)),
    link,
  };
  const vorlage = erinnerung ? (kampagne.text_erinnerung || STANDARD_ERINNERUNG) : (kampagne.text || STANDARD_TEXT);
  const text = fuelle(vorlage, werte);

  await sendProcessUpdateEmail({
    to: einladung.email,
    firstName: kontakt && kontakt.first_name,
    person: kontakt || {},
    title: kampagne.betreff || STANDARD_BETREFF,
    message: escapeHtml(text).replace(/\r?\n/g, '<br/>'),
    ctaLabel: 'Angaben prüfen',
    ctaPath: `/stammdaten/${token}`,
  });
}

// ── Auswertung ──────────────────────────────────────────────────────────────
async function dashboard(q, kampagneId) {
  const z = await q.all(
    `SELECT status, COUNT(*)::int AS n FROM pflege_einladungen WHERE kampagne_id = ? GROUP BY status`,
    [kampagneId]).catch(() => []);
  const proStatus = Object.fromEntries(z.map((r) => [r.status, Number(r.n)]));
  const summe = (s) => proStatus[s] || 0;
  const gesamt = z.reduce((n, r) => n + Number(r.n), 0);
  return {
    gesamt,
    offen: summe('offen') + summe('belegt'),
    versendet: summe('versendet') + summe('geoeffnet') + summe('ausgefuellt') + summe('bestaetigt'),
    geoeffnet: summe('geoeffnet') + summe('ausgefuellt') + summe('bestaetigt'),
    ausgefuellt: summe('ausgefuellt'),
    bestaetigt: summe('bestaetigt'),
    unzustellbar: summe('unzustellbar'),
    abgemeldet: summe('abgemeldet'),
  };
}

// ── Unzustellbar ────────────────────────────────────────────────────────────
async function alsUnzustellbar(q, { tenant = 1, email, grund }) {
  const adresse = String(email || '').toLowerCase();
  if (!adresse) return 0;
  const n = await q.run(
    `UPDATE pflege_einladungen SET status = 'unzustellbar', unzustellbar_am = now(), unzustellbar_grund = ?
      WHERE lower(email) = ? AND status IN ('versendet', 'belegt', 'offen')`,
    [String(grund || 'ohne Angabe').slice(0, 500), adresse]);
  await q.run(
    `INSERT INTO pflege_sperren (tenant_id, email, grund, quelle) VALUES (?, ?, ?, 'bounce')
     ON CONFLICT (tenant_id, email) DO NOTHING`,
    [tenant, adresse, String(grund || 'unzustellbar').slice(0, 500)]).catch(() => {});
  return typeof n === 'number' ? n : 1;
}

module.exports = {
  neuerToken, tokenHash, imFenster, anrede, fuelle,
  STANDARD_BETREFF, STANDARD_TEXT, STANDARD_ERINNERUNG,
  empfaenger, einladungenAnlegen, versendeRation, sendeEinladung, dashboard, alsUnzustellbar,
  datenbank,
};
