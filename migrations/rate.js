'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('rates', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      fromCurrency: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      toCurrency: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      buyRate: {
        type: Sequelize.DECIMAL(15, 6),
        allowNull: false,
        validate: {
          min: 0,
        },
      },
      sellRate: {
        type: Sequelize.DECIMAL(15, 6),
        allowNull: false,
        validate: {
          min: 0,
        },
      },
      middleRate: {
        type: Sequelize.DECIMAL(15, 6),
        allowNull: false,
        validate: {
          min: 0,
        },
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      effectiveDate: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      organizationId: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      createdBy: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('rates');
  },
};
