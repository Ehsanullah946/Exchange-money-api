const express = require('express');
const { protect } = require('../middlewares/authMiddlewares');
const orgScope = require('../middlewares/orgScope');
const transferController = require('../controllers/transfer');
const { Transfer } = require('../models');
const { allowRoles } = require('../middlewares/roleMiddleware');

const router = express.Router();

// router.get('/', protect, allowRoles(2, 3, 4), orgScope(Transfer), transferController.getTransfers);
router.post('/', protect, allowRoles(2, 3), orgScope(Transfer), transferController.createTransfer);
// router.patch('/:id', protect, allowRoles(2, 3), orgScope(Transfer), transferController.updateTransfer);
// router.delete('/:id', protect, allowRoles(2, 3), orgScope(Transfer), transferController.deleteTransfer);
// router.get('/:id', protect, allowRoles(2, 3), orgScope(Transfer), transferController.getTransferByid);

module.exports = router;
