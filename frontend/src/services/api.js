import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '/api',
  timeout: 30000, // 30s for Vercel cold starts
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('nxf_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 - logout
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('nxf_token');
      localStorage.removeItem('nxf_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ---- Auth ----
export const authAPI = {
  signup: (data) => api.post('/auth/signup', data),
  login: (data) => api.post('/auth/login', data),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (data) => api.put('/auth/profile', data),
  regenerateKey: () => api.post('/auth/regenerate-key'),
};

// ---- Clients ----
export const clientsAPI = {
  getAll: () => api.get('/clients'),
  create: (data) => api.post('/clients', data),
  update: (id, data) => api.put(`/clients/${id}`, data),
  delete: (id) => api.delete(`/clients/${id}`),
};

// ---- Contacts ----
export const contactsAPI = {
  getAll: (params) => api.get('/contacts', { params }),
  getOne: (id) => api.get(`/contacts/${id}`),
  create: (data) => api.post('/contacts', data),
  update: (id, data) => api.put(`/contacts/${id}`, data),
  delete: (id) => api.delete(`/contacts/${id}`),
  addTag: (id, tag) => api.post(`/contacts/${id}/tags`, { tag }),
};

// ---- Messages ----
export const messagesAPI = {
  send: (data) => api.post('/messages/send', data),
  getAll: (params) => api.get('/messages', { params }),
};

// ---- Flows ----
export const flowsAPI = {
  getAll: (clientId) => api.get('/flows', { params: { client_id: clientId } }),
  create: (data) => api.post('/flows', data),
  update: (id, data) => api.put(`/flows/${id}`, data),
  delete: (id) => api.delete(`/flows/${id}`),
  trigger: (data) => api.post('/flows/trigger', data),
};

// ---- Keywords ----
export const keywordsAPI = {
  getAll: (clientId) => api.get('/keywords', { params: { client_id: clientId } }),
  create: (data) => api.post('/keywords', data),
  update: (id, data) => api.put(`/keywords/${id}`, data),
  delete: (id) => api.delete(`/keywords/${id}`),
  clone: (from_client_id, to_client_id) => api.post('/keywords/clone', { from_client_id, to_client_id }),
  revert: (ids) => api.post('/keywords/revert', { ids }),
};

// ---- Broadcasts ----
export const broadcastsAPI = {
  getAll: (clientId) => api.get('/broadcasts', { params: { client_id: clientId } }),
  create: (data) => api.post('/broadcasts', data),
};

// ---- Analytics ----
export const analyticsAPI = {
  getSummary: (clientId) => api.get('/analytics/summary', { params: { client_id: clientId } }),
  getPlatform: (clientId) => api.get('/analytics/platform', { params: { client_id: clientId } }),
  getDaily: (clientId) => api.get('/analytics/messages-daily', { params: { client_id: clientId } }),
};

// ---- AI ----
export const aiAPI = {
  reply: (data) => api.post('/ai/reply', data),
  caption: (data) => api.post('/ai/caption', data),
  broadcast: (data) => api.post('/ai/broadcast-message', data),
};

// ---- Payments ----
export const paymentsAPI = {
  getAll: (clientId) => api.get('/payments', { params: { client_id: clientId } }),
  create: (data) => api.post('/payments', data),
  updateStatus: (id, data) => api.put(`/payments/${id}/status`, data),
};

// ---- Instagram (Meta) ----
const getBackendUrl = () => {
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL.replace('/api', '');
  }
  if (typeof window !== 'undefined') {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:5000';
    }
    return window.location.origin;
  }
  return 'http://localhost:5000';
};

const BACKEND_URL = getBackendUrl();

export const metaAPI = {
  getPosts: () => api.get('/meta/media', { baseURL: BACKEND_URL }),
  publishPost: (data) => api.post('/meta/publish', data, { baseURL: BACKEND_URL }),
  getComments: (mediaId) => api.get(`/meta/comments/${mediaId}`, { baseURL: BACKEND_URL }),
  simulateCommentWebhook: (data, clientId) => api.post(clientId ? `/webhook/meta?client_id=${clientId}` : '/webhook/meta', data, { baseURL: BACKEND_URL }),
  simulateWhatsAppWebhook: (data, clientId) => api.post(clientId ? `/webhook/whatsapp?client_id=${clientId}` : '/webhook/whatsapp', data, { baseURL: BACKEND_URL }),
  editPost: (id, data) => api.put(`/meta/media/${id}`, data, { baseURL: BACKEND_URL }),
  deletePost: (id) => api.delete(`/meta/media/${id}`, { baseURL: BACKEND_URL }),
};

export default api;
