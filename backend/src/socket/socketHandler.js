const { DeckMessage } = require('../../models');

const activeSessions = new Map();

module.exports = (io) => {
    io.on('connection', (socket) => {
        console.log(`[Socket] connected: ${socket.id}`);

        socket.on('identify', ({ userId }) => {
            if (!userId) return;
            socket.userId = userId;
            socket.join(`user-${userId}`);
        });

        socket.on('join-session', ({ deckId, deckTitle, username }) => {
            if (!deckId || !username) return;
            const roomKey = `deck-${deckId}`;
            socket.join(roomKey);
            if (!activeSessions.has(deckId)) activeSessions.set(deckId, new Map());
            activeSessions.get(deckId).set(socket.id, { username, deckTitle });
            const participants = [...activeSessions.get(deckId).values()];
            io.to(roomKey).emit('session-update', { deckId, deckTitle, participants, event: 'joined', username });
            console.log(`[Socket] ${username} joined session for deck ${deckId}`);
        });

        socket.on('leave-session', ({ deckId }) => {
            _leaveSession(socket, io, deckId);
        });

        socket.on('card-flipped', ({ deckId, cardIndex, totalCards, username }) => {
            if (!deckId) return;
            io.to(`deck-${deckId}`).emit('card-progress', { socketId: socket.id, username, deckId, cardIndex, totalCards });
        });

        socket.on('session-complete', ({ deckId, username }) => {
            if (!deckId) return;
            io.to(`deck-${deckId}`).emit('session-finished', { socketId: socket.id, username, deckId });
        });

        socket.on('join-chat', ({ deckId }) => {
            if (!deckId) return;
            socket.join(`chat-${deckId}`);
        });

        socket.on('leave-chat', ({ deckId }) => {
            if (!deckId) return;
            socket.leave(`chat-${deckId}`);
        });

        socket.on('send-message', async ({ deckId, message, userId, username }) => {
            if (!deckId || !message || !userId) return;
            try {
                const saved = await DeckMessage.create({ deckId, userId, message: message.trim() });
                io.to(`chat-${deckId}`).emit('new-message', {
                    id: saved.id,
                    deckId,
                    userId,
                    username,
                    message: message.trim(),
                    createdAt: saved.createdAt
                });
            } catch (err) {
                console.error('[Socket] send-message error:', err.message);
            }
        });

        socket.on('disconnect', () => {
            console.log(`[Socket] disconnected: ${socket.id}`);
            for (const [deckId] of activeSessions) {
                _leaveSession(socket, io, deckId);
            }
        });
    });
};

function _leaveSession(socket, io, deckId) {
    if (!deckId || !activeSessions.has(deckId)) return;
    const session = activeSessions.get(deckId);
    const user = session.get(socket.id);
    if (!user) return;
    session.delete(socket.id);
    if (session.size === 0) activeSessions.delete(deckId);
    const roomKey = `deck-${deckId}`;
    socket.leave(roomKey);
    const participants = session.size > 0 ? [...session.values()] : [];
    io.to(roomKey).emit('session-update', { deckId, participants, event: 'left', username: user.username });
    console.log(`[Socket] ${user.username} left session for deck ${deckId}`);
}
