const express = require('express');
const router = express.Router();
const noteController = require('../controllers/noteController');
const authorize = require('../middleware/authorization');

router.get('/', authorize(['admin', 'manager', 'user']), noteController.getNotes);
router.post('/', authorize(['admin', 'manager', 'user']), noteController.createNote);
router.delete('/:id', authorize(['admin', 'manager', 'user']), noteController.deleteNote);

module.exports = router;
