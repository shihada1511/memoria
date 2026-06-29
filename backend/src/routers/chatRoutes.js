const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const authorize = require('../middleware/authorization');

router.get('/:deckId', authorize(['admin', 'manager', 'user']), chatController.getMessages);

module.exports = router;
