import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Accept': 'application/json',
  },
  timeout: 60000, // 60s timeout (Render free tier cold starts can take 30-50s)
  withCredentials: false, // Token-based auth, no cookies needed cross-origin
});

// Request interceptor — attach token, set content type
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Only set Content-Type to JSON if not multipart
  if (!(config.data instanceof FormData)) {
    config.headers['Content-Type'] = 'application/json';
  }

  return config;
});

// Response interceptor — handle 401 + Render cold-start retries
let isRedirecting = false;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;

    // Retry on network error or timeout (Render cold start)
    if (!config._retry && (!error.response || error.code === 'ECONNABORTED')) {
      config._retry = true;
      config.timeout = 90000; // Extend timeout on retry
      return api(config);
    }

    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');

      const isAuthPage = ['/login', '/register'].some(p => window.location.pathname.startsWith(p));
      if (!isAuthPage && !isRedirecting) {
        isRedirecting = true;
        window.location.href = '/login';
        setTimeout(() => { isRedirecting = false; }, 3000);
      }
    }
    return Promise.reject(error);
  }
  }
);

// ─── Auth ──────────────────────────────────────────
export const authApi = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  updateProfile: (data) => {
    if (data instanceof FormData) {
      data.append('_method', 'PUT');
      return api.post('/auth/profile', data);
    }
    return api.put('/auth/profile', data);
  },
  changePassword: (data) => api.put('/auth/password', data),
  forgotPassword: (data) => api.post('/auth/forgot-password', data),
  resetPassword: (data) => api.post('/auth/reset-password', data),
};

// ─── Stores ────────────────────────────────────────
export const storeApi = {
  list: (params) => api.get('/stores', { params }),
  detail: (slug) => api.get(`/stores/${encodeURIComponent(slug)}`),
  create: (data) => api.post('/stores', data),
  update: (id, data) => api.post(`/stores/${id}`, data), // POST for multipart with _method
  delete: (id) => api.delete(`/stores/${id}`),
  toggleFavorite: (id) => api.post(`/stores/${id}/favorite`),
  myFavorites: (params) => api.get('/my/favorites', { params }),
  myStores: (params) => api.get('/my/stores', { params }),
};

// ─── Reviews ───────────────────────────────────────
export const reviewApi = {
  list: (storeId, params) => api.get(`/stores/${storeId}/reviews`, { params }),
  create: (storeId, data) => api.post(`/stores/${storeId}/reviews`, data),
  update: (id, data) => api.put(`/reviews/${id}`, data),
  delete: (id) => api.delete(`/reviews/${id}`),
};

// ─── Menus ─────────────────────────────────────────
export const menuApi = {
  list: (storeId) => api.get(`/stores/${storeId}/menus`),
  create: (storeId, data) => api.post(`/stores/${storeId}/menus`, data),
  update: (id, data) => api.put(`/menus/${id}`, data),
  delete: (id) => api.delete(`/menus/${id}`),
};

// ─── Locations & Metadata ──────────────────────────
export const locationApi = {
  provinces: () => api.get('/provinces'),
  cities: (provinceId) => api.get(`/provinces/${provinceId}/cities`),
  districts: (cityId) => api.get(`/cities/${cityId}/districts`),
  amenities: () => api.get('/amenities'),
  specialties: () => api.get('/specialties'),
};

// ─── Admin ─────────────────────────────────────────
export const adminApi = {
  dashboard: () => api.get('/admin/dashboard'),
  stores: (params) => api.get('/admin/stores', { params }),
  updateStoreStatus: (id, data) => api.put(`/admin/stores/${id}/status`, data),
  toggleFeatured: (id) => api.post(`/admin/stores/${id}/featured`),
  importStores: (formData) => api.post('/admin/stores/import', formData),
  previewImport: (formData) => {
    formData.append('preview', '1');
    return api.post('/admin/stores/import', formData);
  },
  clearImported: () => api.delete('/admin/stores/imported'),
  exportStores: () => api.get('/admin/stores/export'),
  users: (params) => api.get('/admin/users', { params }),
  updateUser: (id, data) => api.put(`/admin/users/${id}`, data),
  claims: (params) => api.get('/admin/claims', { params }),
  updateClaim: (id, data) => api.put(`/admin/claims/${id}`, data),
};

// ─── Check-in / Check-out ──────────────────────────
export const checkinApi = {
  checkin: (storeId, data) => api.post(`/stores/${storeId}/checkin`, data),
  checkout: (checkinId, data) => api.post(`/checkins/${checkinId}/checkout`, data),
  active: () => api.get('/my/checkin/active'),
  history: (params) => api.get('/my/checkins', { params }),
  storeStats: (storeId) => api.get(`/stores/${storeId}/checkin-stats`),
};

export default api;
