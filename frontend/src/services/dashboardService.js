import api from './api';

export const getDecks = async () => {
  const response = await api.get('/decks');
  return response.data.data;
};

export const getCardsByDeck = async (deckId) => {
  const response = await api.get(`/decks/${deckId}/cards`);
  return response.data.data;
};

export const createDeck = async (userId, title, subject) => {
  const response = await api.post('/decks', { userId, title, subject });
  return response.data.data;
};

export const createCard = async (deckId, question, answer) => {
  const response = await api.post(`/decks/${deckId}/cards`, { question, answer });
  return response.data.data;
};

export const updateDeck = async (deckId, title, subject) => {
  const response = await api.put(`/decks/${deckId}`, { title, subject });
  return response.data.data;
};

export const deleteDeck = async (deckId) => {
  const response = await api.delete(`/decks/${deckId}`);
  return response.data.data;
};

export const deleteCard = async (deckId, cardId) => {
  const response = await api.delete(`/decks/${deckId}/cards/${cardId}`);
  return response.data.data;
};

export const evaluateAnswer = async (userAnswer, correctAnswer) => {
  const response = await api.post('/ai/evaluate-answer', { userAnswer, correctAnswer });
  return response.data.data;
};
