const { DeckMessage, DeckAccess, Deck, User } = require('../../models');

const getMessages = async (req, res) => {
    try {
        const userId = parseInt(req.header('x-user-id'));
        const deckId = parseInt(req.params.deckId);

        const deck = await Deck.findByPk(deckId);
        if (!deck) return res.status(404).json({ success: false, data: null, error: { code: 'NOT_FOUND', message: 'Deck not found.', details: {} } });

        const isOwner = deck.userId === userId;
        const hasAccess = await DeckAccess.findOne({ where: { deckId, userId } });
        if (!isOwner && !hasAccess) return res.status(403).json({ success: false, data: null, error: { code: 'FORBIDDEN', message: 'No access to this deck.', details: {} } });

        const messages = await DeckMessage.findAll({
            where: { deckId },
            include: [{ model: User, as: 'sender', attributes: ['id', 'username', 'firstName', 'lastName'] }],
            order: [['createdAt', 'ASC']],
            limit: 100
        });

        res.status(200).json({ success: true, data: messages, error: null });
    } catch (err) {
        console.error('[chatController.getMessages]', err.message);
        res.status(500).json({ success: false, data: null, error: { code: 'SERVER_ERROR', message: 'An unexpected error occurred.', details: {} } });
    }
};

module.exports = { getMessages };
