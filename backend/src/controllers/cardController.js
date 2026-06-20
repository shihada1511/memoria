const { Card, Deck } = require('../../models');

const getCardsByDeck = async (req, res) => {
    try {
        const deckId = parseInt(req.params.deckId);

        const deckExists = await Deck.findByPk(deckId);
        if (!deckExists) {
            return res.status(404).json({
                success: false,
                data: null,
                error: { code: "NOT_FOUND", message: `Deck with ID ${deckId} not found.`, details: {} }
            });
        }

        const deckCards = await Card.findAll({ where: { deckId }, order: [['id', 'ASC']] });
        res.status(200).json({ success: true, data: deckCards, error: null });
    } catch (error) {
        res.status(500).json({ success: false, data: null, error: { code: "SERVER_ERROR", message: "An unexpected error occurred.", details: {} } });
    }
};

const getCardById = async (req, res) => {
    try {
        const deckId = parseInt(req.params.deckId);
        const cardId = parseInt(req.params.cardId);

        const deckExists = await Deck.findByPk(deckId);
        if (!deckExists) {
            return res.status(404).json({
                success: false,
                data: null,
                error: { code: "NOT_FOUND", message: `Deck with ID ${deckId} not found.`, details: {} }
            });
        }

        const card = await Card.findOne({ where: { id: cardId, deckId } });
        if (!card) {
            return res.status(404).json({
                success: false,
                data: null,
                error: { code: "NOT_FOUND", message: `Card with ID ${cardId} not found in deck ${deckId}.`, details: {} }
            });
        }

        res.status(200).json({ success: true, data: card, error: null });
    } catch (error) {
        res.status(500).json({ success: false, data: null, error: { code: "SERVER_ERROR", message: "An unexpected error occurred.", details: {} } });
    }
};

const createCard = async (req, res) => {
    try {
        const deckId = parseInt(req.params.deckId);
        const { question, answer } = req.body;

        const deckExists = await Deck.findByPk(deckId);
        if (!deckExists) {
            return res.status(404).json({
                success: false,
                data: null,
                error: { code: "NOT_FOUND", message: `Deck with ID ${deckId} not found.`, details: {} }
            });
        }

        if (!question || !answer) {
            return res.status(400).json({
                success: false,
                data: null,
                error: {
                    code: "VALIDATION_ERROR",
                    message: "Missing required fields.",
                    details: { required: ["question", "answer"] }
                }
            });
        }

        const newCard = await Card.create({ deckId, question, answer });
        res.status(201).json({ success: true, data: newCard, error: null });
    } catch (error) {
        res.status(500).json({ success: false, data: null, error: { code: "SERVER_ERROR", message: "An unexpected error occurred.", details: {} } });
    }
};

const updateCard = async (req, res) => {
    try {
        const deckId = parseInt(req.params.deckId);
        const cardId = parseInt(req.params.cardId);
        const requesterId = parseInt(req.header('x-user-id'));
        const requesterRole = req.header('x-user-role');

        const deck = await Deck.findByPk(deckId);
        if (!deck) {
            return res.status(404).json({
                success: false,
                data: null,
                error: { code: "NOT_FOUND", message: `Deck with ID ${deckId} not found.`, details: {} }
            });
        }

        if (requesterRole !== 'admin' && deck.userId !== requesterId) {
            return res.status(403).json({
                success: false,
                data: null,
                error: { code: "FORBIDDEN", message: "You can only update cards in your own decks.", details: {} }
            });
        }

        const card = await Card.findOne({ where: { id: cardId, deckId } });
        if (!card) {
            return res.status(404).json({
                success: false,
                data: null,
                error: { code: "NOT_FOUND", message: `Card with ID ${cardId} not found in deck ${deckId}.`, details: {} }
            });
        }

        const { question, answer } = req.body;

        if (!question || !answer) {
            return res.status(400).json({
                success: false,
                data: null,
                error: {
                    code: "VALIDATION_ERROR",
                    message: "Missing required fields.",
                    details: { required: ["question", "answer"] }
                }
            });
        }

        await card.update({ question, answer });
        res.status(200).json({ success: true, data: { cardId }, error: null });
    } catch (error) {
        res.status(500).json({ success: false, data: null, error: { code: "SERVER_ERROR", message: "An unexpected error occurred.", details: {} } });
    }
};

const deleteCard = async (req, res) => {
    try {
        const deckId = parseInt(req.params.deckId);
        const cardId = parseInt(req.params.cardId);
        const requesterId = parseInt(req.header('x-user-id'));
        const requesterRole = req.header('x-user-role');

        const deck = await Deck.findByPk(deckId);
        if (!deck) {
            return res.status(404).json({
                success: false,
                data: null,
                error: { code: "NOT_FOUND", message: `Deck with ID ${deckId} not found.`, details: {} }
            });
        }

        if (requesterRole !== 'admin' && deck.userId !== requesterId) {
            return res.status(403).json({
                success: false,
                data: null,
                error: { code: "FORBIDDEN", message: "You can only delete cards in your own decks.", details: {} }
            });
        }

        const card = await Card.findOne({ where: { id: cardId, deckId } });
        if (!card) {
            return res.status(404).json({
                success: false,
                data: null,
                error: { code: "NOT_FOUND", message: `Card with ID ${cardId} not found in deck ${deckId}.`, details: {} }
            });
        }

        await card.destroy();
        res.status(200).json({ success: true, data: { cardId }, error: null });
    } catch (error) {
        res.status(500).json({ success: false, data: null, error: { code: "SERVER_ERROR", message: "An unexpected error occurred.", details: {} } });
    }
};

const getAllCards = async (req, res) => {
    try {
        const cards = await Card.findAll({ include: [{ model: Deck, as: 'deck' }] });
        res.status(200).json({ success: true, data: cards, error: null });
    } catch (error) {
        res.status(500).json({ success: false, data: null, error: { code: "SERVER_ERROR", message: "An unexpected error occurred.", details: {} } });
    }
};

module.exports = { getAllCards, getCardsByDeck, getCardById, createCard, updateCard, deleteCard };
