// ─────────────────────────────────────────────────────────────────────────────
// Das Tor vor der Teststufe (v0.482)
//
// Anlass, wörtlich: „Das sollte auch nicht öffentlich zugänglich sein, sondern
// nur auf Einladung, beziehungsweise ich möchte dann einen speziellen Link
// haben, wie zum Beispiel Staging oder Testing."
//
// So funktioniert es: Die Teststufe liegt auf ihrer eigenen Adresse. Wer sie
// ohne Einladung aufruft, bekommt eine schlichte Seite und sonst nichts, keine
// Anmeldemaske, keinen Marktplatz, keine Schnittstelle. Der Einladungslink ist
//
//     https://<adresse>/teststufe/<schluessel>
//
// Er setzt ein Merkmal im Browser, das 30 Tage hält, und schickt weiter auf die
// Startseite. Danach verhält sich die Teststufe wie die Plattform. Christian
// kann den Link weitergeben, ein Dritter braucht kein Konto, um hereinzusehen,
// und ohne Link kommt niemand hinein.
//
// Zwei Festlegungen, die wichtiger sind, als sie aussehen:
//
//   1. Auf der Produktion tut diese Datei nichts. Sie prüft die Stufe bei jeder
//      Anfrage neu und reicht durch, wenn CM_STUFE nicht „teststufe" ist. Eine
//      versehentlich mitgeschleppte Variable kann die Produktion also nicht
//      hinter ein Tor stellen.
//   2. Steht die Stufe auf „teststufe" und fehlt der Schlüssel in der
//      Umgebung, bleibt alles zu. Eine Teststufe ohne Schlüssel ist eine
//      offene Kopie, und das ist der Zustand, den dieses Tor verhindert.
//
// Das Tor ist kein Ersatz für die Anmeldung. Es hält Suchmaschinen und
// Zufallsbesucher draussen. Hinter dem Tor gelten alle Rechte unverändert.
// ─────────────────────────────────────────────────────────────────────────────

const stufen = require('../utils/stufe');

const MERKMAL = 'cm_teststufe';
const DAUER_TAGE = 30;

/** Steht im Browser ein gültiges Merkmal? */
function hatMerkmal(req) {
  const schluessel = process.env.TESTSTUFE_SCHLUESSEL || '';
  if (!schluessel) return false;
  const rohe = String(req.headers.cookie || '');
  const treffer = rohe.split(';').map((s) => s.trim()).find((s) => s.startsWith(`${MERKMAL}=`));
  if (!treffer) return false;
  return decodeURIComponent(treffer.slice(MERKMAL.length + 1)) === schluessel;
}

/** Die Seite, die ein Besucher ohne Einladung sieht. */
function torSeite(res, grund) {
  res.status(401).type('html').send(`<!doctype html>
<html lang="de"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>Teststufe</title>
<style>
  body { margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center;
         font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;
         background:#0f172a; color:#e2e8f0; }
  main { max-width:30rem; padding:2.5rem; text-align:left; }
  h1 { font-size:1.15rem; margin:0 0 .9rem; letter-spacing:.01em; }
  p { font-size:.92rem; line-height:1.6; color:#94a3b8; margin:0 0 .7rem; }
  code { background:#1e293b; padding:.1rem .35rem; border-radius:4px; font-size:.85rem; }
</style></head>
<body><main>
  <h1>Teststufe von CapitalMatch</h1>
  <p>Diese Stufe ist nur mit Einladung erreichbar. ${grund}</p>
  <p>Der Einladungslink hat die Form <code>/teststufe/&lt;Schlüssel&gt;</code> und öffnet
     die Stufe für 30 Tage in diesem Browser.</p>
  <p>Hier liegen ausschliesslich erfundene Mandate. Die Produktion erreichen Sie
     über die gewohnte Adresse.</p>
</main></body></html>`);
}

/**
 * Der Einladungslink. Wird vor dem Tor eingehängt, damit er selbst durchkommt.
 */
function einladung(req, res) {
  if (!stufen.istTeststufe()) return res.redirect('/');
  const schluessel = process.env.TESTSTUFE_SCHLUESSEL || '';
  if (!schluessel || req.params.schluessel !== schluessel) {
    return torSeite(res, 'Dieser Schlüssel passt nicht.');
  }
  res.setHeader('Set-Cookie',
    `${MERKMAL}=${encodeURIComponent(schluessel)}; Path=/; Max-Age=${DAUER_TAGE * 86400}; HttpOnly; SameSite=Lax; Secure`);
  res.redirect('/');
}

/** Das Tor selbst. */
function tor(req, res, next) {
  if (!stufen.istTeststufe()) return next();
  if (!process.env.TESTSTUFE_SCHLUESSEL) {
    // Keine Ausnahme für /api: Eine Teststufe ohne Schlüssel bleibt ganz zu.
    if (req.path.startsWith('/api/')) {
      return res.status(503).json({
        success: false,
        error: 'Die Teststufe ist nicht eingerichtet: TESTSTUFE_SCHLUESSEL fehlt.',
      });
    }
    return torSeite(res, 'Sie ist noch nicht eingerichtet, es fehlt der Schlüssel in der Umgebung.');
  }
  if (hatMerkmal(req)) return next();
  // Der Dienstzustand bleibt offen, damit Railway den Dienst als gesund erkennt.
  if (req.path === '/api/health') return next();
  if (req.path.startsWith('/api/')) {
    return res.status(401).json({ success: false, error: 'Teststufe: Einladung erforderlich.' });
  }
  return torSeite(res, 'Bitte verwenden Sie den Einladungslink.');
}

module.exports = { tor, einladung, hatMerkmal, MERKMAL };
