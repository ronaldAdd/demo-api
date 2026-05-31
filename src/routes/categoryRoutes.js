const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const authenticateToken = require('../middleware/auth');
const checkRole = require('../middleware/roleMiddleware');

router.get('/', authenticateToken, categoryController.getAllCategories);
router.get('/:id', authenticateToken, categoryController.getCategoryById);
router.post('/', authenticateToken, checkRole('admin'), categoryController.createCategory);
router.put('/:id', authenticateToken, checkRole('admin'), categoryController.updateCategory);
router.delete('/:id', authenticateToken, checkRole('admin'), categoryController.deleteCategory);

module.exports = router;