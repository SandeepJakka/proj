import axios from 'axios';

const API_BASE_URL = 'http://127.0.0.1:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const getProfile = () => api.get('/profile/');
export const updateProfile = (data) => api.put('/profile/', data);
export const uploadReport = (formData) => api.post('/reports/upload', formData);
export const explainReport = (reportId) => api.post(`/reports/${reportId}/explain`);
export const getReports = () => api.get('/reports/');
export const getLabValues = (reportId) => api.get(`/reports/${reportId}/lab-values`);
export const getTrends = () => api.get('/reports/analytics/trends');
export const sendMessage = (message, sessionId) => api.post('/chat/', { message, session_id: sessionId });
export const getChatSessions = () => api.get('/chat/sessions');
export const getDietPlan = (goal) => api.post('/lifestyle/diet', { goal });
export const getWorkoutPlan = (goal) => api.post('/lifestyle/workout', { goal });
export const startDietConsultation = (goal) => api.post('/lifestyle/diet/consult', { goal });
export const startWorkoutConsultation = (goal) => api.post('/lifestyle/workout/consult', { goal });

export default api;
