// channels/whatsappChannel.js
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const EventEmitter = require('events');

class WhatsAppChannel extends EventEmitter {
  constructor(sessionPath) {
    super();
    this.client = null;
    this.connected = false;
    this.connecting = false;
    this.qrCode = null;
    this.sessionPath = sessionPath;
    this.initialize();
  }

  async initialize() {
    if (this.connecting) return;
    this.connecting = true;

    this.cleanup();

    try {
      this.client = new Client({
        authStrategy: new LocalAuth({
          clientId: `org_${Date.now()}`, // Unique client ID
          dataPath: this.sessionPath,
        }),
        puppeteer: {
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-extensions',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
          ],
        },
        takeoverOnConflict: false,
      });

      this.setupEventHandlers();
      await this.client.initialize();
    } catch (error) {
      console.error('❌ WhatsApp initialization failed:', error.message);
      this.connecting = false;
      this.connected = false;
    }
  }

  setupEventHandlers() {
    if (!this.client) return;

    this.client.on('qr', (qr) => {
      this.qrCode = qr;
      this.emit('qr', qr);
    });

    this.client.on('ready', () => {
      this.connected = true;
      this.connecting = false;
      this.emit('ready');
    });

    this.client.on('authenticated', () => {
      this.connected = true;
      this.connecting = false;
      this.emit('authenticated');
    });

    this.client.on('auth_failure', (msg) => {
      this.connected = false;
      this.connecting = false;
      this.emit('error', new Error(`Auth failed: ${msg}`));
    });

    this.client.on('disconnected', (reason) => {
      this.connected = false;
      this.emit('error', new Error(`Disconnected: ${reason}`));
    });
  }

  async send(phoneNumber, message) {
    if (!this.connected) {
      throw new Error('WhatsApp not connected');
    }

    try {
      const formattedNumber = this.formatPhoneNumber(phoneNumber);
      const chatId = `${formattedNumber}@c.us`;

      const result = await this.client.sendMessage(chatId, message);

      return {
        success: true,
        messageId: result.id.id,
        timestamp: new Date(),
      };
    } catch (error) {
      throw new Error(`Send failed: ${error.message}`);
    }
  }

  formatPhoneNumber(phone) {
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('0')) cleaned = '93' + cleaned.substring(1);
    if (cleaned.length === 9) cleaned = '93' + cleaned;
    return cleaned;
  }

  cleanup() {
    if (this.client) {
      try {
        this.client.removeAllListeners();
        this.client.destroy();
      } catch (error) {
        console.error('Error cleaning up WhatsApp client:', error);
      }
      this.client = null;
    }
    this.connected = false;
    this.connecting = false;
  }
}

module.exports = WhatsAppChannel;
