'use strict';

const { DATE } = require('sequelize');
const { allowRoles } = require('../middlewares/roleMiddleware');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('rates', {
      fromCurrency: { type: Sequelize.INTEGER, primaryKey: true },
      value1: Sequelize.DECIMAL(10, 5),
      value2: Sequelize.DECIMAL(10, 5),
      rDate: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
      organizationId: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('rates');
  },
};
