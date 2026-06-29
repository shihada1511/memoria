const express = require('express');
const router = express.Router();
const shareController = require('../controllers/shareController');
const authorize = require('../middleware/authorization');

router.get('/search', authorize(['admin', 'manager', 'user']), shareController.searchDecks);
router.post('/request/:deckId', authorize(['admin', 'manager', 'user']), shareController.requestAccess);
router.get('/requests/incoming', authorize(['admin', 'manager', 'user']), shareController.getIncomingRequests);
router.put('/requests/:id/respond', authorize(['admin', 'manager', 'user']), shareController.respondToRequest);
router.put('/toggle-public/:deckId', authorize(['admin', 'manager', 'user']), shareController.togglePublic);

module.exports = router;
