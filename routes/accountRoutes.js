const express = require('express');
const { protect } = require('../middlewares/authMiddlewares');
const { allowRoles } = require('../middlewares/roleMiddleware');
const orgScope = require('../middlewares/orgScope');
const accountController = require('../controllers/account');
const { Account } = require('../models');

const router = express.Router();

router.get(
  '/',
  protect,
  allowRoles(2, 3, 4),
  orgScope(Account),
  accountController.getAccounts
);
router.get(
  '/:id',
  protect,
  allowRoles(2, 3, 4),
  orgScope(Account),
  accountController.getAccountById
);
router.get(
  '/:id/transactions',
  protect,
  allowRoles(2, 3, 4),
  orgScope(Account),
  accountController.getAccountTransactions
);

router.get(
  '/:id/accountSummary',
  protect,
  allowRoles(2, 3, 4),
  orgScope(Account),
  accountController.getAccountSummary
);

router.post(
  '/',
  protect,
  allowRoles(2, 3),
  orgScope(Account),
  accountController.createAccount
);
router.patch(
  '/:id',
  protect,
  allowRoles(2, 3),
  orgScope(Account),
  accountController.updateAccount
);
router.delete(
  '/:id',
  protect,
  allowRoles(2, 3),
  orgScope(Account),
  accountController.deleteAccount
);

module.exports = router;
