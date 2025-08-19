// services/authService.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Person, Customer, Stakeholder } = require('../models');
const SMSService = require('./smsService'); // You'll need to implement this
const EmailService = require('./emailService');
const { Op } = require('sequelize');
require('dotenv').config();

class AuthService {
  static async initiateVerification(contact) {
    // Find person by phone or email
    const person = await Person.findOne({
      where: {
        [Op.or]: [{ phone: contact }, { email: contact }],
      },
      include: [
        {
          model: Stakeholder,
          include: [
            {
              model: Customer,
              where: { active: true },
            },
          ],
        },
      ],
    });

    if (!person) {
      throw new Error('No customer found with this contact information');
    }

    // Generate 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60000); // 10 minutes expiry

    // Hash the code before storing
    const hashedCode = await bcrypt.hash(code, 10);

    await person.update({
      verificationCode: hashedCode,
      codeExpiresAt: expiresAt,
    });

    // Send OTP via SMS or Email
    if (contact.includes('@')) {
      // Send email
      await EmailService.sendVerificationEmail(contact, code);
    } else {
      // Send SMS
      await SMSService.sendSMS(contact, `Your verification code: ${code}`);
    }

    return {
      message: 'Verification code sent',
      expiresAt,
      method: contact.includes('@') ? 'email' : 'sms',
    };
  }

  static async verifyCode(contact, code) {
    const person = await Person.findOne({
      where: {
        [Op.or]: [{ phone: contact }, { email: contact }],
      },
      include: [
        {
          model: Stakeholder,
          include: [Customer],
        },
      ],
    });

    if (!person) {
      throw new Error('Invalid contact information');
    }

    // Check if code exists and isn't expired
    if (
      !person.verificationCode ||
      !person.codeExpiresAt ||
      new Date(person.codeExpiresAt) < new Date()
    ) {
      throw new Error('Verification code expired or invalid');
    }

    // Verify code
    const isValid = await bcrypt.compare(code, person.verificationCode);
    if (!isValid) {
      throw new Error('Invalid verification code');
    }

    // Get the customer ID
    const customer = person.Stakeholder?.Customers?.[0];
    if (!customer) {
      throw new Error('No customer account found');
    }

    // Mark as verified and clear code
    await person.update({
      isVerified: true,
      verificationCode: null,
      codeExpiresAt: null,
      lastLogin: new Date(),
    });

    // Generate JWT token
    const token = jwt.sign(
      {
        customerId: customer.id,
        personId: person.id,
        scope: ['read:accounts'],
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    return {
      token,
      customerId: customer.id,
      personId: person.id,
      expiresIn: 24 * 60 * 60, // 24 hours in seconds
    };
  }
}

module.exports = AuthService;
