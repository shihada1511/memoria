let {decks} = require('../models/mockData');

const getAllDecks = async (req, res) => {
    try {
        res.status(200).json({
            success: true,
            data: decks,
            error: null
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            data: null,
            error: {code: "SERVER_ERROR", message: "An unexpected error occurred.", details: {}}
        });
    }
};

const getDeckById = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const requesterId = parseInt(req.header('x-user-id'));
        const requesterRole = req.header('x-user-role');

        const deck = decks.find(d => d.deckId === id);

        if (!deck) {
            return res.status(404).json({
                success: false,
                data: null,
                error: {code: "NOT_FOUND", message: `Deck with ID ${id} not found.`, details: {}}
            });
        }

        if (requesterRole !== 'admin' && deck.userId !== requesterId) {
            return res.status(403).json({
                success: false,
                data: null,
                error: {code: "FORBIDDEN", message: "You do not have access to this deck.", details: {}}
            });
        }

        res.status(200).json({success: true, data: deck, error: null});
    } catch (error) {
        res.status(500).json({
            success: false,
            data: null,
            error: {code: "SERVER_ERROR", message: "An unexpected error occurred.", details: {}}
        });
    }
};

const createDeck = async (req, res) => {
    try {
        const {userId, title, subject} = req.body;

        if (!userId || !title || !subject) {
            return res.status(400).json({
                success: false,
                data: null,
                error: {
                    code: "VALIDATION_ERROR",
                    message: "Missing required fields.",
                    details: {required: ["userId", "title", "subject"]}
                }
            });
        }

        const newDeck = {
            deckId: decks.length > 0 ? Math.max(...decks.map(d => d.deckId)) + 1 : 1,
            userId,
            title,
            subject,
            createdAt: new Date().toISOString()
        };

        decks.push(newDeck);
        res.status(201).json({success: true, data: {deckId: newDeck.deckId}, error: null});
    } catch (error) {
        res.status(500).json({
            success: false,
            data: null,
            error: {code: "SERVER_ERROR", message: "An unexpected error occurred.", details: {}}
        });
    }
};

const updateDeck = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const requesterId = parseInt(req.header('x-user-id'));
        const requesterRole = req.header('x-user-role');

        const deckIndex = decks.findIndex(d => d.deckId === id);

        if (deckIndex === -1) {
            return res.status(404).json({
                success: false,
                data: null,
                error: {code: "NOT_FOUND", message: `Deck with ID ${id} not found.`, details: {}}
            });
        }

        if (requesterRole !== 'admin' && decks[deckIndex].userId !== requesterId) {
            return res.status(403).json({
                success: false,
                data: null,
                error: {code: "FORBIDDEN", message: "You can only update your own decks.", details: {}}
            });
        }

        const {title, subject} = req.body;

        if (!title || !subject) {
            return res.status(400).json({
                success: false,
                data: null,
                error: {code: "VALIDATION_ERROR", message: "Missing required fields.", details: {}}
            });
        }

        decks[deckIndex] = {...decks[deckIndex], title, subject};
        res.status(200).json({success: true, data: {deckId: id}, error: null});
    } catch (error) {
        res.status(500).json({
            success: false,
            data: null,
            error: {code: "SERVER_ERROR", message: "An unexpected error occurred.", details: {}}
        });
    }
};

const deleteDeck = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const requesterId = parseInt(req.header('x-user-id'));
        const requesterRole = req.header('x-user-role');

        const deckIndex = decks.findIndex(d => d.deckId === id);

        if (deckIndex === -1) {
            return res.status(404).json({
                success: false,
                data: null,
                error: {code: "NOT_FOUND", message: `Deck with ID ${id} not found.`, details: {}}
            });
        }

        if (requesterRole !== 'admin' && decks[deckIndex].userId !== requesterId) {
            return res.status(403).json({
                success: false,
                data: null,
                error: {code: "FORBIDDEN", message: "You can only delete your own decks.", details: {}}
            });
        }

        decks.splice(deckIndex, 1);
        res.status(200).json({success: true, data: {deckId: id}, error: null});
    } catch (error) {
        res.status(500).json({
            success: false,
            data: null,
            error: {code: "SERVER_ERROR", message: "An unexpected error occurred.", details: {}}
        });
    }
};

module.exports = {getAllDecks, getDeckById, createDeck, updateDeck, deleteDeck};