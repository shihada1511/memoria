import api from './api';

export const logStudy = async (deckId, cardId, correct) => {
  await api.post('/stats/log', { deckId, cardId, correct });
};

export const getStats = async () => {
  const response = await api.get('/stats');
  return response.data.data;
};

export const getDashboardStats = async () => {
  const response = await api.get('/stats/dashboard');
  return response.data.data;
};
