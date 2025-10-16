'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('liquidations', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      customerId: { type: Sequelize.INTEGER, allowNull: false },
      organizationId: { type: Sequelize.INTEGER, allowNull: false },
      startDate: { type: Sequelize.DATE, allowNull: false },
      endDate: { type: Sequelize.DATE, allowNull: false },
      description: { type: Sequelize.TEXT },
      status: {
        type: Sequelize.ENUM('pending', 'completed', 'failed'),
        defaultValue: 'completed',
      },
      closedAccounts: { type: Sequelize.BOOLEAN, defaultValue: false },
      createdAt: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('liquidations');
  },
};
