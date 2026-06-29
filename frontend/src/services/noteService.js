import api from './api';

export const getNotes = async () => {
    const res = await api.get('/notes');
    return res.data.data;
};

export const createNote = async (date, text) => {
    const res = await api.post('/notes', { date, text });
    return res.data.data;
};

export const deleteNote = async (id) => {
    const res = await api.delete(`/notes/${id}`);
    return res.data.data;
};
