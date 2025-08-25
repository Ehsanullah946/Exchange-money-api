
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const EventEmitter = require('events');

class WhatsAppChannel extends EventEmitter {
  constructor() {
    super();
    this.client = null;
    this.connected = false;
    this.connecting = false;
    this.qrCode = null;
    this.initialize();
  }

  async initialize() {
    if (this.connecting) return;

    this.connecting = true;
    console.log('🔄 Initializing WhatsApp client...');

    try {
      this.client = new Client({
        authStrategy: new LocalAuth({
          clientId: 'banking-app-whatsapp', // ✅ Session is saved automatically
        }),
        puppeteer: {
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu',
          ],
        },
        takeoverOnConflict: true,
        takeoverTimeoutMs: 60000,
      });

      this.setupEventHandlers();
      await this.client.initialize();
    } catch (error) {
      console.error('❌ WhatsApp initialization failed:', error.message);
      this.connecting = false;
      this.scheduleReconnect();
    }
  }

  setupEventHandlers() {
    this.client.on('qr', (qr) => {
      this.qrCode = qr;
      console.log('📱 WhatsApp QR Code (scan this once):');
      qrcode.generate(qr, { small: true });
      this.emit('qr', qr);
    });

    this.client.on('ready', () => {
      console.log('✅ WhatsApp client is ready and connected!');
      this.connected = true;
      this.connecting = false;
      this.emit('ready');
    });

    this.client.on('authenticated', () => {
      console.log('✅ WhatsApp authenticated successfully');
      this.connected = true;
      this.connecting = false;
    });

    this.client.on('auth_failure', (msg) => {
      console.error('❌ WhatsApp authentication failed:', msg);
      this.connected = false;
      this.connecting = false;
      this.scheduleReconnect();
    });

    this.client.on('disconnected', (reason) => {
      console.log('❌ WhatsApp disconnected:', reason);
      this.connected = false;
      this.cleanup();
      this.scheduleReconnect();
    });

    this.client.on('message', (msg) => {
      if (msg.fromMe) {
        console.log('📤 Outgoing message:', msg.body);
      }
    });
  }

  async send(phoneNumberOrChatId, message) {
    if (!this.connected) {
      console.log('⏳ WhatsApp not connected, attempting to reconnect...');
      await this.initialize();
      await new Promise((resolve) => setTimeout(resolve, 2000));
      if (!this.connected) {
        return {
          success: false,
          error: 'WhatsApp client not connected',
          channel: 'whatsapp',
          requiresReconnect: true,
        };
      }
    }

    try {
      let chatId;

      if (
        phoneNumberOrChatId.endsWith('@c.us') ||
        phoneNumberOrChatId.endsWith('@g.us')
      ) {
        // Already a valid chatId
        chatId = phoneNumberOrChatId;
      } else {
        // Format as a phone number (c.us)
        const formattedNumber = this.formatPhoneNumber(phoneNumberOrChatId);
        if (!formattedNumber) {
          return {
            success: false,
            error: 'Invalid phone number format',
            channel: 'whatsapp',
          };
        }
        chatId = `${formattedNumber}@c.us`;
      }

      console.log(`📤 Sending WhatsApp to: ${chatId}`);

      // ✅ Send directly (no getChatById needed)
      const result = await this.client.sendMessage(chatId, message);

      console.log('✅ WhatsApp message sent successfully');
      return {
        success: true,
        messageId: result.id.id,
        channel: 'whatsapp',
        timestamp: new Date(),
      };
    } catch (error) {
      console.error('❌ WhatsApp send error:', error.message);

      if (
        error.message.includes('not connected') ||
        error.message.includes('timeout')
      ) {
        this.connected = false;
        this.scheduleReconnect();
      }

      return {
        success: false,
        error: error.message,
        channel: 'whatsapp',
      };
    }
  }

  scheduleReconnect() {
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);

    this.reconnectTimeout = setTimeout(() => {
      console.log('🔄 Attempting WhatsApp reconnection...');
      this.initialize();
    }, 10000);
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
  }

  formatPhoneNumber(phone) {
    if (!phone) return null;

    let cleaned = phone.replace(/\D/g, '');

    if (cleaned.startsWith('0')) {
      cleaned = '93' + cleaned.substring(1);
    } else if (cleaned.startsWith('93')) {
      // Already correct
    } else if (cleaned.length === 9) {
      cleaned = '93' + cleaned;
    }

    if (cleaned.length !== 11 || !cleaned.startsWith('93')) {
      console.error('Invalid Afghan number:', phone, '->', cleaned);
      return null;
    }

    return cleaned;
  }

  getStatus() {
    return {
      connected: this.connected,
      connecting: this.connecting,
      hasQrCode: !!this.qrCode,
      qrCode: this.qrCode,
      timestamp: new Date(),
    };
  }

  async reconnect() {
    this.cleanup();
    await this.initialize();
  }
}

module.exports = WhatsAppChannel;
