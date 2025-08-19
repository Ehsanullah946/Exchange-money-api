// services/smsService.js
const twilio = require('twilio');
require('dotenv').config();

class SMSService {
  constructor() {
    this.client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
  }

  async sendSMS(phoneNumber, message) {
    try {
      // Clean phone number format
      const formattedPhone = this.formatPhoneNumber(phoneNumber);

      const result = await this.client.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: formattedPhone,
      });

      console.log(`SMS sent to ${formattedPhone}: ${result.sid}`);
      return result;
    } catch (error) {
      console.error('SMS sending failed:', error);
      throw new Error('Failed to send SMS');
    }
  }

  async sendVerificationSMS(phoneNumber, code) {
    const message = `Your verification code: ${code}. This code expires in 10 minutes.`;
    return this.sendSMS(phoneNumber, message);
  }

  formatPhoneNumber(phone) {
    // Remove any non-digit characters
    let cleaned = phone.replace(/\D/g, '');

    // Add country code if missing (assuming Afghanistan +93)
    if (!cleaned.startsWith('93') && cleaned.length === 9) {
      cleaned = '93' + cleaned;
    }

    // Add + prefix for international format
    return `+${cleaned}`;
  }
}

module.exports = new SMSService();
