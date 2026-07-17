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

function isEnabled() {
  return !!process.env.TURNSTILE_SECRET;
}

// Gibt true zurück, wenn der Token gültig ist ODER die Prüfung deaktiviert ist.
async function verifyTurnstile(token, ip) {
  if (!isEnabled()) return true;                 // nicht konfiguriert → nicht blockieren
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
