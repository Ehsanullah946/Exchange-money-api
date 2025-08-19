// services/emailService.js
const nodemailer = require('nodemailer');
require('dotenv').config();

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransporter({
      service: process.env.EMAIL_SERVICE || 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  }

  async sendVerificationEmail(email, code) {
    try {
      const mailOptions = {
        from: process.env.EMAIL_FROM || 'noreply@yourcompany.com',
        to: email,
        subject: 'Your Verification Code',
        html: this.getVerificationEmailTemplate(code),
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`Verification email sent to ${email}`);
    } catch (error) {
      console.error('Email sending failed:', error);
      throw new Error('Failed to send verification email');
    }
  }

  getVerificationEmailTemplate(code) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Verification Code</title>
      </head>
      <body>
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Account Verification</h2>
          <p>Your verification code is:</p>
          <div style="background-color: #f8f9fa; padding: 20px; text-align: center; margin: 20px 0;">
            <h1 style="color: #007bff; margin: 0; font-size: 32px;">${code}</h1>
          </div>
          <p>This code will expire in 10 minutes.</p>
          <p>If you didn't request this code, please ignore this email.</p>
          <hr>
          <p style="color: #666; font-size: 12px;">
            This is an automated message, please do not reply to this email.
          </p>
        </div>
      </body>
      </html>
    `;
  }

  // Optional: Add more email methods
  async sendWelcomeEmail(email, customerName) {
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: 'Welcome to Our Banking Service',
      html: `
        <h2>Welcome, ${customerName}!</h2>
        <p>Your customer portal access has been activated.</p>
        <p>You can now view your account balances online.</p>
      `,
    };

    await this.transporter.sendMail(mailOptions);
  }
}

module.exports = new EmailService();
