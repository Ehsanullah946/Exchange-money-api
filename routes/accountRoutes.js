const express = require('express');
const { protect } = require('../middlewares/authMiddlewares');
const { allowRoles } = require('../middlewares/roleMiddleware');
const orgScope = require('../middlewares/orgScope');
const { Account } = require('../models');
const accountController = require('../controllers/branch');

const router = express.Router();

router.get('/', protect, allowRoles(2, 3, 4), orgScope(Account), accountController.getAccounts);
router.get('/:id', protect, allowRoles(2, 3, 4), orgScope(Account), accountController.getAccountById);
router.post('/', protect, allowRoles(2, 3), orgScope(Account), accountController.createAccount);
router.patch('/:id', protect, allowRoles(2, 3), orgScope(Account), accountController.updateAccount);
router.delete('/:id', protect, allowRoles(2, 3), orgScope(Account), accountController.deleteAccount);

module.exports = router;