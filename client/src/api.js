const RAW_API_URL = import.meta.env.VITE_API_URL || 'https://n11817143-videoapp.cab432.com';

function trimTrailingSlashes(value) {
  if (!value) return '';

  let result = `${value}`.trim();
  while (result.endsWith('/')) {
    result = result.slice(0, -1);
  }
  return result;
}

function normalizeBaseUrl(url) {
  if (!url) return '';

  const trimmed = trimTrailingSlashes(url);

  try {
    const parsed = new URL(trimmed);
    let pathname = trimTrailingSlashes(parsed.pathname);

    if (pathname === '/api' || pathname === 'api') {
      pathname = '';
    }

    return `${parsed.origin}${pathname}`;
  } catch {
    return trimmed;
  }
}

const API_BASE_URL = normalizeBaseUrl(RAW_API_URL);

function buildRequestUrl(path = '') {
  const sanitizedPath = path.startsWith('/') ? path : `/${path}`;
  return new URL(sanitizedPath, `${API_BASE_URL}/`).toString();
}

async function request(path, { method = 'GET', token, body, headers = {} } = {}) {
  const options = { method, headers: { ...headers } };

  if (token) {
    options.headers.Authorization = `Bearer ${token}`;
  }

  if (body instanceof FormData) {
    options.body = body;
  } else if (body !== undefined) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(body);
  }

  const response = await fetch(buildRequestUrl(path), options);
  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const payload = isJson ? await response.json() : null;

  if (!response.ok) {
    const message = payload?.error?.message || 'Request failed';
    throw new Error(message);
  }

  return payload;
}

const api = {
  // Configuration
  getConfig: () => request('/api/config'),

  // Authentication (will use Cognito)
  register: (username, password, email) =>
    request('/api/auth/register', { method: 'POST', body: { username, password, email } }),
  login: (username, password) =>
    request('/api/auth/login', { method: 'POST', body: { username, password } }),
  confirmSignUp: (username, confirmationCode) =>
    request('/api/auth/confirm', { method: 'POST', body: { username, confirmationCode } }),
  resendConfirmationCode: (username) =>
    request('/api/auth/resend', { method: 'POST', body: { username } }),
  getMe: (token) => request('/api/auth/me', { token }),
  uploadVideo: (token, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return request('/api/videos/upload', { method: 'POST', token, body: formData });
  },
  listVideos: (token, page = 1, limit = 10) =>
    request(`/api/videos?page=${page}&limit=${limit}`, { token }),
  getVideo: (token, id) => request(`/api/videos/${id}`, { token }),
  requestTranscode: (token, id, preset = '720p') =>
    request(`/api/videos/${id}/transcode`, { method: 'POST', token, body: { preset } }),
  deleteVideo: (token, id) => request(`/api/videos/${id}`, { method: 'DELETE', token }),
  getStreamUrl: (id, token, variant = 'original', download = false) => {
    const params = new URLSearchParams();
    params.set('variant', variant);
    if (download) {
      params.set('download', '1');
    }
    if (token) {
      params.set('token', token);
    }
    const url = new URL(buildRequestUrl(`/api/videos/${id}/stream`));
    for (const [key, value] of params.entries()) {
      url.searchParams.set(key, value);
    }
    return url.toString();
  },
  getThumbnailUrl: (id, token) => {
    const params = new URLSearchParams();
    if (token) {
      params.set('token', token);
    }
    const url = new URL(buildRequestUrl(`/api/videos/${id}/thumbnail`));
    for (const [key, value] of params.entries()) {
      url.searchParams.set(key, value);
    }
    return url.toString();
  }
};

export default api;
