// services/multiWhatsAppService.js
const WhatsAppChannel = require('../channels/whatsappChannel');
const EventEmitter = require('events');
const path = require('path');
const fs = require('fs').promises;

class MultiWhatsAppService extends EventEmitter {
  constructor() {
    super();
    this.orgInstances = new Map();
    this.maxInstances = 10;
  }

  async initializeOrganization(orgId, phoneNumber) {
    if (this.orgInstances.size >= this.maxInstances) {
      throw new Error('Maximum WhatsApp instances reached');
    }

    if (this.orgInstances.has(orgId)) {
      await this.cleanupOrganization(orgId);
    }

    const sessionPath = path.join(
      __dirname,
      '../whatsapp_sessions',
      `org_${orgId}`
    );
    await this.ensureSessionDirectory(sessionPath);

    const client = new WhatsAppChannel(sessionPath);

    this.orgInstances.set(orgId, {
      client,
      sessionPath,
      phoneNumber,
      status: 'initializing',
      lastUsed: new Date(),
    });

    client.on('qr', (qr) => {
      this.emit('qr', { orgId, qr });
      console.log(`📱 QR for org ${orgId}:`);
      require('qrcode-terminal').generate(qr, { small: true });
    });

    client.on('ready', () => {
      this.orgInstances.get(orgId).status = 'ready';
      this.emit('ready', { orgId });
      console.log(`✅ WhatsApp ready for org ${orgId}`);
    });

    client.on('error', (error) => {
      this.emit('error', { orgId, error });
    });

    return { success: true, orgId, status: 'initializing' };
  }

  async sendMessage(orgId, toPhoneNumber, message) {
    const orgInstance = this.orgInstances.get(orgId);

    if (!orgInstance) {
      throw new Error(`WhatsApp not initialized for organization: ${orgId}`);
    }

    if (orgInstance.status !== 'ready') {
      return {
        success: false,
        error: 'WhatsApp not ready for this organization',
        orgId,
        queued: true,
      };
    }

    try {
      const result = await orgInstance.client.send(toPhoneNumber, message);
      orgInstance.lastUsed = new Date();

      return {
        success: true,
        orgId,
        ...result,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        orgId,
        queued: true,
      };
    }
  }

  async sendWithRetry(orgId, phone, message, retries = 3) {
    for (let attempt = 1; attempt <= retries; attempt++) {
      const result = await this.sendMessage(orgId, phone, message);

      if (result.success) return result;
      if (result.queued) return result;

      console.warn(`Attempt ${attempt} failed for org ${orgId}:`, result.error);

      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, 2000 * attempt));
      }
    }

    return {
      success: false,
      error: 'Failed after all retries',
      orgId,
      queued: true,
    };
  }

  async cleanupOrganization(orgId) {
    const orgInstance = this.orgInstances.get(orgId);
    if (orgInstance) {
      await orgInstance.client.cleanup();
      this.orgInstances.delete(orgId);
    }
  }

  async ensureSessionDirectory(sessionPath) {
    try {
      await fs.mkdir(sessionPath, { recursive: true });
    } catch (error) {
      console.error('Error creating session directory:', error);
    }
  }

  getOrganizationStatus(orgId) {
    const instance = this.orgInstances.get(orgId);
    return {
      orgId,
      status: instance?.status || 'not_initialized',
      ready: instance?.status === 'ready',
      lastUsed: instance?.lastUsed,
    };
  }

  async cleanupAll() {
    for (const [orgId] of this.orgInstances) {
      await this.cleanupOrganization(orgId);
    }
  }
}

module.exports = new MultiWhatsAppService();
