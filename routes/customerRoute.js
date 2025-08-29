const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddlewares');
const orgScope = require('../middlewares/orgScope');
const customerController = require('../controllers/customer');
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

module.exports = router;
