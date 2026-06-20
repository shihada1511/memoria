const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authorize = require('../middleware/authorization');

router.get('/', authorize(['admin']), adminController.getAllAdmins);
router.get('/:id', authorize(['admin']), adminController.getAdminById);
router.post('/', authorize(['admin']), adminController.createAdmin);
router.put('/:id', authorize(['admin']), adminController.updateAdmin);
router.delete('/:id', authorize(['admin']), adminController.deleteAdmin);

module.exports = router;
