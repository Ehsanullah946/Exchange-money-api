// services/notificationService.js
const TelegramChannel = require('../channels/telegramChannel');
const WhatsAppService = require('./whatsappService'); // has sendWithRetry
const WebSocketChannel = require('../channels/websocketChannel');
const {
  Notification,
  Customer,
  Branch,
  Stakeholder,
  Person,
} = require('../models');

class NotificationService {
  constructor() {
    this.channels = {
      telegram: new TelegramChannel(),
      whatsapp: WhatsAppService,
      websocket: new WebSocketChannel(),
    };
    this.initialized = false;
  }

  setWebSocketIO(io) {
    this.channels.websocket.setIO(io);
    this.initialized = true;
    console.log('✅ Notification service initialized with WebSocket');
  }

  /**
   * Send a notification with optional channel control.
   *
   * @param {"branch"|"customer"} recipientType
   * @param {number} recipientId
   * @param {object} notificationData  // { type, data, ... }
   * @param {object} options
   * @param {string[]} [options.channels]   // e.g. ["whatsapp","telegram","websocket"]
   * @param {boolean}  [options.includeWebsocket=true]
   * @param {boolean}  [options.failSoft=true]  // never throw if a channel fails
   * @param {boolean}  [options.save=true]      // save to Notification table
   */
  async sendNotification(
    recipientType,
    recipientId,
    notificationData,
    options = {}
  ) {
    const {
      channels: requestedChannels,
      includeWebsocket = true,
      failSoft = true,
      save = true,
    } = options;

    let recipient;
    let customerData;

    if (!this.initialized) {
      console.warn(
        '⚠️ Notification service not fully initialized (websocket may be skipped)'
      );
    }

    if (recipientType === 'branch') {
      const branch = await Branch.findByPk(recipientId, {
        include: [
          {
            model: Customer,
            include: [{ model: Stakeholder, include: [Person] }],
          },
        ],
      });
      if (!branch || !branch.Customer) {
        if (failSoft)
          return this._resultForFail(
            'Recipient not found',
            [],
            recipientType,
            recipientId
          );
        throw new Error('Branch or associated customer not found');
      }
      recipient = branch;
      customerData = branch.Customer;
    } else {
      const customer = await Customer.findByPk(recipientId, {
        include: [{ model: Stakeholder, include: [Person] }],
      });
      if (!customer) {
        if (failSoft)
          return this._resultForFail(
            'Recipient not found',
            [],
            recipientType,
            recipientId
          );
        throw new Error('Customer not found');
      }
      recipient = customer;
      customerData = customer;
    }

    // Build message payloads
    const message = this.formatMessage(notificationData, customerData);

    // 1) Start from channels the customer has enabled
    const enabledByCustomer = new Set();
    if (customerData.telegramEnabled && customerData.telegram)
      enabledByCustomer.add('telegram');
    if (customerData.whatsAppEnabled && customerData.whatsApp)
      enabledByCustomer.add('whatsapp');

    // 2) Intersect with requested channels if provided
    let effectiveChannels =
      requestedChannels && requestedChannels.length
        ? requestedChannels.filter((c) => enabledByCustomer.has(c))
        : Array.from(enabledByCustomer);

    // 3) Optionally include websocket (internal)
    if (includeWebsocket && this.initialized) {
      if (!effectiveChannels.includes('websocket'))
        effectiveChannels.push('websocket');
    } else if (includeWebsocket && !this.initialized) {
      console.warn('⚠️ WebSocket IO not set; skipping websocket channel');
    }

    // Nothing to send? Return early
    if (effectiveChannels.length === 0) {
      const res = {
        notificationId: null,
        results: [],
        recipient: this._recipientSummary(
          recipientType,
          recipient,
          customerData
        ),
        channels: [],
        note: 'No eligible channels (either not requested or not enabled on recipient).',
      };
      if (save) {
        const saved = await this._saveNotification(
          notificationData,
          recipientType,
          recipient,
          customerData,
          'skipped',
          []
        );
        res.notificationId = saved.id;
      }
      return res;
    }

    // 4) Send to channels (soft-fail)
    const results = [];
    for (const ch of effectiveChannels) {
      try {
        const result = await this._sendToChannel(ch, {
          customerData,
          recipientType,
          recipient,
          message,
          rawData: notificationData,
        });
        results.push(result);
      } catch (err) {
        console.error(`💥 ${ch} error:`, err.message || err);
        const failure = {
          success: false,
          error: err.message || String(err),
          channel: ch,
        };
        results.push(failure);
        if (!failSoft) throw err;
      }
    }

    // 5) Persist notification record (optional)
    const status = results.some((r) => r && r.success) ? 'delivered' : 'failed';
    let notificationRow = null;
    if (save) {
      notificationRow = await this._saveNotification(
        notificationData,
        recipientType,
        recipient,
        customerData,
        status,
        effectiveChannels
      );
    }

    return {
      notificationId: notificationRow ? notificationRow.id : null,
      results,
      recipient: this._recipientSummary(recipientType, recipient, customerData),
      channels: effectiveChannels,
      status,
    };
  }

  async _sendToChannel(channelName, ctx) {
    const { customerData, recipientType, recipient, message, rawData } = ctx;

    if (channelName === 'telegram') {
      const chatId = customerData.telegram;
      return await this.channels.telegram.send(chatId, message.telegram);
    }

    if (channelName === 'whatsapp') {
      const phone = customerData.whatsApp;
      // Uses your existing retry logic inside the service
      return await this.channels.whatsapp.sendWithRetry(
        phone,
        message.whatsapp,
        3
      );
    }

    if (channelName === 'websocket') {
      const wsPayload = {
        ...message.websocket,
        recipientType,
        recipientId:
          recipientType === 'branch' ? recipient.id : customerData.id,
      };
      const wsRecipientId =
        recipientType === 'branch' ? recipient.id : customerData.id;
      return await this.channels.websocket.send(
        wsRecipientId,
        wsPayload,
        recipientType
      );
    }

    throw new Error(`Unknown channel: ${channelName}`);
  }

  async _saveNotification(
    notificationData,
    recipientType,
    recipient,
    customerData,
    status,
    channels
  ) {
    const titleMessage = this.getTitle(notificationData.type);
    return await Notification.create({
      type: notificationData.type,
      recipientType,
      recipientBranchId: recipientType === 'branch' ? recipient.id : null,
      recipientCustomerId:
        recipientType === 'customer' ? recipient.id : customerData.id,
      title: titleMessage,
      message: JSON.stringify(
        this.formatMessage(notificationData, customerData)
      ),
      data: notificationData.data,
      status,
      channels,
      priority: notificationData.priority || 'normal',
    });
  }

  _recipientSummary(recipientType, recipient, customerData) {
    return {
      type: recipientType,
      id: recipientType === 'branch' ? recipient.id : customerData.id,
      name:
        recipientType === 'branch'
          ? `Branch ${recipient.id}`
          : `${customerData.Stakeholder?.Person?.firstName ?? ''} ${
              customerData.Stakeholder?.Person?.lastName ?? ''
            }`.trim(),
    };
  }

  _resultForFail(msg, results, recipientType, recipientId) {
    return {
      notificationId: null,
      results,
      recipient: { type: recipientType, id: recipientId },
      channels: [],
      status: 'failed',
      error: msg,
    };
  }

  formatMessage(data, recipient) {
    const baseMessage = {
      title: this.getTitle(data.type),
      timestamp: new Date().toLocaleString('en-AF'),
      ...data,
    };
    return {
      telegram: this.formatTelegramMessage(baseMessage),
      whatsapp: this.formatWhatsAppMessage(baseMessage),
      websocket: baseMessage,
    };
  }

  formatTelegramMessage(data) {
    return `🔔 *${data.title}*
${this.getMessageBody(data)}
⏰ ${data.timestamp}
#${data.type}`;
  }

  formatWhatsAppMessage(data) {
    return `🔔 *${data.title}*
${this.getMessageBody(data)}
⏰ ${data.timestamp}`;
  }

  getMessageBody(data) {
    switch (data.type) {
      case 'transfer':
        return `💸 Transfer #${data.transferNo}
From: ${data.senderName}
To: ${data.receiverName}
Amount: ${data.transferAmount} AFN
Charges: ${data.chargesAmount} AFN`;
      case 'withdrawal':
        return `➖ Withdrawal
Amount: ${data.amount} AFN
Account: ${data.accountNo}
Balance: ${data.balance} AFN`;
      case 'deposit':
        return `➕ Deposit  
Amount: ${data.amount} AFN
Account: ${data.accountNo}
Balance: ${data.balance} AFN`;
      case 'account_activity':
        return `📊 Account Activity
Type: ${data.activityType}
Amount: ${data.amount} AFN
Balance: ${data.balance} AFN`;
      default:
        return data.message || 'Notification';
    }
  }

  getTitle(type) {
    const titles = {
      transfer: 'Money Transfer',
      withdrawal: 'Withdrawal Notification',
      deposit: 'Deposit Notification',
      account_activity: 'Account Activity',
      balance_alert: 'Balance Alert',
      system: 'System Notification',
    };
    return titles[type] || 'Notification';
  }
}

module.exports = new NotificationService();
