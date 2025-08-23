// channels/whatsappChannel.js
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

class WhatsAppChannel {
  constructor() {
    this.client = null;
    this.connected = false;
    this.initialize();
  }

  async initialize() {
    try {
      this.client = new Client({
        authStrategy: new LocalAuth({
          clientId: 'banking-app',
        }),
        puppeteer: {
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox'],
        },
      });

      this.client.on('qr', (qr) => {
        console.log('📱 WhatsApp QR Code:');
        qrcode.generate(qr, { small: true });
        // You can also save this QR code to a file or display it in admin panel
      });

      this.client.on('ready', () => {
        console.log('✅ WhatsApp client is ready!');
        this.connected = true;
      });

      this.client.on('disconnected', (reason) => {
        console.log('❌ WhatsApp client disconnected:', reason);
        this.connected = false;
        // Attempt to reconnect after 5 seconds
        setTimeout(() => this.initialize(), 5000);
      });

      this.client.on('auth_failure', (error) => {
        console.error('❌ WhatsApp auth failure:', error);
        this.connected = false;
      });

      await this.client.initialize();
    } catch (error) {
      console.error('❌ WhatsApp initialization error:', error.message);
      this.connected = false;
    }
  }

  async send(phoneNumber, message) {
    if (!this.connected) {
      console.log('⏳ WhatsApp not connected, queuing message...');
      return {
        success: false,
        error: 'WhatsApp client not connected',
        channel: 'whatsapp',
      };
    }

    try {
      // Clean and format phone number
      const formattedNumber = this.formatPhoneNumber(phoneNumber);
      if (!formattedNumber) {
        return {
          success: false,
          error: 'Invalid phone number',
          channel: 'whatsapp',
        };
      }

      const chatId = `${formattedNumber}@c.us`;
      console.log(`📤 Sending WhatsApp to: ${chatId}`);

      const result = await this.client.sendMessage(chatId, message);

      console.log('✅ WhatsApp sent successfully:', result.id.id);
      return { success: true, messageId: result.id.id, channel: 'whatsapp' };
    } catch (error) {
      console.error('❌ WhatsApp send error:', error.message);
      return { success: false, error: error.message, channel: 'whatsapp' };
    }
  }

  formatPhoneNumber(phone) {
    if (!phone) return null;

    // Remove any non-digit characters
    let cleaned = phone.replace(/\D/g, '');

    // Handle Afghan number formats
    if (cleaned.startsWith('0')) {
      cleaned = '93' + cleaned.substring(1); // 0790123456 → 93790123456
    } else if (cleaned.startsWith('93')) {
      // Already in correct format
    } else if (cleaned.length === 9) {
      cleaned = '93' + cleaned; // 790123456 → 93790123456
    }

    // Validate Afghan number format
    if (cleaned.length !== 11 || !cleaned.startsWith('93')) {
      console.error('Invalid Afghan phone number:', phone, '->', cleaned);
      return null;
    }

    return cleaned;
  }

  // Check connection status
  getStatus() {
    return {
      connected: this.connected,
      ready: this.connected,
    };
  }
}

module.exports = WhatsAppChannel;
