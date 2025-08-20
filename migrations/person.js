'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('persons', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      firstName: {
        type: Sequelize.STRING(32),
        allowNull: false,
      },
      lastName: Sequelize.STRING(32),
      fatherName: Sequelize.STRING(32),
      photo: Sequelize.STRING(300),
      nationalCode: {
        type: Sequelize.STRING(64),
        unique: 'person_nationalCode',
      },
      phone: {
        type: Sequelize.STRING(20),
        unique: true,
        validate: {
          is: /^\+?[\d\s-]+$/, // Basic phone format validation
        },
      },
      email: {
        type: Sequelize.STRING,
        unique: true,
        validate: {
          isEmail: true,
        },
      },
      isVerified: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      verificationCode: Sequelize.STRING(6),
      codeExpiresAt: Sequelize.DATE,
      currentAddress: Sequelize.TEXT,
      organizationId: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('persons');
  },
};
