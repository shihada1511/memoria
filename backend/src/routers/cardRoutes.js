const express = require('express');
const router = express.Router();
const cardController = require('../controllers/cardController');
const authorize = require('../middleware/authorization');

router.get('/', authorize(['admin']), cardController.getAllCards);

module.exports = router;