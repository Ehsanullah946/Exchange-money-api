// services/whatsappService.js
const WhatsAppChannel = require('../channels/whatsappChannel');

class WhatsAppService {
  constructor() {
    this.channel = new WhatsAppChannel();
    this.setupEventHandlers();
  }

  setupEventHandlers() {
    this.channel.on('qr', (qr) => {
      console.log('New QR code generated');
      // You can save this QR code to display in admin panel
    });

    this.channel.on('ready', () => {
      console.log('WhatsApp is ready for messages');
    });

    this.channel.on('error', (error) => {
      console.error('WhatsApp error:', error);
    });
  }

  async sendMessage(phoneNumber, message) {
    return await this.channel.send(phoneNumber, message);
  }

  getStatus() {
    return this.channel.getStatus();
  }

  async reconnect() {
    return await this.channel.reconnect();
  }

  // Queue system for when WhatsApp is disconnected
  async sendWithRetry(phoneNumber, message, maxRetries = 3) {
    let retries = 0;

    while (retries < maxRetries) {
      const result = await this.sendMessage(phoneNumber, message);

      if (result.success) {
        return result;
      }

      if (result.requiresReconnect) {
        await this.reconnect();
        await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait 5 seconds
      }

      retries++;
      console.log(`Retry ${retries}/${maxRetries} for WhatsApp message`);
    }

    return {
      success: false,
      error: `Failed after ${maxRetries} retries`,
      channel: 'whatsapp',
    };
  }
}

module.exports = new WhatsAppService();
