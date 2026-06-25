const express = require('express');
const router = express.Router();
const deckController = require('../controllers/deckController');
const cardController = require('../controllers/cardController');
const authorize = require('../middleware/authorization');

router.get('/', authorize(['admin', 'manager', 'user']), deckController.getAllDecks);
router.get('/:id', deckController.getDeckById);
router.post('/', authorize(['admin', 'manager', 'user']), deckController.createDeck);
router.put('/:id', authorize(['admin', 'manager', 'user']), deckController.updateDeck);
router.delete('/:id', authorize(['admin', 'manager', 'user']), deckController.deleteDeck);

router.get('/:deckId/cards', cardController.getCardsByDeck);
router.get('/:deckId/cards/:cardId', cardController.getCardById);
router.post('/:deckId/cards', authorize(['admin', 'manager', 'user']), cardController.createCard);
router.put('/:deckId/cards/:cardId', authorize(['admin', 'manager', 'user']), cardController.updateCard);
router.delete('/:deckId/cards/:cardId', authorize(['admin', 'manager', 'user']), cardController.deleteCard);

router.post('/:id/tags', authorize(['admin', 'manager', 'user']), deckController.addTagToDeck);
router.delete('/:id/tags/:tagId', authorize(['admin', 'manager', 'user']), deckController.removeTagFromDeck);

module.exports = router;
