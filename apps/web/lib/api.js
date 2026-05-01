/**
 * Tiny fetch wrapper with cookie credentials and automatic refresh-on-401.
 * Call shape:  api.get('/auth/me')
 *              api.post('/auth/login', { email, password })
 *              api.upload('/upload', formData)
 *
 * The browser sends/receives the httpOnly auth cookies automatically thanks to
 * `credentials: 'include'` and the API's CORS config.
 */
const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

let refreshPromise = null;

async function refresh() {
  // Coalesce concurrent refreshes into one network call.
  if (!refreshPromise) {
    refreshPromise = fetch(`${BASE}/api/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    }).finally(() => {
      // Reset after a short delay so a near-simultaneous burst still coalesces.
      setTimeout(() => (refreshPromise = null), 100);
    });
  }
  const res = await refreshPromise;
  return res.ok;
}

async function request(method, path, body, { isForm = false, retried = false } = {}) {
  const headers = { Accept: 'application/json' };
  let payload = undefined;
  if (body !== undefined) {
    if (isForm) {
      payload = body; // FormData — let the browser set Content-Type
    } else {
      headers['Content-Type'] = 'application/json';
      payload = JSON.stringify(body);
    }
  }

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: payload,
    credentials: 'include',
  });

  // Try one transparent refresh on 401 (except on the auth endpoints themselves)
  if (res.status === 401 && !retried && !path.startsWith('/api/auth/')) {
    const ok = await refresh();
    if (ok) return request(method, path, body, { isForm, retried: true });
  }

  if (res.status === 204) return null;
  const text = await res.text();
  const data = text ? safeJson(text) : null;
  if (!res.ok) {
    const err = new Error(data?.error || res.statusText);
    err.status = res.status;
    err.details = data?.details;
    throw err;
  }
  return data;
}

function safeJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export const api = {
  get: (path) => request('GET', path),
  post: (path, body) => request('POST', path, body),
  patch: (path, body) => request('PATCH', path, body),
  put: (path, body) => request('PUT', path, body),
  del: (path) => request('DELETE', path),
  upload: (path, formData) => request('POST', path, formData, { isForm: true }),
  base: BASE,
};
