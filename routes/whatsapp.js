// routes/whatsapp.js
const express = require('express');
const router = express.Router();
const WhatsAppService = require('../services/whatsappService');

// WhatsApp status with detailed info
// router.get('/status', (req, res) => {
//   res.json({
//     success: true,
//       ? 'Ready to send messages'

//       ? 'Scan QR code to connect'
//       : 'Initializing...',
//   });
// });

// Send message with retry
router.post('/send', async (req, res) => {
  const { phoneNumber, message } = req.body;

  if (!phoneNumber) {
    return res
      .status(400)
      .json({ success: false, error: 'Phone number required' });
  }

  try {
    const result = await WhatsAppService.sendWithRetry(
      phoneNumber,
      message || 'Test message'
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Force reconnection
router.post('/reconnect', async (req, res) => {
  try {
    await WhatsAppService.reconnect();
    res.json({ success: true, message: 'Reconnection initiated' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// // Get QR code for display
// router.get('/qr', (req, res) => {
//   const status = WhatsAppService.getStatus();
//   if (status.qrCode) {
//     res.json({ success: true, qrCode: status.qrCode });
//   } else {
//     res.json({ success: false, message: 'No QR code available' });
//   }
// });

module.exports = router;
