// services/notificationService.js
const TelegramChannel = require('../channels/telegramChannel');
const WhatsAppChannel = require('../channels/whatsappChannel');
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
      whatsapp: new WhatsAppChannel(),
      websocket: new WebSocketChannel(),
    };
  }

  setWebSocketIO(io) {
    this.channels.websocket.setIO(io);
  }

  async sendNotification(recipientType, recipientId, notificationData) {
    let recipient;
    let customerData;

    if (recipientType === 'branch') {
      // Get branch which has customer relationship
      const branch = await Branch.findByPk(recipientId, {
        include: [
          {
            model: Customer,
            include: [
              {
                model: Stakeholder,
                include: [Person],
              },
            ],
          },
        ],
      });

      if (!branch || !branch.Customer) {
        throw new Error('Branch or associated customer not found');
      }

      recipient = branch;
      customerData = branch.Customer;
    } else {
      // Regular customer
      recipient = await Customer.findByPk(recipientId, {
        include: [
          {
            model: Stakeholder,
            include: [Person],
          },
        ],
      });

      if (!recipient) {
        throw new Error('Customer not found');
      }
      customerData = recipient;
    }

    const message = this.formatMessage(notificationData, customerData);
    const results = [];

    // Use customer's notification settings (since branch inherits from customer)
    const enabledChannels = [];
    if (customerData.telegramEnabled && customerData.telegram) {
      enabledChannels.push('telegram');
    }
    if (customerData.whatsAppEnabled && customerData.whatsApp) {
      enabledChannels.push('whatsapp');
    }
    if (customerData.emailEnabled) {
      // Email can be added later if needed
    }
    // Always enable internal/websocket for real-time updates
    enabledChannels.push('websocket');

    for (const channelName of enabledChannels) {
      const channel = this.channels[channelName];
      let channelResult;

      try {
        if (channelName === 'telegram') {
          channelResult = await channel.send(
            customerData.telegram,
            message.telegram
          );
        } else if (channelName === 'whatsapp') {
          channelResult = await channel.send(
            customerData.whatsApp,
            message.whatsapp
          );
        } else if (channelName === 'websocket') {
          const wsMessage = {
            ...message.websocket,
            recipientType,
            recipientId:
              recipientType === 'branch' ? recipient.id : customerData.id,
          };
          const wsRecipientId =
            recipientType === 'branch' ? recipient.id : customerData.id;
          channelResult = await channel.send(
            wsRecipientId,
            wsMessage,
            recipientType
          );
        }

        results.push(channelResult);
      } catch (error) {
        results.push({
          success: false,
          error: error.message,
          channel: channelName,
        });
      }
    }

    // Save notification to database
    const notification = await Notification.create({
      type: notificationData.type,
      recipientType,
      recipientBranchId: recipientType === 'branch' ? recipientId : null,
      recipientCustomerId:
        recipientType === 'customer' ? recipientId : customerData.id,
      title: message.title,
      message: JSON.stringify(message),
      data: notificationData.data,
      status: results.some((r) => r.success) ? 'delivered' : 'failed',
      channels: enabledChannels,
      priority: notificationData.priority || 'normal',
    });

    return {
      notificationId: notification.id,
      results,
      recipient: {
        type: recipientType,
        id: recipientType === 'branch' ? recipient.id : customerData.id,
        name:
          recipientType === 'branch'
            ? `Branch ${recipient.id}` // You might want to add branch name field
            : `${customerData.Stakeholder.Person.firstName} ${customerData.Stakeholder.Person.lastName}`,
      },
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
