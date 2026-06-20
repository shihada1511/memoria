import api from './api';

export const getDecks = async () => {
  const response = await api.get('/decks');
  return response.data.data;
};

export const getCardsByDeck = async (deckId) => {
  const response = await api.get(`/decks/${deckId}/cards`);
  return response.data.data;
};
