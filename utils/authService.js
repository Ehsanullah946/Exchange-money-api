// services/authService.js - Updated token expiration
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Person, Customer, Stakeholder, Op } = require('../models');
require('dotenv').config({ path: '.env' });

const { sendVerificationEmail } = require('./emailService');

class AuthService {
  static async initiateVerification(email, organizationId) {
    try {
      console.log('🔍 Looking for person with email:', email);

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new Error('Invalid email address format');
      }

      // Find customer directly by email and include the full chain
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
          where: { active: false, email },
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

      // Get the person from the stakeholder
      const stakeholder = customer.Stakeholder;
      const person = stakeholder?.Person || stakeholder?.People?.[0];

      if (!person) {
        throw new Error(
          'Account not properly configured. Missing person information.'
        );
      }

      // Check if user was recently verified (within 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      if (
        person.lastLogin &&
        person.lastLogin > thirtyDaysAgo &&
        person.isVerified
      ) {
        console.log(
          '🔄 Customer recently verified, generating long-term token'
        );

        const token = jwt.sign(
          {
            customerId: customer.id,
            personId: person.id,
            email: person.email,
            organizationId: person.organizationId,
            scope: ['read:accounts'],
          },
          process.env.JWT_SECRET,
          { expiresIn: '30d' } // 30 days for returning customers
        );

        // Update last login time
        await person.update({
          lastLogin: new Date(),
        });

        return {
          success: true,
          token,
          customerId: customer.id,
          personId: person.id,
          expiresIn: 30 * 24 * 60 * 60, // 30 days in seconds
          message: 'Welcome back! Automatic login successful.',
        };
      }

      // New verification required
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60000); // 10 minutes
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
        requiresVerification: true,
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
      const person = stakeholder?.Person || stakeholder?.People?.[0];

      if (!person) {
        throw new Error(
          'Account not properly configured. Missing person information.'
        );
      }

      // Check if code exists
      if (!person.verificationCode) {
        throw new Error(
          'No verification code found. Please request a new one.'
        );
      }

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

      // Generate token with 30-day expiration
      const token = jwt.sign(
        {
          customerId: customer.id,
          personId: person.id,
          email: person.email,
          organizationId: person.organizationId,
          scope: ['read:accounts'],
        },
        process.env.JWT_SECRET,
        { expiresIn: '30d' } // Changed from 24h to 30d
      );

      console.log('✅ Verification successful for customer:', customer.id);

      return {
        success: true,
        token,
        customerId: customer.id,
        personId: person.id,
        expiresIn: 30 * 24 * 60 * 60, // 30 days in seconds
        message: 'Login successful! You will stay logged in for 30 days.',
      };
    } catch (error) {
      console.error('❌ Verify code error:', error.message);
      throw error;
    }
  }

  // Optional: Add a method to refresh token without verification
  static async refreshToken(customerId, personId) {
    try {
      const customer = await Customer.findOne({
        where: { id: customerId, active: true },
        include: [
          {
            model: Stakeholder,
            include: [
              {
                model: Person,
                where: { id: personId, isVerified: true },
              },
            ],
          },
        ],
      });

      if (!customer) {
        throw new Error('Customer not found or inactive');
      }

      const stakeholder = customer.Stakeholder;
      const person = stakeholder?.Person || stakeholder?.People?.[0];

      if (!person) {
        throw new Error('Person not found');
      }

      // Update last login
      await person.update({
        lastLogin: new Date(),
      });

      // Generate new token
      const token = jwt.sign(
        {
          customerId: customer.id,
          personId: person.id,
          email: person.email,
          organizationId: person.organizationId,
          scope: ['read:accounts'],
        },
        process.env.JWT_SECRET,
        { expiresIn: '30d' }
      );

      return {
        success: true,
        token,
        customerId: customer.id,
        personId: person.id,
        expiresIn: 30 * 24 * 60 * 60,
      };
    } catch (error) {
      console.error('❌ Refresh token error:', error.message);
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
