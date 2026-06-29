import api from './api';

export const getMessages = async (deckId) => {
    const res = await api.get(`/chat/${deckId}`);
    return res.data.data;
};
