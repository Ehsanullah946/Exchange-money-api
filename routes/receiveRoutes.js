const express = require('express');
const { protect } = require('../middlewares/authMiddlewares');
const orgScope = require('../middlewares/orgScope');
const receiveController = require('../controllers/receive');
const { Receive } = require('../models');
const { allowRoles } = require('../middlewares/roleMiddleware');

const router = express.Router();

// router.get('/', protect, allowRoles(2, 3, 4), orgScope(Receive), receiveController.getReceives);
router.post('/', protect, allowRoles(2, 3), orgScope(Receive), receiveController.createReceive);
router.patch('/:id', protect, allowRoles(2, 3), orgScope(Receive), receiveController.updateReceive);
// router.delete('/:id', protect, allowRoles(2, 3), orgScope(Receive), receiveController.deleteReceive);
// router.patch('/:id/reject', protect, allowRoles(2, 3), orgScope(Receive), receiveController.rejectReceive);
// router.get('/:id', protect, allowRoles(2, 3), orgScope(Receive), receiveController.getReceiveByid);

module.exports = router;