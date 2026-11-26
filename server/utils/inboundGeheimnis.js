// ─────────────────────────────────────────────────────────────────────────────
// Prüfung des Webhook-Geheimnisses für /api/inbound (v0.507)
//
// Bisher wurde das Geheimnis auch aus der Adresszeile gelesen (?secret=…).
// Was in der Adresszeile steht, landet in Server-, Proxy- und CDN-Protokollen.
// Deshalb gibt es jetzt zwei Wege, die nicht protokolliert werden:
//
//   1. Kopfzeile  x-inbound-secret: <INBOUND_SECRET>
//   2. Basic Auth https://inbound:<INBOUND_SECRET>@www.capitalmatch.de/api/inbound/email
//      (geht bei Brevo, das keine eigenen Kopfzeilen kennt; der Browser bzw.
//      Absender schickt die Angabe als Authorization-Kopfzeile, nicht in der URL)
//
// Die Adresszeile gilt nur noch übergangsweise, mit Warnung im Protokoll.
// Mit INBOUND_SECRET_IN_ADRESSE=0 wird sie ganz abgeschaltet. Das ist der
// Zielzustand, sobald der Absender umgestellt ist.
// ─────────────────────────────────────────────────────────────────────────────
const crypto = require('crypto');

let gewarnt = false;

function gleich(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

function gegebenesGeheimnis(req) {
  const kopf = req.get && req.get('x-inbound-secret');
  if (kopf) return { wert: kopf, quelle: 'kopfzeile' };
  const auth = (req.get && req.get('authorization')) || '';
  const m = /^Basic\s+([A-Za-z0-9+/=]+)$/i.exec(auth.trim());
  if (m) {
    const klar = Buffer.from(m[1], 'base64').toString('utf8');
    const i = klar.indexOf(':');
    if (i >= 0) return { wert: klar.slice(i + 1), quelle: 'basic' };
  }
  const q = req.query && req.query.secret;
  if (q) return { wert: String(q), quelle: 'adresse' };
  return null;
}

function geheimnisOk(req, env = process.env) {
  const erwartet = env.INBOUND_SECRET;
  if (!erwartet) return false;
  const g = gegebenesGeheimnis(req);
  if (!g) return false;
  if (g.quelle === 'adresse') {
    if (env.INBOUND_SECRET_IN_ADRESSE === '0') return false;
    if (!gewarnt) {
      gewarnt = true;
      console.warn('[inbound] Geheimnis kam über die Adresszeile. Bitte den Absender auf Kopfzeile oder Basic Auth umstellen und danach INBOUND_SECRET_IN_ADRESSE=0 setzen.');
    }
  }
  return gleich(g.wert, erwartet);
}

module.exports = { geheimnisOk, gegebenesGeheimnis };
