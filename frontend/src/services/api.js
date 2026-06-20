import axios from 'axios';

export const API_BASE_URL = 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('memoria_token');
  const userJson = localStorage.getItem('memoria_user');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (userJson) {
    const user = JSON.parse(userJson);
    config.headers['x-user-id'] = user.userId;
    config.headers['x-user-role'] = user.userRole;
  }

  return config;
});

export default api;
