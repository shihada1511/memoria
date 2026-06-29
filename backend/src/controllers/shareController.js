const { Deck, User, DeckRequest, DeckAccess } = require('../../models');
const { Op } = require('sequelize');
const { getIO } = require('../socket/socketInstance');

const searchDecks = async (req, res) => {
    try {
        const requesterId = parseInt(req.header('x-user-id'));
        const q = (req.query.q || '').trim();
        if (!q) return res.status(200).json({ success: true, data: [], error: null });

        const decks = await Deck.findAll({
            where: {
                isPublic: true,
                userId: { [Op.ne]: requesterId },
                [Op.or]: [
                    { title: { [Op.like]: `%${q}%` } },
                    { subject: { [Op.like]: `%${q}%` } }
                ]
            },
            include: [{ model: User, as: 'owner', attributes: ['id', 'firstName', 'lastName', 'username'] }],
            order: [['title', 'ASC']]
        });

        const myRequests = await DeckRequest.findAll({
            where: { requesterId, deckId: decks.map(d => d.id) }
        });
        const requestMap = {};
        myRequests.forEach(r => { requestMap[r.deckId] = r.status; });

        const myAccess = await DeckAccess.findAll({
            where: { userId: requesterId, deckId: decks.map(d => d.id) }
        });
        const accessSet = new Set(myAccess.map(a => a.deckId));

        const result = decks.map(d => ({
            ...d.toJSON(),
            requestStatus: requestMap[d.id] || null,
            hasAccess: accessSet.has(d.id)
        }));

        res.status(200).json({ success: true, data: result, error: null });
    } catch (err) {
        console.error('[shareController.searchDecks]', err.message);
        res.status(500).json({ success: false, data: null, error: { code: 'SERVER_ERROR', message: 'An unexpected error occurred.', details: {} } });
    }
};

const requestAccess = async (req, res) => {
    try {
        const requesterId = parseInt(req.header('x-user-id'));
        const deckId = parseInt(req.params.deckId);

        const deck = await Deck.findByPk(deckId);
        if (!deck) return res.status(404).json({ success: false, data: null, error: { code: 'NOT_FOUND', message: 'Deck not found.', details: {} } });
        if (!deck.isPublic) return res.status(403).json({ success: false, data: null, error: { code: 'FORBIDDEN', message: 'This deck is not public.', details: {} } });
        if (deck.userId === requesterId) return res.status(400).json({ success: false, data: null, error: { code: 'BAD_REQUEST', message: 'You own this deck.', details: {} } });

        const existing = await DeckRequest.findOne({ where: { deckId, requesterId } });
        if (existing) return res.status(409).json({ success: false, data: null, error: { code: 'CONFLICT', message: 'Request already exists.', details: {} } });

        const alreadyHasAccess = await DeckAccess.findOne({ where: { deckId, userId: requesterId } });
        if (alreadyHasAccess) return res.status(409).json({ success: false, data: null, error: { code: 'CONFLICT', message: 'You already have access.', details: {} } });

        const requester = await User.findByPk(requesterId, { attributes: ['id', 'firstName', 'lastName', 'username'] });
        const request = await DeckRequest.create({ deckId, requesterId, status: 'pending' });

        const io = getIO();
        if (io) {
            io.to(`user-${deck.userId}`).emit('new-request', {
                request: { id: request.id, deckId: deck.id, requesterId, status: 'pending' },
                deck: { id: deck.id, title: deck.title },
                requester: { id: requester.id, username: requester.username, firstName: requester.firstName }
            });
        }

        res.status(201).json({ success: true, data: { request, deck, requester }, error: null });
    } catch (err) {
        console.error('[shareController.requestAccess]', err.message);
        res.status(500).json({ success: false, data: null, error: { code: 'SERVER_ERROR', message: 'An unexpected error occurred.', details: {} } });
    }
};

const getIncomingRequests = async (req, res) => {
    try {
        const userId = parseInt(req.header('x-user-id'));
        const requests = await DeckRequest.findAll({
            where: { status: 'pending' },
            include: [
                { model: Deck, as: 'deck', where: { userId }, attributes: ['id', 'title', 'subject'] },
                { model: User, as: 'requester', attributes: ['id', 'firstName', 'lastName', 'username'] }
            ],
            order: [['createdAt', 'DESC']]
        });
        res.status(200).json({ success: true, data: requests, error: null });
    } catch (err) {
        console.error('[shareController.getIncomingRequests]', err.message);
        res.status(500).json({ success: false, data: null, error: { code: 'SERVER_ERROR', message: 'An unexpected error occurred.', details: {} } });
    }
};

const respondToRequest = async (req, res) => {
    try {
        const userId = parseInt(req.header('x-user-id'));
        const requestId = parseInt(req.params.id);
        const { action } = req.body;

        const request = await DeckRequest.findByPk(requestId, {
            include: [{ model: Deck, as: 'deck' }]
        });

        if (!request) return res.status(404).json({ success: false, data: null, error: { code: 'NOT_FOUND', message: 'Request not found.', details: {} } });
        if (request.deck.userId !== userId) return res.status(403).json({ success: false, data: null, error: { code: 'FORBIDDEN', message: 'Not your deck.', details: {} } });
        if (request.status !== 'pending') return res.status(400).json({ success: false, data: null, error: { code: 'BAD_REQUEST', message: 'Request already resolved.', details: {} } });

        if (action === 'accept') {
            await request.update({ status: 'accepted' });
            await DeckAccess.create({ deckId: request.deckId, userId: request.requesterId });
        } else {
            await request.update({ status: 'rejected' });
        }

        const io = getIO();
        if (io) {
            io.to(`user-${request.requesterId}`).emit('request-response', {
                action,
                deckId: request.deckId,
                deckTitle: request.deck.title
            });
        }

        res.status(200).json({ success: true, data: { requestId, action, deckId: request.deckId, requesterId: request.requesterId }, error: null });
    } catch (err) {
        console.error('[shareController.respondToRequest]', err.message);
        res.status(500).json({ success: false, data: null, error: { code: 'SERVER_ERROR', message: 'An unexpected error occurred.', details: {} } });
    }
};

const togglePublic = async (req, res) => {
    try {
        const userId = parseInt(req.header('x-user-id'));
        const deckId = parseInt(req.params.deckId);
        const deck = await Deck.findByPk(deckId);
        if (!deck) return res.status(404).json({ success: false, data: null, error: { code: 'NOT_FOUND', message: 'Deck not found.', details: {} } });
        if (deck.userId !== userId) return res.status(403).json({ success: false, data: null, error: { code: 'FORBIDDEN', message: 'Not your deck.', details: {} } });
        await deck.update({ isPublic: !deck.isPublic });
        res.status(200).json({ success: true, data: { deckId, isPublic: deck.isPublic }, error: null });
    } catch (err) {
        console.error('[shareController.togglePublic]', err.message);
        res.status(500).json({ success: false, data: null, error: { code: 'SERVER_ERROR', message: 'An unexpected error occurred.', details: {} } });
    }
};

module.exports = { searchDecks, requestAccess, getIncomingRequests, respondToRequest, togglePublic };
