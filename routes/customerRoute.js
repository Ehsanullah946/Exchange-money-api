const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddlewares');
const orgScope = require('../middlewares/orgScope');
const customerController = require('../controllers/customer');
const authController = require('../controllers/authController');
const customerAuth = require('../middlewares/customerAuth');
const { Customer } = require('../models');
const { allowRoles } = require('../middlewares/roleMiddleware');

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

<<<<<<< HEAD
=======
router.post('/auth/initiate', authController.initiateVerification);
router.post('/auth/verify', authController.verifyCode);

// Protected customer routes
router.get('/accounts', customerAuth, customerController.customerAccount);

>>>>>>> 65eaed8e20b47ede1eb60d55cba9a0cc126a8280
module.exports = router;
