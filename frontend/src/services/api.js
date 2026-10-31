import axios from 'axios';

// Support both standard VITE_API_BASE_URL and legacy VITE_API_URL
const rawBase = (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || '/api/v1').trim();
const normalizedBase = rawBase.replace(/\/+$/, '').endsWith('/api/v1')
  ? rawBase.replace(/\/+$/, '')
  : `${rawBase.replace(/\/+$/, '')}/api/v1`;

const api = axios.create({
  baseURL: normalizedBase,
  withCredentials: true,
});

let accessToken = null;
export const setAccessToken = (t) => { accessToken = t; };
export const getAccessToken = () => accessToken;

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

let refreshing = null;
/**
 * Single-flight refresh. Every caller (AuthProvider mount, OAuth callback, the
 * response interceptor) shares one in-flight request so the rotating refresh
 * cookie is never presented twice at the same time. Resolves to `null` when the
 * visitor has no session, so a guest never triggers a 401 in the console.
 */
export function refreshSession() {
  if (!refreshing) {
    refreshing = axios
      .post(`${api.defaults.baseURL}/auth/refresh`, {}, { withCredentials: true })
      .then(({ data }) => {
        const token = data?.data?.accessToken || null;
        setAccessToken(token);
        return token;
      })
      .finally(() => { refreshing = null; });
  }
  return refreshing;
}

api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retried && !original.url?.includes('/auth/')) {
      original._retried = true;
      try {
        const token = await refreshSession();
        if (!token) throw error;
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      } catch (e) {
        window.dispatchEvent(new Event('cc:logout'));
        return Promise.reject(error);
      }
    }
    return Promise.reject(error);
  }
);

/** Absolute URL for a server-relative upload path (e.g. uploads/profile_photos/x.jpg). */
export function fileUrl(p) {
  if (!p) return null;
  if (/^https?:\/\//i.test(p)) return p;
  const base = normalizedBase.replace(/\/api\/v1\/?$/, '').replace(/\/+$/, '');
  return `${base}/${String(p).replace(/^\/+/, '')}`;
}

export function apiErrorMessage(err, fallback = 'Something went wrong.') {
  const d = err?.response?.data;
  if (d?.errors?.length) return d.errors.map((e) => e.message).join(' ');
  return d?.message || fallback;
}

/** Authenticated file download (sends the Bearer token, unlike window.open). */
export async function downloadFile(url, filename) {
  const { data, headers } = await api.get(url, { responseType: 'blob' });
  const fromHeader = headers?.['content-disposition']?.match(/filename="?([^";]+)"?/)?.[1];
  const name = filename || fromHeader || 'download';
  const blobUrl = URL.createObjectURL(new Blob([data]));
  const a = document.createElement('a');
  a.href = blobUrl; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(blobUrl);
}

export default api;
