const express = require('express');
const router = express.Router();
const { generateCards, evaluateAnswer } = require('../controllers/aiController');

router.post('/generate-cards', generateCards);
router.post('/evaluate-answer', evaluateAnswer);

module.exports = router;
