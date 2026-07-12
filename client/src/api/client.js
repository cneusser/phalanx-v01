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
  const res = await fetch(`${BASE_URL}${path}`, { method: 'POST', headers, body: formData });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Upload fehlgeschlagen');
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
