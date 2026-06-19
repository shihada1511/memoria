const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authorize = require('../middleware/authorization');

router.get('/me', userController.getMe);
router.put('/me/password', userController.changePassword);
router.get('/', authorize(['admin', 'manager']), userController.getAllUsers);
router.get('/:id', authorize(['admin', 'manager']), userController.getUserById);
router.post('/', userController.createUser);
router.put('/:id', authorize(['admin', 'manager', 'user']), userController.updateUser);
router.delete('/:id', authorize(['admin', 'manager']), userController.deleteUser);

module.exports = router;
