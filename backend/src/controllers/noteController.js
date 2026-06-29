const { CalendarNote } = require('../../models');

const getNotes = async (req, res) => {
    try {
        const userId = parseInt(req.header('x-user-id'));
        const notes = await CalendarNote.findAll({
            where: { userId },
            order: [['date', 'ASC']]
        });
        res.status(200).json({ success: true, data: notes, error: null });
    } catch {
        res.status(500).json({ success: false, data: null, error: { code: 'SERVER_ERROR', message: 'An unexpected error occurred.', details: {} } });
    }
};

const createNote = async (req, res) => {
    try {
        const userId = parseInt(req.header('x-user-id'));
        const { date, text } = req.body;

        if (!date || !text) {
            return res.status(400).json({ success: false, data: null, error: { code: 'VALIDATION_ERROR', message: 'date and text are required.', details: {} } });
        }

        const note = await CalendarNote.create({ userId, date, text: text.trim() });
        res.status(201).json({ success: true, data: note, error: null });
    } catch {
        res.status(500).json({ success: false, data: null, error: { code: 'SERVER_ERROR', message: 'An unexpected error occurred.', details: {} } });
    }
};

const deleteNote = async (req, res) => {
    try {
        const userId = parseInt(req.header('x-user-id'));
        const id = parseInt(req.params.id);

        const note = await CalendarNote.findByPk(id);
        if (!note) return res.status(404).json({ success: false, data: null, error: { code: 'NOT_FOUND', message: 'Note not found.', details: {} } });
        if (note.userId !== userId) return res.status(403).json({ success: false, data: null, error: { code: 'FORBIDDEN', message: 'You can only delete your own notes.', details: {} } });

        await note.destroy();
        res.status(200).json({ success: true, data: { id }, error: null });
    } catch {
        res.status(500).json({ success: false, data: null, error: { code: 'SERVER_ERROR', message: 'An unexpected error occurred.', details: {} } });
    }
};

module.exports = { getNotes, createNote, deleteNote };
