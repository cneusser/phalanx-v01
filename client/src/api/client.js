const BASE_URL = '/api';

function getToken() {
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
