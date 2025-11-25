const TelegramChannel = require('../channels/telegramChannel');
const MultiWhatsAppService = require('./multiWhatsAppService');
const WebSocketChannel = require('../channels/websocketChannel');
const {
  Notification,
  Customer,
  Branch,
  Stakeholder,
  Person,
  Organization,
} = require('../models');

class NotificationService {
  constructor() {
    this.channels = {
      telegram: new TelegramChannel(),
      whatsapp: MultiWhatsAppService,
      websocket: new WebSocketChannel(),
    };
    this.initialized = false;
  }

  setWebSocketIO(io) {
    this.channels.websocket.setIO(io);
    this.initialized = true;
    console.log('✅ Notification service initialized with WebSocket');
  }

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
      overridePreference = false,
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
            include: [
              {
                model: Stakeholder,
                include: [
                  {
                    model: Person,
                    include: [Organization], // 👈 Include Organization here
                  },
                ],
              },
            ],
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
        include: [
          {
            model: Stakeholder,
            include: [
              {
                model: Person,
                include: [Organization], // 👈 Include Organization here
              },
            ],
          },
        ],
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

    const orgId =
      customerData.Stakeholder?.Person?.Organization?.id || 'default_org';

    // Build message payloads
    const message = this.formatMessage(notificationData, customerData);

    console.log('notificationService: recipient:', recipientType, recipientId);
    console.log('notificationService: organization:', orgId);
    console.log(
      'notificationService: customerData.whatsAppEnabled=',
      customerData.whatsAppEnabled,
      'whatsApp=',
      customerData.whatsApp
    );

    // 1) Start from channels the customer has enabled
    const enabledByCustomer = new Set();
    if (customerData.telegramEnabled && customerData.telegram)
      enabledByCustomer.add('telegram');
    if (customerData.whatsAppEnabled && customerData.whatsApp)
      enabledByCustomer.add('whatsapp');

    // 2) Determine effective channels
    let effectiveChannels;
    if (requestedChannels && requestedChannels.length) {
      if (overridePreference) {
        effectiveChannels = requestedChannels.filter((c) => !!this.channels[c]);
      } else {
        effectiveChannels = requestedChannels.filter((c) =>
          enabledByCustomer.has(c)
        );
      }
    } else {
      effectiveChannels = Array.from(enabledByCustomer);
    }

    // 3) include websocket optionally
    if (includeWebsocket && this.initialized) {
      if (!effectiveChannels.includes('websocket'))
        effectiveChannels.push('websocket');
    } else if (includeWebsocket && !this.initialized) {
      console.warn('⚠️ WebSocket IO not set; skipping websocket channel');
    }

    console.log('notificationService: effectiveChannels=', effectiveChannels);

    // Nothing to send?
    if (!effectiveChannels || effectiveChannels.length === 0) {
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
          'pending',
          []
        );
        res.notificationId = saved.id;
      }
      return res;
    }

    const results = [];
    for (const ch of effectiveChannels) {
      try {
        console.log(`notificationService: sending to channel ${ch}`);
        if (ch === 'whatsapp') {
          console.log(
            'notificationService: whatsapp phone=',
            customerData.whatsApp,
            'orgId=',
            orgId,
            'messagePreview=',
            message.whatsapp?.slice?.(0, 200)
          );
        }

        const result = await this._sendToChannel(ch, {
          customerData,
          recipientType,
          recipient,
          message,
          rawData: notificationData,
          orgId,
        });

        console.log(`notificationService: ${ch} result=`, result);
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

    // 5) Persist notification record
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
    const { customerData, recipientType, recipient, message, orgId } = ctx;

    if (channelName === 'telegram') {
      const chatId = customerData.telegram;
      if (!this.channels.telegram || !this.channels.telegram.send) {
        throw new Error('Telegram channel not available');
      }
      return await this.channels.telegram.send(chatId, message.telegram);
    }

    if (channelName === 'whatsapp') {
      const phone = customerData.whatsApp;
      if (!phone) {
        return {
          success: false,
          error: 'No phone number for WhatsApp',
          channel: 'whatsapp',
        };
      }

      // Check if WhatsApp is initialized for this organization
      const whatsappStatus =
        this.channels.whatsapp.getOrganizationStatus(orgId);
      if (!whatsappStatus.ready) {
        return {
          success: false,
          error: `WhatsApp not ready for organization ${orgId}`,
          channel: 'whatsapp',
          queued: true,
        };
      }

      try {
        const res = await this.channels.whatsapp.sendWithRetry(
          orgId,
          phone,
          message.whatsapp,
          3
        );

        if (res && res.queued) {
          return {
            success: false,
            queued: true,
            channel: 'whatsapp',
            note: res.note || 'queued',
          };
        }
        return res;
      } catch (err) {
        console.error(
          'notificationService: exception from whatsapp sendWithRetry',
          err
        );
        return {
          success: false,
          error: err.message || String(err),
          channel: 'whatsapp',
        };
      }
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
    return `🔔 *${data.title}*\n${this.getMessageBody(data)}\n⏰ ${
      data.timestamp
    }\n#${data.type}`;
  }

  formatWhatsAppMessage(data) {
    return `🔔 *${data.title}*\n${this.getMessageBody(data)}\n⏰ ${
      data.timestamp
    }`;
  }

  getMessageBody(data) {
    switch (data.type) {
      case 'transfer':
        return `💸 Transfer #${data.transferNo}
From: ${data.senderName}
To: ${data.receiverName}
Amount: ${data.transferAmount} ${data.moneyType}
Charges: ${data.chargesAmount} ${data.moneyType}`;

      case 'withdrawal':
        return `➖ Withdrawal
Amount: ${data.amount} ${data.moneyType}
Account: ${data.accountNo}
Balance: ${data.balance} ${data.moneyType}`;

      case 'deposit':
        return `➕ Deposit
Amount: ${data.amount} ${data.moneyType}
Account: ${data.accountNo}
Balance: ${data.balance} ${data.moneyType}`;

      case 'account_activity':
        return `📊 Account Activity
Type: ${data.activityType}
Amount: ${data.amount} ${data.moneyType}
Balance: ${data.balance} ${data.moneyType}`;
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
