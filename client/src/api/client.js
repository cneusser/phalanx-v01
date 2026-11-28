const BASE_URL = '/api';

// ── Gastansicht (v0.444) ────────────────────────────────────────────────────
//
// Zum Prüfen, was ein nicht angemeldeter Besucher sieht. Das Token bleibt im
// Speicher liegen, wird aber nicht mitgeschickt. Damit entscheidet der Server
// genau wie bei einem fremden Besucher, und niemand muss sich darauf verlassen,
// dass die Oberfläche richtig ausblendet.
//
// Bewusst sessionStorage: Die Ansicht endet mit dem Schliessen des Fensters.
// Ein vergessener Gastmodus, der Tage überdauert, sähe aus wie ein Fehler der
// Anmeldung.
export const GAST_SCHLUESSEL = 'phalanx_gastansicht';
export function istGastansicht() {
  try { return sessionStorage.getItem(GAST_SCHLUESSEL) === '1'; } catch { return false; }
}
export function setzeGastansicht(an) {
  try {
    if (an) sessionStorage.setItem(GAST_SCHLUESSEL, '1');
    else sessionStorage.removeItem(GAST_SCHLUESSEL);
  } catch { /* ohne sessionStorage keine Gastansicht */ }
}

function getToken() {
  if (istGastansicht()) return null;
  return localStorage.getItem('phalanx_token');
}

// ── Eine abgelaufene Sitzung führt zur Anmeldung (v0.515) ───────────────────
//
// Anlass: „wenn ich NDA freigeben möchte kommt diese Fehlermeldung."
// Auf dem Dashboard stand „Fehler: Ungültiges Token", darunter die Kennzahlen
// einer Sitzung, die es nicht mehr gab. Ein Fenster bleibt tagelang offen, die
// Sitzung läuft nach sieben Tagen ab, und von da an scheitert jeder Klick, ohne
// dass irgendetwas auf die Ursache hinweist. Zahlen, die noch dastehen, sehen
// dabei aus wie der aktuelle Stand, und das ist der gefährlichere Teil.
//
// Drei Dinge sind hier bewusst eng gefasst:
//
//   · Nur mit Token. Wer ohne Anmeldung den Marktplatz ansieht, bekommt
//     ebenfalls 401 und soll davon nichts merken.
//   · Nicht auf der Anmeldeseite selbst, sonst entsteht eine Schleife.
//   · Liegt ein eigenes Admin-Token daneben, war es ein Birdview-Token. Dann
//     wird das eigene wiederhergestellt statt abgemeldet (wie in v0.459).
const SITZUNG_ENDE = new Set(['SITZUNG_ABGELAUFEN', 'TOKEN_UNGUELTIG', 'KONTO_NICHT_AKTIV']);

function sitzungBeenden(code, angefragt) {
  if (typeof window === 'undefined') return;
  const pfad = window.location.pathname || '';
  if (pfad.startsWith('/login') || pfad.startsWith('/sso')) return;

  // Die Prüfung beim Laden bleibt unberührt. Sie läuft auch auf öffentlichen
  // Seiten, und wer dort mit einem alten Token vorbeikommt, soll weiterlesen
  // können statt auf die Anmeldung geworfen zu werden. Den Fall regelt der
  // Anmeldezusammenhang seit v0.465 selbst.
  if (angefragt === '/auth/me') return;

  const eigenes = localStorage.getItem('phalanx_admin_token');
  if (eigenes) {
    localStorage.setItem('phalanx_token', eigenes);
    localStorage.removeItem('phalanx_admin_token');
    window.location.href = '/admin';
    return;
  }
  localStorage.removeItem('phalanx_token');
  window.location.href = `/login?grund=${code === 'SITZUNG_ABGELAUFEN' ? 'abgelaufen' : 'anmeldung'}`;
}

async function request(method, path, body = null) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const config = { method, headers };
  if (body) config.body = JSON.stringify(body);

  const res = await fetch(`${BASE_URL}${path}`, config);
  const data = await res.json();

  if (!res.ok) {
    const err = new Error(data.error || 'Ein Fehler ist aufgetreten');
    err.status = res.status;
    err.code = data.code || null;   // z. B. IMPERSONATION_READONLY, EMAIL_UNVERIFIED
    // v0.515: Die Sitzung ist zu Ende. Der Fehler wird trotzdem geworfen,
    // damit kein Aufrufer mit undefined weiterrechnet, während der Browser
    // die Seite wechselt.
    if (res.status === 401 && token && SITZUNG_ENDE.has(err.code)) sitzungBeenden(err.code, path);
    // v0.488: Bei PROFILE_INCOMPLETE reicht die Meldung nicht. Der Aufrufer
    // soll den Nutzer auf die Profilseite fuehren koennen, und dafuer braucht
    // er die fehlenden Felder, nicht nur den Satz darueber.
    err.missing = data.missing || null;
    err.missingLabels = data.missing_labels || null;
    err.stufe = data.stufe || null;
    err.anlass = data.anlass || null;
    throw err;
  }
  return data.data;
}

async function uploadFile(path, formData) {
  const token = getToken();
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  // Note: do NOT set Content-Type – let the browser set it with the boundary
  // „Load failed" (Safari) oder „Failed to fetch" (Chrome) heisst: Die
  // Verbindung ist abgerissen, bevor eine Antwort kam. Das ist keine Meldung,
  // mit der jemand etwas anfangen kann, deshalb wird sie hier übersetzt.
  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, { method: 'POST', headers, body: formData });
  } catch (e) {
    throw new Error('Die Verbindung ist während des Uploads abgerissen. '
      + 'Das passiert bei sehr großen Dateien oder einer unterbrochenen Leitung. '
      + `Technisch: ${e.message}`);
  }
  // Antwortet der Server nicht mit JSON, etwa weil ein Zwischenserver
  // dazwischenfunkt, wäre res.json() ein zweiter, irreführender Fehler.
  let data = {};
  try { data = await res.json(); }
  catch { if (!res.ok) throw new Error(`Der Upload wurde abgewiesen (HTTP ${res.status}).`); }
  if (!res.ok) throw new Error(data.error || `Upload fehlgeschlagen (HTTP ${res.status}).`);
  return data.data;
}

export const api = {
  get: (path) => request('GET', path),
  post: (path, body) => request('POST', path, body),
  put: (path, body) => request('PUT', path, body),
  patch: (path, body) => request('PATCH', path, body),
  delete: (path) => request('DELETE', path),
  upload: uploadFile,
};

export { getToken };
