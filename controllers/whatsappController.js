// controllers/whatsappController.js
const multiWhatsApp = require('../services/multiWhatsAppService');

exports.initializeWhatsApp = async (req, res) => {
  try {
    const { orgId, phoneNumber } = req.body;

    const result = await multiWhatsApp.initializeOrganization(
      orgId,
      phoneNumber
    );

    res.json({
      success: true,
      message: 'WhatsApp initialization started. Scan QR code when ready.',
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

exports.sendMessage = async (req, res) => {
  try {
    const { orgId, phoneNumber, message } = req.body;

    const result = await multiWhatsApp.sendMessage(orgId, phoneNumber, message);

    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

exports.getStatus = async (req, res) => {
  try {
    const { orgId } = req.params;

    const status = multiWhatsApp.getOrganizationStatus(orgId);

    res.json({
      success: true,
      data: status,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};
