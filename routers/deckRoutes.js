const express = require('express');
const router = express.Router();
const deckController = require('../controllers/deckController');
const cardController = require('../controllers/cardController');
const authorize = require('../middleware/authorization');

router.get('/', authorize(['admin', 'manager', 'user']), deckController.getAllDecks);
router.get('/:id', deckController.getDeckById);
router.post('/', authorize(['admin', 'user']), deckController.createDeck);
router.put('/:id', authorize(['admin', 'user']), deckController.updateDeck);
router.delete('/:id', authorize(['admin', 'user']), deckController.deleteDeck);

router.get('/:deckId/cards', cardController.getCardsByDeck);
router.get('/:deckId/cards/:cardId', cardController.getCardById);
router.post('/:deckId/cards', authorize(['admin', 'user']), cardController.createCard);
router.put('/:deckId/cards/:cardId', authorize(['admin', 'user']), cardController.updateCard);
router.delete('/:deckId/cards/:cardId', authorize(['admin', 'user']), cardController.deleteCard);

module.exports = router;
