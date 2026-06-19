import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const API_BASE = 'https://susurro-production.up.railway.app';
const BASE_URL = `${API_BASE}/api`;

export const api = axios.create({ baseURL: BASE_URL, timeout: 15000 });

let _authToken: string | null = null;

export const setAuthToken = (token: string | null) => {
  _authToken = token;
};

api.interceptors.request.use(async (config) => {
  const token = _authToken ?? (await AsyncStorage.getItem('token'));
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
    if (!_authToken) _authToken = token;
  }
  return config;
});

export const authApi = {
  register: (data: { email: string; password: string; alias: string }) =>
    api.post('/auth/register', data).then(r => r.data),
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data).then(r => r.data),
  forgotPassword: (email: string) =>
    api.post('/auth/forgot-password', { email }).then(r => r.data),
  resetPassword: (email: string, code: string, newPassword: string) =>
    api.post('/auth/reset-password', { email, code, newPassword }).then(r => r.data),
};

export const confessionsApi = {
  getFeed:      (page = 1) => api.get('/confessions/feed', { params: { page } }).then(r => r.data),
  getExplore:   (tag?: string, page = 1) => api.get('/confessions/explore', { params: { page, ...(tag ? { tag } : {}) } }).then(r => r.data),
  getTrending:  (page = 1) => api.get('/confessions/trending', { params: { page } }).then(r => r.data),
  getBookmarks: () => api.get('/confessions/bookmarks').then(r => r.data),
  getByUser:    (alias: string) => api.get(`/confessions/user/${alias}`).then(r => r.data),
  create: (data: {
    text?: string;
    audioUrl?: string;
    tags?: string[];
    expiresAt?: string;
    pollQuestion?: string;
    parentId?: string;
  }) => api.post('/confessions', data).then(r => r.data),
  getById: (id: string) => api.get(`/confessions/${id}`).then(r => r.data),
  getReplies: (id: string) => api.get(`/confessions/${id}/replies`).then(r => r.data as { parent: any; replies: any[] }),
  getTags: () => api.get('/confessions/tags').then(r => r.data as { tag: string; count: number }[]),
  uploadAudio: (uri: string) => {
    const form = new FormData();
    form.append('audio', { uri, type: 'audio/m4a', name: 'audio.m4a' } as any);
    return api.post('/confessions/upload-audio', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data as { url: string });
  },
  react:          (id: string, type: string) => api.post(`/confessions/${id}/react`, { type }).then(r => r.data),
  toggleBookmark: (id: string) => api.post(`/confessions/${id}/bookmark`).then(r => r.data),
  votePoll:       (id: string, vote: boolean) => api.post(`/confessions/${id}/poll-vote`, { vote }).then(r => r.data),
  getComments:    (id: string) => api.get(`/confessions/${id}/comments`).then(r => r.data),
  addComment:     (id: string, text: string) => api.post(`/confessions/${id}/comments`, { text }).then(r => r.data),
  report:         (id: string, reason: string) => api.post(`/confessions/${id}/report`, { reason }).then(r => r.data),
  delete:         (id: string) => api.delete(`/confessions/${id}`).then(r => r.data),
};

export const notificationsApi = {
  getAll:        () => api.get('/notifications').then(r => r.data as AppNotification[]),
  getUnreadCount: () => api.get('/notifications/unread-count').then(r => r.data as { count: number }),
  markAllRead:   () => api.patch('/notifications/read-all').then(r => r.data),
};

export type AppNotification = {
  id: string;
  type: string;
  message: string;
  read: boolean;
  createdAt: string;
  confessionId: string | null;
};

export const usersApi = {
  getProfile:      (alias: string) => api.get(`/users/${alias}`).then(r => r.data),
  updateBio:       (bio: string) => api.patch('/users/me/bio', { bio }).then(r => r.data),
  follow:          (alias: string) => api.post(`/users/${alias}/follow`).then(r => r.data),
  search:          (q: string) => api.get(`/users/search?q=${encodeURIComponent(q)}`).then(r => r.data),
  updatePushToken: (token: string) => api.patch('/users/me/push-token', { token }).then(r => r.data),
  updateAvatar:    (avatarBase64: string) => api.patch('/users/me/avatar', { avatarBase64 }).then(r => r.data),
};
