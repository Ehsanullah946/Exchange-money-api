const express = require('express');
const { protect } = require('../middlewares/authMiddlewares');
const { allowRoles } = require('../middlewares/roleMiddleware');
const orgScope = require('../middlewares/orgScope');
const accountToaccountController = require('../controllers/AccountToAccount');
const { AccountToAccount } = require('../models');

const router = express.Router();

// router.get(
//   '/',
//   protect,
//   allowRoles(2, 3, 4),
//   orgScope(AccountToAccount),
//   accountToaccountController.getAccountToAccounts
// );
// // router.get(
// //   '/:id',
// //   protect,
// //   allowRoles(2, 3, 4),
// //   orgScope(AccountToAccount),
// //   accountToaccountController.getAccountToAccounts
// // );

// router.post(
//   '/',
//   protect,
//   allowRoles(2, 3),
//   orgScope(AccountToAccount),
//   accountToaccountController.createAccountToAccount
// );
// router.put(
//   '/:no',
//   protect,
//   allowRoles(2, 3),
//   orgScope(AccountToAccount),
//   accountToaccountController.updateAccountToAccount
// );
// router.delete(
//   '/:no',
//   protect,
//   allowRoles(2, 3),
//   orgScope(AccountToAccount),
//   accountToaccountController.deleteAccountToAccount
// );

module.exports = router;
