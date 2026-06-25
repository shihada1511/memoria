const { Deck, User, Card, Tag } = require('../../models');

const DECK_INCLUDE = [
    { model: User, as: 'owner', attributes: ['id', 'firstName', 'lastName', 'email'] },
    { model: Tag, as: 'tags', attributes: ['id', 'name'], through: { attributes: [] } }
];

const getAllDecks = async (req, res) => {
    try {
        const requesterId = parseInt(req.header('x-user-id'));
        const requesterRole = req.header('x-user-role');

        const where = requesterRole === 'admin' ? {} : { userId: requesterId };

        const decks = await Deck.findAll({ where, include: DECK_INCLUDE, order: [['id', 'ASC']] });
        res.status(200).json({ success: true, data: decks, error: null });
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

        const deck = await Deck.findByPk(id, {
            include: [
                ...DECK_INCLUDE,
                { model: Card, as: 'cards' }
            ]
        });

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

        const owner = await User.findByPk(userId);
        if (!owner) {
            return res.status(404).json({
                success: false,
                data: null,
                error: {code: "NOT_FOUND", message: `User with ID ${userId} not found.`, details: {}}
            });
        }

        const newDeck = await Deck.create({ userId, title, subject });
        res.status(201).json({success: true, data: {deckId: newDeck.id}, error: null});
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

        const deck = await Deck.findByPk(id);

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

        await deck.update({ title, subject });
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

        const deck = await Deck.findByPk(id);

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
                error: {code: "FORBIDDEN", message: "You can only delete your own decks.", details: {}}
            });
        }

        await deck.destroy();
        res.status(200).json({success: true, data: {deckId: id}, error: null});
    } catch (error) {
        res.status(500).json({
            success: false,
            data: null,
            error: {code: "SERVER_ERROR", message: "An unexpected error occurred.", details: {}}
        });
    }
};

const addTagToDeck = async (req, res) => {
    try {
        const deckId = parseInt(req.params.id);
        const { tagName } = req.body;

        if (!tagName) {
            return res.status(400).json({
                success: false,
                data: null,
                error: {code: "VALIDATION_ERROR", message: "tagName is required.", details: {}}
            });
        }

        const deck = await Deck.findByPk(deckId);
        if (!deck) {
            return res.status(404).json({
                success: false,
                data: null,
                error: {code: "NOT_FOUND", message: `Deck with ID ${deckId} not found.`, details: {}}
            });
        }

        const [tag] = await Tag.findOrCreate({ where: { name: tagName.trim().toLowerCase() } });
        await deck.addTag(tag);

        const updatedDeck = await Deck.findByPk(deckId, { include: DECK_INCLUDE });
        res.status(200).json({success: true, data: updatedDeck, error: null});
    } catch (error) {
        res.status(500).json({
            success: false,
            data: null,
            error: {code: "SERVER_ERROR", message: "An unexpected error occurred.", details: {}}
        });
    }
};

const removeTagFromDeck = async (req, res) => {
    try {
        const deckId = parseInt(req.params.id);
        const tagId = parseInt(req.params.tagId);

        const deck = await Deck.findByPk(deckId);
        if (!deck) {
            return res.status(404).json({
                success: false,
                data: null,
                error: {code: "NOT_FOUND", message: `Deck with ID ${deckId} not found.`, details: {}}
            });
        }

        const tag = await Tag.findByPk(tagId);
        if (!tag) {
            return res.status(404).json({
                success: false,
                data: null,
                error: {code: "NOT_FOUND", message: `Tag with ID ${tagId} not found.`, details: {}}
            });
        }

        await deck.removeTag(tag);
        res.status(200).json({success: true, data: {deckId, tagId}, error: null});
    } catch (error) {
        res.status(500).json({
            success: false,
            data: null,
            error: {code: "SERVER_ERROR", message: "An unexpected error occurred.", details: {}}
        });
    }
};

module.exports = {getAllDecks, getDeckById, createDeck, updateDeck, deleteDeck, addTagToDeck, removeTagFromDeck};
