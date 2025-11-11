const express = require('express');
const router = express.Router();
const customerController = require('../controllers/controllCustomers');
const authController = require('../controllers/authController');
const customerAuth = require('../middlewares/customerAuth');

router.post('/initiate', authController.initiateVerification);
router.post('/verify', authController.verifyCode);

// Protected customer routes
router.get('/accounts', customerAuth, customerController.getCustomerAccounts);

router.get(
  '/transactions',
  customerAuth,
  customerController.getCustomerTransactions
);

module.exports = router;
