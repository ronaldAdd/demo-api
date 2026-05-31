const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');
const authenticateToken = require('../middleware/auth');
const checkRole = require('../middleware/roleMiddleware');

router.post('/', authenticateToken, transactionController.createTransaction);
router.post('/xendit', authenticateToken, transactionController.createXenditTransaction);
router.get('/', authenticateToken, checkRole('admin'), transactionController.getAllTransactions);
router.get('/my-transactions', authenticateToken, transactionController.getUserTransactions);
router.get('/:id', authenticateToken, transactionController.getTransactionById);
router.get('/:id/invoice', authenticateToken, transactionController.printInvoice);
router.get('/:id/invoice/json', authenticateToken, transactionController.getInvoiceJson);

module.exports = router;