const WhatsAppService = require('../services/whatsappService');

class WhatsAppMonitor {
  constructor() {
    this.checkInterval = 300000; // Check every 30 seconds
    this.startMonitoring();
  }

  startMonitoring() {
    setInterval(() => {
      this.checkConnection();
    }, this.checkInterval);
  }

  async checkConnection() {
    const status = WhatsAppService.getStatus();

    if (!status.connected && !status.connecting) {
      // console.log('🔄 WhatsApp disconnected, attempting auto-reconnect...');
      await WhatsAppService.reconnect();
    }
  }
}

// Start monitor if this file is run directly
if (require.main === module) {
  new WhatsAppMonitor();
  console.log('WhatsApp connection monitor started');
}

module.exports = WhatsAppMonitor;
