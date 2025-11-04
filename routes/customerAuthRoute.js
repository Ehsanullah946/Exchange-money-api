const express = require('express');
const router = express.Router();
const customerController = require('../controllers/controllCustomers');
const orgScope = require('../middlewares/orgScope');
const authController = require('../controllers/authController');
const customerAuth = require('../middlewares/customerAuth');

router.post('/initiate', authController.initiateVerification);
router.post('/verify', authController.verifyCode);

// Protected customer routes
router.get('/accounts', customerAuth, customerController.customerAccount);

module.exports = router;
