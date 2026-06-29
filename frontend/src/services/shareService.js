import api from './api';

export const searchDecks = async (q) => {
    const res = await api.get('/share/search', { params: { q } });
    return res.data.data;
};

export const requestAccess = async (deckId) => {
    const res = await api.post(`/share/request/${deckId}`);
    return res.data.data;
};

export const getIncomingRequests = async () => {
    const res = await api.get('/share/requests/incoming');
    return res.data.data;
};

export const respondToRequest = async (requestId, action) => {
    const res = await api.put(`/share/requests/${requestId}/respond`, { action });
    return res.data.data;
};

export const togglePublic = async (deckId) => {
    const res = await api.put(`/share/toggle-public/${deckId}`);
    return res.data.data;
};
