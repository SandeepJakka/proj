import axios from 'axios';

const BASE = 'http://127.0.0.1:8000/api';

const api = axios.create({ baseURL: BASE });

// Attach access token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// On 401: attempt refresh, then redirect to login
api.interceptors.response.use(
  res => res,
  async (err) => {
    const original = err.config;
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const refresh = localStorage.getItem('refresh_token');
        if (refresh) {
          const res = await axios.post(`${BASE}/auth/refresh`, { refresh_token: refresh });
          const newToken = res.data.access_token;
          localStorage.setItem('access_token', newToken);
          original.headers.Authorization = `Bearer ${newToken}`;
          return api(original);
        }
      } catch (_) { }
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ── Auth ──────────────────────────────────────────────────────────────────────
export const registerUser = (email, password, fullName) =>
  api.post('/auth/register', { email, password, full_name: fullName });

export const verifyOTP = (email, otp) =>
  api.post('/auth/verify-email', { email, otp });

export const resendOTP = (email) =>
  api.post('/auth/resend-otp', { email });

export const loginUser = (email, password) => {
  const form = new URLSearchParams();
  form.append('username', email);
  form.append('password', password);
  return api.post('/auth/login', form, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });
};

export const forgotPassword = (email) =>
  api.post('/auth/forgot-password', { email });

export const resetPassword = (email, otp, new_password) =>
  api.post('/auth/reset-password', { email, otp, new_password });

export const logoutUser = () => api.post('/auth/logout');

// ── User ──────────────────────────────────────────────────────────────────────
export const getCurrentUser = () => api.get('/users/me');

// ── Chat ──────────────────────────────────────────────────────────────────────
export const guestChat = (messages, language = 'english') =>
  api.post('/chat/guest', { messages, language });

export const sendMessage = (message, language = 'english', sessionId = null) =>
  api.post('/chat/', { message, language, session_id: sessionId });

export const getChatHistory = (sessionId) =>
  api.get('/chat/history', { params: sessionId ? { session_id: sessionId } : {} });

export const clearChatHistory = () => api.delete('/chat/history');

export const getChatSessions = () => api.get('/chat/sessions');

export const deleteChatSession = (sessionId) =>
  api.delete(`/chat/sessions/${sessionId}`);

// ── Reports ───────────────────────────────────────────────────────────────────
export const analyzeGuestReport = (file, language = 'english') => {
  const form = new FormData();
  form.append('file', file);
  form.append('language', language);
  return api.post('/reports/analyze/guest', form);
};

export const analyzeReport = (file, language = 'english') => {
  const form = new FormData();
  form.append('file', file);
  form.append('language', language);
  return api.post('/reports/analyze', form);
};

export const getReportHistory = () => api.get('/reports/');
export const explainReport = (reportId) => api.post(`/reports/${reportId}/explain`);
export const getTrends = () => api.get('/reports/analytics/trends');
export const deleteReport = (reportId) => api.delete(`/reports/${reportId}`);

// ── Existing (kept for backward compat) ──────────────────────────────────────
export const getProfile = () => api.get('/profile/');
export const updateProfile = (data) => api.put('/profile/', data);
export const uploadReport = (formData) => api.post('/reports/upload', formData);
export const getReports = () => api.get('/reports/');
export const getLabValues = (reportId) => api.get(`/reports/${reportId}/lab-values`);
export const getDietPlan = (goal) => api.post('/lifestyle/diet', { goal });
export const getWorkoutPlan = (goal) => api.post('/lifestyle/workout', { goal });
export const startDietConsultation = (goal) => api.post('/lifestyle/diet/consult', { goal });
export const startWorkoutConsultation = (goal) => api.post('/lifestyle/workout/consult', { goal });

// ── Reminders ────────────────────────────────────────────────────────────────────────
export const getReminders = () => api.get('/reminders/');
export const createReminder = (data) => api.post('/reminders/', data);
export const updateReminder = (id, data) => api.put(`/reminders/${id}`, data);
export const deleteReminder = (id) => api.delete(`/reminders/${id}`);

// ── Report comparison ────────────────────────────────────────────────────────────────────────
export const compareReports = (reportId1, reportId2, language) => {
  const form = new FormData();
  form.append('report_id_1', reportId1);
  form.append('report_id_2', reportId2);
  form.append('language', language);
  return api.post('/reports/compare', form);
};

export const getReportsByType = (reportType) =>
  api.get(`/reports/same-type/${reportType}`);

export const getReportDownloadUrl = (reportId) =>
  api.get(`/reports/${reportId}/download`);

// ── Profile sharing ────────────────────────────────────────────────────────────────────────
export const getProfileSharing = () => api.get('/profile/sharing');
export const updateProfileSharing = (data) => api.put('/profile/sharing', data);
export const getPublicProfile = (username) => 
  axios.get(`${BASE}/profile/public/${username}`);

// ── Health plans ────────────────────────────────────────────────────────────────────────
export const getHealthPlans = () => api.get('/lifestyle/plans');
export const saveHealthPlan = (data) => api.post('/lifestyle/plans/save', data);
export const getCurrentPlans = () => api.get('/lifestyle/plans/current');

export default api;
