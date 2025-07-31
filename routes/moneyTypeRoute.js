const express = require('express');
const router = express.Router();

const { protect } = require('../middlewares/authMiddlewares');
const orgScope = require('../middlewares/orgScope');
const { allowRoles } = require('../middlewares/roleMiddleware');
const moneyTypeController = require('../controllers/moneyType');
const { MoneyType } = require('../models');

router.get('/', protect, allowRoles(2, 3, 4), orgScope(MoneyType), moneyTypeController.getMoneyTypes);
router.post('/', protect, allowRoles(2, 3), orgScope(MoneyType), moneyTypeController.createMoneyType);
router.patch('/:id', protect, allowRoles(2, 3), orgScope(MoneyType), moneyTypeController.updateMoneyType);
router.delete('/:id', protect, allowRoles(2, 3), orgScope(MoneyType), moneyTypeController.deleteMoneyType);

module.exports = router;
