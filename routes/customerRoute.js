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

router.post(
  '/:id/liquidate',
  protect,
  allowRoles(2, 3),
  orgScope(Customer),
  customerController.liquidateCustomer
);

router.delete(
  '/:id/deleteLiquidation',
  protect,
  allowRoles(2, 3),
  orgScope(Customer),
  customerController.deleteLiquidation
);

router.get(
  '/:id/liquidations',
  protect,
  allowRoles(2, 3),
  orgScope(Customer),
  customerController.getCustomerLiquidations
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

router.get(
  '/:id/transactions',
  protect,
  allowRoles(2, 3),
  orgScope(Customer),
  customerController.getCustomerTransactions
);

module.exports = router;
