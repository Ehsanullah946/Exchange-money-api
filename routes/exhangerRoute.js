const express = require('express');
const { protect } = require('../middlewares/authMiddlewares');

const orgScope = require('../middlewares/orgScope');
const exchangerController = require('../controllers/exchanger');
const { Exchanger } = require('../models');
const { allowRoles } = require('../middlewares/roleMiddleware');

const router = express.Router();

router.get('/', protect, allowRoles(2, 3, 4), orgScope(Exchanger), exchangerController.getExchangers);
router.post('/', protect, allowRoles(2, 3), orgScope(Exchanger), exchangerController.createExchanger);
router.patch('/:id', protect, allowRoles(2, 3), orgScope(Exchanger), exchangerController.updateExchanger);
router.delete('/:id', protect, allowRoles(2, 3), orgScope(Exchanger), exchangerController.deleteExchanger);
router.get('/:id', protect, allowRoles(2, 3), orgScope(Exchanger), exchangerController.getExchangerById);

module.exports = router;