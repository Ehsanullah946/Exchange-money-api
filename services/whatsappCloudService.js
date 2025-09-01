// services/whatsappCloudService.js
const axios = require('axios');

class WhatsAppCloudService {
  constructor() {
    this.baseURL = 'https://graph.facebook.com/v18.0';
    this.accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  }

  async sendMessage(phoneNumber, message) {
    try {
      // Format phone number (remove + and any non-digit characters)
      const formattedPhone = phoneNumber.replace(/\D/g, '');

      const response = await axios.post(
        `${this.baseURL}/${this.phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: formattedPhone,
          type: 'text',
          text: {
            preview_url: false,
            body: message,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }
      );

      return {
        success: true,
        messageId: response.data.messages[0].id,
        timestamp: new Date(),
      };
    } catch (error) {
      console.error(
        '❌ WhatsApp Cloud API error:',
        error.response?.data || error.message
      );
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message,
        queued: false,
      };
    }
  }

  // Add template message support (for approved templates)
  async sendTemplateMessage(phoneNumber, templateName, parameters = []) {
    try {
      const formattedPhone = phoneNumber.replace(/\D/g, '');

      const response = await axios.post(
        `${this.baseURL}/${this.phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: formattedPhone,
          type: 'template',
          template: {
            name: templateName,
            language: { code: 'en' },
            components:
              parameters.length > 0
                ? [
                    {
                      type: 'body',
                      parameters: parameters.map((param) => ({
                        type: 'text',
                        text: param,
                      })),
                    },
                  ]
                : undefined,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return {
        success: true,
        messageId: response.data.messages[0].id,
      };
    } catch (error) {
      console.error('❌ WhatsApp Template error:', error.response?.data);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message,
      };
    }
  }
}

module.exports = new WhatsAppCloudService();
