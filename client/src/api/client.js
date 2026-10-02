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
