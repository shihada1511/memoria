import api from './api';

export const getAllUsers = async () => {
  const response = await api.get('/users');
  return response.data.data;
};

export const updateUserRole = async (userId, firstName, lastName, userRole) => {
  const response = await api.put(`/users/${userId}`, { firstName, lastName, userRole });
  return response.data.data;
};

export const deleteUserAccount = async (userId) => {
  const response = await api.delete(`/users/${userId}`);
  return response.data.data;
};
