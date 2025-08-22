const TelegramBot = require('node-telegram-bot-api');

class TelegramChannel {
  constructor() {
    this.bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, {
      polling: false,
    });
    this.connected = false;
    this.connect();
  }

  connect() {
    this.bot.on('error', (error) => {
      console.error('Telegram bot error:', error);
      this.connected = false;
    });

    this.bot.on('polling_error', (error) => {
      console.error('Telegram polling error:', error);
    });

    this.connected = true;
    console.log('Telegram channel initialized');
  }

  async send(chatId, message) {
    if (!this.connected) {
      return { success: false, error: 'Telegram bot not connected' };
    }

    try {
      const result = await this.bot.sendMessage(chatId, message);
      return {
        success: true,
        messageId: result.message_id,
        channel: 'telegram',
      };
    } catch (error) {
      console.error('Telegram send error:', error.message);
      return { success: false, error: error.message, channel: 'telegram' };
    }
  }
}

module.exports = TelegramChannel;
