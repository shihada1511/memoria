const express = require('express');
const router = express.Router();
const { logStudy, getStats } = require('../controllers/statsController');
const authorize = require('../middleware/authorization');

router.post('/log', authorize(['admin', 'manager', 'user']), logStudy);
router.get('/',    authorize(['admin', 'manager', 'user']), getStats);

module.exports = router;
