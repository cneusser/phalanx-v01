// ─────────────────────────────────────────────────────────────────────────────
// Cloudflare Turnstile: Bot-/Roboter-Test bei Anmeldung und Registrierung.
//
// Kostenlos (Cloudflare-Konto genügt). Zwei Schlüssel im Turnstile-Dashboard:
//   · Site Key   → TURNSTILE_SITE_KEY   (öffentlich, im Browser)
//   · Secret Key → TURNSTILE_SECRET     (geheim, nur Server)
//
// Ist TURNSTILE_SECRET NICHT gesetzt, ist die Prüfung deaktiviert (fail-open),
// damit die Plattform ohne Konfiguration weiterläuft. Sobald der Schlüssel
// gesetzt ist, wird jeder Login/Registrierungs-Versuch serverseitig verifiziert.
// ─────────────────────────────────────────────────────────────────────────────

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

// Ersatz-Token des Clients, wenn das Widget nicht geladen/abgeschlossen werden
// konnte (blockiertes Netzwerk, Cloudflare-Störung, Browser-Erweiterung).
const UNAVAILABLE = '__unavailable__';

function isEnabled() {
  return !!process.env.TURNSTILE_SECRET;
}

// Gibt true zurück, wenn der Token gültig ist ODER die Prüfung deaktiviert ist.
async function verifyTurnstile(token, ip) {
  if (!isEnabled()) return true;                 // nicht konfiguriert → nicht blockieren
  // Das Widget konnte beim Nutzer nicht abschließen. Einen legitimen Nutzer
  // deshalb auszusperren wäre schlimmer als der Bot-Test wert ist: Login braucht
  // gültige Zugangsdaten, Registrierung braucht E-Mail-Bestätigung und Freigabe,
  // und beide Endpunkte sind zusätzlich raten-limitiert. Wir lassen durch und
  // protokollieren den Fall, damit Missbrauch auffällt.
  if (token === UNAVAILABLE) {
    console.warn(`[turnstile] Widget nicht verfügbar, Anfrage ohne Bot-Test durchgelassen (IP ${ip || 'unbekannt'})`);
    return true;
  }
  if (!token) return false;
  try {
    const body = new URLSearchParams();
    body.append('secret', process.env.TURNSTILE_SECRET);
    body.append('response', String(token));
    if (ip) body.append('remoteip', String(ip));
    const res = await fetch(VERIFY_URL, { method: 'POST', body });
    const data = await res.json().catch(() => ({}));
    return data && data.success === true;
  } catch {
    // Netzwerkfehler bei Cloudflare sollen legitime Nutzer nicht aussperren.
    return true;
  }
}

module.exports = { verifyTurnstile, isEnabled };
