const express = require('express');
const router = express.Router();
const { logStudy, getStats, getDashboardStats } = require('../controllers/statsController');
const authorize = require('../middleware/authorization');

router.post('/log',       authorize(['admin', 'manager', 'user']), logStudy);
router.get('/',           authorize(['admin', 'manager', 'user']), getStats);
router.get('/dashboard',  authorize(['admin', 'manager', 'user']), getDashboardStats);

module.exports = router;
