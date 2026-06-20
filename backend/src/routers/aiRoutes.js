const express = require('express');
const router = express.Router();
const { generateCards } = require('../controllers/aiController');

// POST /api/ai/generate-cards
router.post('/generate-cards', generateCards);

module.exports = router;
