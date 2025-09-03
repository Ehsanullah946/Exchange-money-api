// routes/whatsapp.js
const express = require('express');
const router = express.Router();
const {
  initializeWhatsApp,
  sendMessage,
  getStatus,
} = require('../controllers/whatsappController');

router.post('/initialize', initializeWhatsApp);
router.post('/send', sendMessage);
router.get('/status/:orgId', getStatus);

module.exports = router;
