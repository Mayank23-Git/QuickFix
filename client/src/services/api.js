let inMemoryToken = '';

export function setAuthToken(token) {
  inMemoryToken = token || '';
}

export function getAuthToken() {
  return inMemoryToken;
}

export async function apiRequest(path, options = {}) {
  const { method = 'GET', body, headers = {}, signal } = options;

  const requestHeaders = {
    'X-Requested-With': 'PeerUp',
    ...headers,
  };

  if (inMemoryToken) {
    requestHeaders.Authorization = `Bearer ${inMemoryToken}`;
  }

  if (body !== undefined && !(body instanceof FormData)) {
    requestHeaders['Content-Type'] = 'application/json';
  }

  const response = await fetch(path, {
    method,
    headers: requestHeaders,
    credentials: 'include',
    signal,
    body: body !== undefined ? (body instanceof FormData ? body : JSON.stringify(body)) : undefined,
  });

  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await response.json() : null;

  if (!response.ok) {
    const message = data?.error || `Request failed (${response.status})`;
    const err = new Error(message);
    err.status = response.status;
    err.data = data;
    throw err;
  }

  return data;
}
