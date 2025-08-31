// const { Client, LocalAuth } = require('whatsapp-web.js');
// const qrcode = require('qrcode-terminal');
// const EventEmitter = require('events');

// class WhatsAppChannel extends EventEmitter {
//   constructor() {
//     super();
//     this.client = null;
//     this.connected = false;
//     this.connecting = false;
//     this.qrCode = null;
//     this.reconnectTimeout = null;
//     this.initialize();
//   }

//   async initialize() {
//     if (this.connecting) return;

//     this.connecting = true;

//     try {
//       this.client = new Client({
//         authStrategy: new LocalAuth({
//           clientId: 'banking-app-whatsapp',
//           dataPath: './whatsapp_sessions',
//         }),
//         puppeteer: {
//           headless: true,
//           args: [
//             '--no-sandbox',
//             '--disable-setuid-sandbox',
//             '--disable-dev-shm-usage',
//             '--disable-extensions',
//             '--disable-background-timer-throttling',
//             '--disable-backgrounding-occluded-windows',
//             '--disable-renderer-backgrounding',
//           ],
//         },
//         takeoverOnConflict: true,
//         takeoverTimeoutMs: 60000,
//       });

//       this.setupEventHandlers();
//       await this.client.initialize();
//     } catch (error) {
//       console.error('❌ WhatsApp initialization failed:', error.message);
//       this.connecting = false;
//       this.scheduleReconnect();
//     }
//   }

//   setupEventHandlers() {
//     this.client.on('qr', (qr) => {
//       this.qrCode = qr;
//       console.log('📱 WhatsApp QR Code (scan this once):');
//       qrcode.generate(qr, { small: true });
//       this.emit('qr', qr);
//     });

//     this.client.on('ready', () => {
//       console.log('✅ WhatsApp client is ready and connected!');
//       this.connected = true;
//       this.connecting = false;
//       this.emit('ready');
//     });

//     this.client.on('authenticated', () => {
//       console.log('✅ WhatsApp authenticated successfully');
//       this.connected = true;
//       this.connecting = false;
//     });

//     this.client.on('auth_failure', (msg) => {
//       console.error('❌ WhatsApp authentication failed:', msg);
//       this.connected = false;
//       this.connecting = false;
//       this.scheduleReconnect();
//     });

//     this.client.on('disconnected', (reason) => {
//       console.log('❌ WhatsApp disconnected:', reason);
//       this.connected = false;
//       this.cleanup();
//       this.scheduleReconnect();
//     });

//     this.client.on('message', (msg) => {
//       if (msg.fromMe) {
//         console.log('📤 Outgoing message:', msg.body);
//       }
//     });
//   }

//   async send(phoneNumberOrChatId, message) {
//     if (!this.connected) {
//       console.log('⏳ WhatsApp not connected, message queued for retry...');
//       this.scheduleReconnect();

//       return {
//         success: false,
//         error: 'WhatsApp not connected (queued)',
//         channel: 'whatsapp',
//         queued: true,
//       };
//     }

//     try {
//       let chatId;

//       if (!this.client.pupPage || !this.client.pupPage.isClosed()) {
//         console.log('🔄 WhatsApp page appears closed, reinitializing...');
//         await this.reconnect();
//         return this.handleDisconnectedState();
//       }

//       if (
//         phoneNumberOrChatId.endsWith('@c.us') ||
//         phoneNumberOrChatId.endsWith('@g.us')
//       ) {
//         chatId = phoneNumberOrChatId;
//       } else {
//         const formattedNumber = this.formatPhoneNumber(phoneNumberOrChatId);
//         if (!formattedNumber) {
//           return {
//             success: false,
//             error: 'Invalid phone number format',
//             channel: 'whatsapp',
//           };
//         }
//         chatId = `${formattedNumber}@c.us`;
//       }

//       console.log(`📤 Sending WhatsApp to: ${chatId}`);
//       const result = await this.client.sendMessage(chatId, message);

//       console.log('✅ WhatsApp message sent successfully');
//       return {
//         success: true,
//         messageId: result.id.id,
//         channel: 'whatsapp',
//         timestamp: new Date(),
//       };
//     } catch (error) {
//       console.error('❌ WhatsApp send error:', error.message);

//       if (
//         error.message.includes('getChat') ||
//         error.message.includes('undefined')
//       ) {
//         console.log('🔄 DOM-related error detected, reinitializing client...');
//         await this.reconnect();
//         return this.handleDisconnectedState();
//       }

//       if (
//         error.message.includes('not connected') ||
//         error.message.includes('timeout')
//       ) {
//         this.connected = false;
//         this.scheduleReconnect();
//       }

//       return {
//         success: false,
//         error: error.message,
//         channel: 'whatsapp',
//       };
//     }
//   }

//   handleDisconnectedState() {
//     console.log('⏳ WhatsApp not connected, message queued for retry...');
//     this.scheduleReconnect();
//     return {
//       success: false,
//       error: 'WhatsApp not connected (queued)',
//       channel: 'whatsapp',
//       queued: true,
//     };
//   }

//   scheduleReconnect() {
//     if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);

//     this.reconnectTimeout = setTimeout(() => {
//       console.log('🔄 Attempting WhatsApp reconnection...');
//       this.initialize();
//     }, 10000);
//   }

//   cleanup() {
//     if (this.client) {
//       try {
//         this.client.removeAllListeners();
//         this.client.destroy();
//       } catch (error) {
//         console.error('Error cleaning up WhatsApp client:', error);
//       }
//       this.client = null;
//     }
//   }

//   formatPhoneNumber(phone) {
//     if (!phone) return null;
//     let cleaned = phone.replace(/\D/g, '');

//     if (cleaned.startsWith('0')) {
//       cleaned = '93' + cleaned.substring(1);
//     } else if (cleaned.startsWith('93')) {
//       // ok
//     } else if (cleaned.length === 9) {
//       cleaned = '93' + cleaned;
//     }

//     if (cleaned.length !== 11 || !cleaned.startsWith('93')) {
//       console.error('Invalid Afghan number:', phone, '->', cleaned);
//       return null;
//     }

//     return cleaned;
//   }

//   getStatus() {
//     return {
//       connected: this.connected,
//       connecting: this.connecting,
//       hasQrCode: !!this.qrCode,
//       qrCode: this.qrCode,
//       timestamp: new Date(),
//     };
//   }

//   async reconnect() {
//     this.cleanup();
//     await this.initialize();
//   }
// }

// module.exports = WhatsAppChannel;

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const EventEmitter = require('events');
const fs = require('fs').promises;
const path = require('path');

class WhatsAppChannel extends EventEmitter {
  constructor() {
    super();
    this.client = null;
    this.connected = false;
    this.connecting = false;
    this.qrCode = null;
    this.reconnectTimeout = null;
    this.sessionPath = './whatsapp_sessions/banking-app-whatsapp';
    this.initialize();
  }

  async initialize() {
    if (this.connecting) return;
    this.connecting = true;

    console.log('🔄 Initializing WhatsApp client...');

    // Clean up any existing client first
    this.cleanup();

    try {
      this.client = new Client({
        authStrategy: new LocalAuth({
          clientId: 'banking-app-whatsapp',
          dataPath: './whatsapp_sessions',
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
            '--disable-renderer-backgrounding',
            '--single-process',
          ],
        },
        takeoverOnConflict: false, // Changed to false
        takeoverTimeoutMs: 30000,
      });

      this.setupEventHandlers();
      await this.client.initialize();
    } catch (error) {
      console.error('❌ WhatsApp initialization failed:', error.message);
      this.connecting = false;
      this.connected = false;
      this.scheduleReconnect(5000); // Shorter delay for initial failure
    }
  }

  setupEventHandlers() {
    if (!this.client) return;

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
      this.emit('authenticated');
    });

    this.client.on('auth_failure', (msg) => {
      console.error('❌ WhatsApp authentication failed:', msg);
      this.connected = false;
      this.connecting = false;
      this.cleanupSession(); // Clear corrupted session
      this.scheduleReconnect(10000);
    });

    this.client.on('disconnected', (reason) => {
      console.log('❌ WhatsApp disconnected:', reason);
      this.connected = false;
      this.cleanup();
      this.cleanupSession(); // Clear session on disconnect
      this.scheduleReconnect(15000);
    });

    this.client.on('message', (msg) => {
      if (msg.fromMe) {
        console.log('📤 Outgoing message:', msg.body);
      }
    });

    // Handle page errors
    this.client.on('page_error', (error) => {
      console.error('❌ WhatsApp page error:', error.message);
      if (
        error.message.includes('getChat') ||
        error.message.includes('undefined')
      ) {
        this.handleDomError();
      }
    });
  }

  async send(phoneNumberOrChatId, message) {
    // Check if client exists and is properly initialized
    if (!this.client || !this.connected) {
      return this.handleDisconnectedState();
    }

    try {
      // Additional health check
      if (!(await this.isPageHealthy())) {
        console.log('⚠️ WhatsApp page unhealthy, reinitializing...');
        await this.handleDomError();
        return this.handleDisconnectedState();
      }

      let chatId;
      if (
        phoneNumberOrChatId.endsWith('@c.us') ||
        phoneNumberOrChatId.endsWith('@g.us')
      ) {
        chatId = phoneNumberOrChatId;
      } else {
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

      return this.handleSendError(error);
    }
  }

  async isPageHealthy() {
    try {
      if (
        !this.client ||
        !this.client.pupPage ||
        this.client.pupPage.isClosed()
      ) {
        return false;
      }

      // Try a simple DOM check to verify the page is functional
      await this.client.pupPage.evaluate(() => {
        return (
          typeof window !== 'undefined' && typeof window.WWebJS !== 'undefined'
        );
      });

      return true;
    } catch (error) {
      console.log('❌ Page health check failed:', error.message);
      return false;
    }
  }

  handleSendError(error) {
    // Handle specific DOM errors
    if (
      error.message.includes('getChat') ||
      error.message.includes('undefined') ||
      error.message.includes('null') ||
      error.message.includes('Evaluation failed')
    ) {
      console.log('🔄 DOM/Page error detected, handling...');
      this.handleDomError();
    } else if (
      error.message.includes('not connected') ||
      error.message.includes('timeout')
    ) {
      this.connected = false;
      this.scheduleReconnect(10000);
    }

    return {
      success: false,
      error: error.message,
      channel: 'whatsapp',
      queued: true,
    };
  }

  async handleDomError() {
    console.log('🔄 Handling DOM error - full reinitialization...');
    this.connected = false;
    this.cleanup();
    await this.cleanupSession();
    await this.initialize();
  }

  handleDisconnectedState() {
    console.log('⏳ WhatsApp not connected, message queued for retry...');
    this.scheduleReconnect(5000);
    return {
      success: false,
      error: 'WhatsApp not connected (queued)',
      channel: 'whatsapp',
      queued: true,
    };
  }

  scheduleReconnect(delay = 15000) {
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    this.reconnectTimeout = setTimeout(() => {
      console.log('🔄 Attempting WhatsApp reconnection...');
      this.initialize();
    }, delay);
  }

  cleanup() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

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

  async cleanupSession() {
    try {
      if (fs.existsSync) {
        if (fs.existsSync(this.sessionPath)) {
          await fs.rm(this.sessionPath, { recursive: true, force: true });
          console.log('🗑️ Cleared WhatsApp session data');
        }
        // Also clear cache
        const cachePath = path.join(process.cwd(), '.wwebjs_cache');
        if (fs.existsSync(cachePath)) {
          await fs.rm(cachePath, { recursive: true, force: true });
          console.log('🗑️ Cleared WhatsApp cache');
        }
      }
    } catch (error) {
      console.log('⚠️ Could not clear session data:', error.message);
    }
  }

  async reconnect() {
    console.log('🔄 Manual reconnection initiated...');
    await this.cleanupSession();
    this.cleanup();
    await this.initialize();
  }

  formatPhoneNumber(phone) {
    if (!phone) return null;
    let cleaned = phone.replace(/\D/g, '');

    if (cleaned.startsWith('0')) {
      cleaned = '93' + cleaned.substring(1);
    } else if (cleaned.startsWith('93')) {
      // ok
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
      clientExists: !!this.client,
      timestamp: new Date(),
    };
  }
}

module.exports = WhatsAppChannel;
