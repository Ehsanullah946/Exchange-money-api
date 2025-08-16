'use strict';

const { DATE } = require('sequelize');

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
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('rates');
  },
};
