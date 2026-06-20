/**
 * Socket.IO handler for Memoria real-time study sessions.
 *
 * Custom events (beyond connect/disconnect):
 *   join-session     – client joins a deck study session
 *   leave-session    – client leaves a deck study session
 *   card-flipped     – client flips a card (broadcasts progress to the room)
 *   session-complete – client finishes studying the deck
 */

// deckId → Set of { socketId, username }
const activeSessions = new Map();

module.exports = (io) => {
    io.on('connection', (socket) => {
        console.log(`[Socket] connected: ${socket.id}`);

        // ── join-session ─────────────────────────────────────────────────────
        socket.on('join-session', ({ deckId, deckTitle, username }) => {
            if (!deckId || !username) return;

            const roomKey = `deck-${deckId}`;
            socket.join(roomKey);

            if (!activeSessions.has(deckId)) {
                activeSessions.set(deckId, new Map());
            }
            activeSessions.get(deckId).set(socket.id, { username, deckTitle });

            const participants = [...activeSessions.get(deckId).values()];

            // Tell everyone in the room (including the joiner) about current participants
            io.to(roomKey).emit('session-update', {
                deckId,
                deckTitle,
                participants,
                event: 'joined',
                username
            });

            console.log(`[Socket] ${username} joined session for deck ${deckId}`);
        });

        // ── leave-session ─────────────────────────────────────────────────────
        socket.on('leave-session', ({ deckId }) => {
            _leaveSession(socket, io, deckId);
        });

        // ── card-flipped ──────────────────────────────────────────────────────
        socket.on('card-flipped', ({ deckId, cardIndex, totalCards, username }) => {
            if (!deckId) return;
            const roomKey = `deck-${deckId}`;

            io.to(roomKey).emit('card-progress', {
                socketId: socket.id,
                username,
                deckId,
                cardIndex,
                totalCards
            });
        });

        // ── session-complete ──────────────────────────────────────────────────
        socket.on('session-complete', ({ deckId, username }) => {
            if (!deckId) return;
            const roomKey = `deck-${deckId}`;

            io.to(roomKey).emit('session-finished', {
                socketId: socket.id,
                username,
                deckId
            });
        });

        // ── disconnect ────────────────────────────────────────────────────────
        socket.on('disconnect', () => {
            console.log(`[Socket] disconnected: ${socket.id}`);
            // Clean up from all sessions this socket was part of
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

    io.to(roomKey).emit('session-update', {
        deckId,
        participants,
        event: 'left',
        username: user.username
    });

    console.log(`[Socket] ${user.username} left session for deck ${deckId}`);
}
