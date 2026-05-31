const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const authenticateToken = require('../middleware/auth');

router.post('/create-invoice', authenticateToken, paymentController.createXenditInvoice);
router.post('/simulate-payment', authenticateToken, paymentController.simulatePayment);
router.get('/status/:transaction_id', authenticateToken, paymentController.checkPaymentStatus);
router.get('/invoice-url/:transaction_id', authenticateToken, paymentController.getInvoiceUrl);

module.exports = router;