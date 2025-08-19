const express = require('express');
const { protect } = require('../middlewares/authMiddlewares');
const orgScope = require('../middlewares/orgScope');
const customerController = require('../controllers/customer');
const { Customer } = require('../models');
const { allowRoles } = require('../middlewares/roleMiddleware');

const router = express.Router();

router.get(
  '/',
  protect,
  allowRoles(2, 3, 4),
  orgScope(Customer),
  customerController.getCustomers
);
router.get(
  '/:customerId/account',
  protect,
  allowRoles(2, 3, 4),
  orgScope(Customer),
  customerController.getCustomerAccounts
);
router.post(
  '/',
  protect,
  allowRoles(2, 3),
  orgScope(Customer),
  customerController.createCustomer
);
router.patch(
  '/:id',
  protect,
  allowRoles(2, 3),
  orgScope(Customer),
  customerController.updateCustomer
);
router.delete(
  '/:id',
  protect,
  allowRoles(2, 3),
  orgScope(Customer),
  customerController.deleteCustomer
);
router.get(
  '/:id',
  protect,
  allowRoles(2, 3),
  orgScope(Customer),
  customerController.getCustomerById
);

router.post('/auth/initiate', customerController.initiateVerification);
router.post('/auth/verify', customerController.verifyCode);

// Protected customer routes
router.get('/accounts', customerAuth, customerController.customerAccount);

module.exports = router;
