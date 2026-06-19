import api from './api';

const TOKEN_KEY = 'memoria_token';
const USER_KEY = 'memoria_user';

export const login = async (email, password) => {
  const response = await api.post('/auth/login', { email, password });
  const { token, user } = response.data.data;
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  return user;
};

export const logout = async () => {
  try {
    await api.post('/auth/logout');
  } finally {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }
};

export const getCurrentUser = async () => {
  const response = await api.get('/users/me');
  return response.data.data;
};

export const changePassword = async (currentPassword, newPassword) => {
  const response = await api.put('/users/me/password', { currentPassword, newPassword });
  return response.data.data;
};

export const getToken = () => localStorage.getItem(TOKEN_KEY);

export const isAuthenticated = () => Boolean(getToken());
