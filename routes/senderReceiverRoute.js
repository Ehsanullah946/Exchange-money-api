const express = require('express');
const { protect } = require('../middlewares/authMiddlewares');
const orgScope = require('../middlewares/orgScope');
const senderReceiverController = require('../controllers/senderReceiver');
const { SenderReceiver } = require('../models');
const { allowRoles } = require('../middlewares/roleMiddleware');

const router = express.Router();

router.get('/', protect, allowRoles(2, 3, 4), orgScope(SenderReceiver), senderReceiverController.getSenderReceivers);
router.post('/', protect, allowRoles(2, 3), orgScope(SenderReceiver), senderReceiverController.createSenderReceiver);
router.patch('/:id', protect, allowRoles(2, 3), orgScope(SenderReceiver), senderReceiverController.updateSenderReceiver);
router.delete('/:id', protect, allowRoles(2, 3), orgScope(SenderReceiver), senderReceiverController.deleteSenderReceiver);
router.get('/:id', protect, allowRoles(2, 3), orgScope(SenderReceiver), senderReceiverController.getSenderReceiverByid);

module.exports = router;
