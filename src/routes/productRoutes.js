const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const authenticateToken = require('../middleware/auth');
const checkRole = require('../middleware/roleMiddleware');

router.get('/', authenticateToken, productController.getAllProducts);
router.get('/:id', authenticateToken, productController.getProductById);
router.post('/', authenticateToken, checkRole('admin'), productController.createProduct);
router.put('/:id', authenticateToken, checkRole('admin'), productController.updateProduct);
router.delete('/:id', authenticateToken, checkRole('admin'), productController.deleteProduct);

module.exports = router;