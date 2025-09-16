// services/authService.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Person, Customer, Stakeholder, Op } = require('../models');
require('dotenv').config({ path: '.env' });

// services/authService.js

const { sendVerificationEmail } = require('./emailService');
const { where } = require('sequelize');

class AuthService {
  static async initiateVerification(email, organizationId) {
    try {
      console.log('🔍 Looking for person with email:', email);

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new Error('Invalid email address format');
      }

      // NEW QUERY: Find customer directly by email and include the full chain
      const customer = await Customer.findOne({
        where: { active: true, email },
        include: [
          {
            model: Stakeholder,
            include: [
              {
                model: Person,
                where: { email, organizationId },
              },
            ],
          },
        ],
      });

      console.log('📋 Customer found:', customer ? 'Yes' : 'No');

      if (!customer) {
        // Check if customer exists but inactive
        const inactiveCustomer = await Customer.findOne({
          where: { active: false },
          include: [Stakeholder],
        });

        if (inactiveCustomer) {
          throw new Error(
            'Your account is deactivated. Please contact your bank.'
          );
        } else {
          throw new Error(
            'No active customer account found with this email address.'
          );
        }
      }
      console.log(JSON.stringify(customer, null, 2));

      // Get the person from the stakeholder
      const stakeholder = customer.Stakeholder;
      const person = stakeholder?.Person || stakeholder?.People?.[0]; // If hasMany

      if (!person) {
        throw new Error(
          'Account not properly configured. Missing person information.'
        );
      }

      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60000);
      const hashedCode = await bcrypt.hash(code, 10);

      await person.update({
        verificationCode: hashedCode,
        codeExpiresAt: expiresAt,
      });

      console.log('📧 Sending verification email to:', email);
      await sendVerificationEmail(email, code, organizationId);

      return {
        success: true,
        message: 'Verification code sent to your email',
        expiresAt: expiresAt.toISOString(),
        email: this.maskEmail(email),
      };
    } catch (error) {
      console.error('❌ AuthService error:', error.message);
      throw error;
    }
  }

  static async verifyCode(email, code, organizationId) {
    try {
      console.log('🔍 Verifying code for email:', email);

      // Find customer with the full chain
      const customer = await Customer.findOne({
        where: { email },
        include: [
          {
            model: Stakeholder,
            include: [
              {
                model: Person,
                where: { email, organizationId },
              },
            ],
          },
        ],
      });

      if (!customer) {
        throw new Error('Invalid email address');
      }

      const stakeholder = customer.Stakeholder;
      const person = stakeholder?.Person || stakeholder?.People?.[0]; // If hasMany

      if (!person) {
        throw new Error(
          'Account not properly configured. Missing person information.'
        );
      }

      // Check if code exists and isn't expired
      if (!person.verificationCode || !person.codeExpiresAt) {
        throw new Error(
          'No verification code found. Please request a new one.'
        );
      }

      // if (new Date(person.codeExpiresAt) < new Date()) {
      //   throw new Error(
      //     'Verification code has expired. Please request a new one.'
      //   );
      // }

      // Verify code
      const isValid = await bcrypt.compare(code, person.verificationCode);
      if (!isValid) {
        throw new Error('Invalid verification code');
      }

      // Mark as verified and clear code
      await person.update({
        isVerified: true,
        verificationCode: null,
        codeExpiresAt: null,
        lastLogin: new Date(),
      });

      const token = jwt.sign(
        {
          customerId: customer.id,
          personId: person.id,
          email: person.email,
          organizationId: person.organizationId,
          scope: ['read:accounts'],
        },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      console.log('✅ Verification successful for customer:', customer.id);

      return {
        success: true,
        token,
        customerId: customer.id,
        personId: person.id,
        expiresIn: 24 * 60 * 60,
      };
    } catch (error) {
      console.error('❌ Verify code error:', error.message);
      throw error;
    }
  }

  static maskEmail(email) {
    const [name, domain] = email.split('@');
    return `${name[0]}${'*'.repeat(name.length - 2)}${name.slice(
      -1
    )}@${domain}`;
  }
}

module.exports = AuthService;
