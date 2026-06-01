import axios from 'axios';

const BASE_URL = 'https://susurro-production.up.railway.app/api';

export const api = axios.create({ baseURL: BASE_URL, timeout: 10000 });

export const setAuthToken = (token: string | null) => {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
};

export const authApi = {
  register: (data: { email: string; password: string; alias: string }) =>
    api.post('/auth/register', data).then(r => r.data),
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data).then(r => r.data),
};

export const confessionsApi = {
  getFeed: () => api.get('/confessions/feed').then(r => r.data),
  getExplore: () => api.get('/confessions/explore').then(r => r.data),
  getByUser: (alias: string) => api.get(`/confessions/user/${alias}`).then(r => r.data),
  create: (text: string) => api.post('/confessions', { text }).then(r => r.data),
  react: (id: string, type: string) => api.post(`/confessions/${id}/react`, { type }).then(r => r.data),
  getComments: (id: string) => api.get(`/confessions/${id}/comments`).then(r => r.data),
  addComment: (id: string, text: string) => api.post(`/confessions/${id}/comments`, { text }).then(r => r.data),
};

export const usersApi = {
  getProfile: (alias: string) => api.get(`/users/${alias}`).then(r => r.data),
  updateBio: (bio: string) => api.patch('/users/me/bio', { bio }).then(r => r.data),
  follow: (alias: string) => api.post(`/users/${alias}/follow`).then(r => r.data),
  search: (q: string) => api.get(`/users/search?q=${encodeURIComponent(q)}`).then(r => r.data),
  updatePushToken: (token: string) => api.patch('/users/me/push-token', { token }).then(r => r.data),
};
