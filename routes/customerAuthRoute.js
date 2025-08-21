const express = require('express');
const router = express.Router();
const controllCustomer = require('../controllers/controllCustomers');
const authController = require('../controllers/authController');
const customerAuth = require('../middlewares/customerAuth');

router.post('/initiate', authController.initiateVerification);
router.post('/verify', authController.verifyCode);

// Protected customer routes
router.get('/accounts', customerAuth, controllCustomer.customerAccount);

module.exports = router;
