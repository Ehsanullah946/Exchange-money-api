const express = require('express');
const { protect } = require('../middlewares/authMiddlewares');
const { allowRoles } = require('../middlewares/roleMiddleware');
const orgScope = require('../middlewares/orgScope');
const accountToaccountController = require('../controllers/AccountToAccount');
const { AccountToAccount } = require('../models');

const router = express.Router();

router.get(
  '/',
  protect,
  allowRoles(2, 3, 4),
  orgScope(AccountToAccount),
  accountToaccountController.getTransferToAccount
);
router.post(
  '/',
  protect,
  allowRoles(2, 3),
  orgScope(AccountToAccount),
  accountToaccountController.createAccountToAccount
);
router.patch(
  '/:id',
  protect,
  allowRoles(2, 3),
  orgScope(AccountToAccount),
  accountToaccountController.updateAccountToAccount
);
router.delete(
  '/:id',
  protect,
  allowRoles(2, 3),
  orgScope(AccountToAccount),
  accountToaccountController.deleteAccountToAccount
);

module.exports = router;
