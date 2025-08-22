const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

class WhatsAppChannel {
  constructor() {
    this.client = new Client({
      authStrategy: new LocalAuth(),
      puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      },
    });

    this.connected = false;
    this.initialize();
  }

  initialize() {
    this.client.on('qr', (qr) => {
      console.log('WhatsApp QR Code:');
      qrcode.generate(qr, { small: true });
    });

    this.client.on('ready', () => {
      console.log('WhatsApp client is ready!');
      this.connected = true;
    });

    this.client.on('disconnected', () => {
      console.log('WhatsApp client disconnected');
      this.connected = false;
    });

    this.client.initialize();
  }

  async send(phoneNumber, message) {
    if (!this.connected) {
      return {
        success: false,
        error: 'WhatsApp client not connected',
        channel: 'whatsapp',
      };
    }

    try {
      // Format number: remove + and any non-digit characters, add country code
      const formattedNumber = phoneNumber.replace(/\D/g, '');
      const chatId = `${formattedNumber}@c.us`;

      await this.client.sendMessage(chatId, message);
      return { success: true, channel: 'whatsapp' };
    } catch (error) {
      console.error('WhatsApp send error:', error.message);
      return { success: false, error: error.message, channel: 'whatsapp' };
    }
  }
}

module.exports = WhatsAppChannel;
