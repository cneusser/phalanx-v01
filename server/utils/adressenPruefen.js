// ─────────────────────────────────────────────────────────────────────────────
// Startprüfung der öffentlichen Adressen (v0.419).
//
// Anlass: Der Login über Phalanx OS scheiterte mit „redirect_uri ist nicht
// registriert: https://phalanx-v01-production.up.railway.app/…". Ursache war
// nicht der Login, sondern FRONTEND_URL: Dort stand die interne Adresse, unter
// der Railway den Dienst betreibt, statt der Adresse, die der Kunde kennt.
//
// Das ist heimtückisch, weil der Login nur der Ort ist, an dem es auffällt.
// FRONTEND_URL steht an 22 Stellen im Code und baut auch jeden Link in jeder
// Mail: Bestätigungen, Einladungen, Newsletter, Pflegeseiten. Die hätten alle
// auf eine Adresse gezeigt, die nicht auf dem Briefkopf steht, bei der kein
// Zertifikat für die Marke liegt und die Railway jederzeit ändern darf.
//
// Deshalb hier eine Prüfung beim Hochfahren. Sie ändert nichts und bricht
// nichts ab, sie sagt nur deutlich, was nicht zusammenpasst.
// ─────────────────────────────────────────────────────────────────────────────

/** Adressen, die nie in einer Kundenmail stehen sollten. */
const INTERN = [/\.up\.railway\.app$/i, /\.railway\.internal$/i, /^localhost$/i, /^127\./, /\.onrender\.com$/i];

function hostVon(wert) {
  try { return new URL(String(wert)).hostname; } catch { return null; }
}

/**
 * Prüft die Umgebung und liefert eine Liste von Beanstandungen.
 * @param env  in der Regel process.env
 * @returns [{ schwere: 'fehler'|'hinweis', text }]
 */
function pruefe(env = process.env) {
  const raus = [];
  const produktiv = String(env.NODE_ENV || '') === 'production';

  const frontend = env.FRONTEND_URL;
  if (frontend) {
    const host = hostVon(frontend);
    if (!host) {
      raus.push({ schwere: 'fehler', text: `FRONTEND_URL ist keine gültige Adresse: ${frontend}` });
    } else if (produktiv && INTERN.some((m) => m.test(host))) {
      raus.push({
        schwere: 'fehler',
        text: `FRONTEND_URL zeigt auf die interne Adresse ${host}. `
          + 'Diese Adresse landet in jedem Maillink und in der Rückkehradresse des Logins. '
          + 'Richtig ist die Adresse, die Ihre Kunden kennen, zum Beispiel https://www.capitalmatch.de',
      });
    } else if (produktiv && !/^https:/i.test(frontend)) {
      raus.push({ schwere: 'fehler', text: `FRONTEND_URL ist nicht https: ${frontend}` });
    }
  }

  // Die Rückkehradresse des Logins muss unter derselben Adresse liegen wie die
  // Oberfläche. Sonst bekommt der Nutzer sein Token auf einem Rechnernamen,
  // unter dem er gar nicht unterwegs ist, und ist auf der richtigen Adresse
  // weiterhin abgemeldet.
  const redirect = env.PHALANX_OS_REDIRECT_URI;
  if (redirect) {
    const rHost = hostVon(redirect);
    const fHost = hostVon(frontend || 'https://www.capitalmatch.de');
    if (!rHost) {
      raus.push({ schwere: 'fehler', text: `PHALANX_OS_REDIRECT_URI ist keine gültige Adresse: ${redirect}` });
    } else if (fHost && rHost !== fHost) {
      raus.push({
        schwere: 'fehler',
        text: `PHALANX_OS_REDIRECT_URI zeigt auf ${rHost}, die Oberfläche aber auf ${fHost}. `
          + 'Nach dem Login landet der Nutzer dann auf dem falschen Rechnernamen und ist dort angemeldet, hier nicht.',
      });
    }
    if (!/\/api\/auth\/phalanx\/callback$/.test(String(redirect))) {
      raus.push({
        schwere: 'hinweis',
        text: `PHALANX_OS_REDIRECT_URI endet nicht auf /api/auth/phalanx/callback: ${redirect}`,
      });
    }
  }

  return raus;
}

/**
 * Prüft und schreibt das Ergebnis ins Protokoll. Absichtlich ohne Abbruch:
 * Eine Plattform, die wegen einer Adresse gar nicht startet, ist schlimmer als
 * eine, die mit einer lauten Warnung läuft.
 */
function pruefeUndMelde(env = process.env, log = console) {
  const funde = pruefe(env);
  for (const f of funde) {
    const zeile = f.schwere === 'fehler' ? `❌  ${f.text}` : `⚠️   ${f.text}`;
    (f.schwere === 'fehler' ? log.error : log.warn).call(log, zeile);
  }
  return funde;
}

module.exports = { pruefe, pruefeUndMelde, INTERN };
