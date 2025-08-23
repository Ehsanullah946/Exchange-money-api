'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(
      'notifications',
      {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        type: {
          type: Sequelize.ENUM(
            'transfer',
            'withdrawal',
            'deposit',
            'account_activity',
            'balance_alert',
            'system'
          ),
          allowNull: false,
        },
        recipientType: {
          type: Sequelize.ENUM('branch', 'customer'),
          allowNull: false,
        },
        recipientBranchId: { type: Sequelize.INTEGER, allowNull: true },
        recipientCustomerId: { type: Sequelize.INTEGER, allowNull: true },
        title: { type: Sequelize.STRING, allowNull: true },
        message: { type: Sequelize.TEXT, allowNull: false },
        data: { type: Sequelize.JSON, allowNull: true },
        status: {
          type: Sequelize.ENUM(
            'pending',
            'sent',
            'delivered',
            'read',
            'failed'
          ),
          defaultValue: 'pending',
        },
        priority: {
          type: Sequelize.ENUM('low', 'normal', 'high'),
          defaultValue: 'normal',
        },
        channels: { type: Sequelize.JSON, defaultValue: ['internal'] },
      },
      {
        tableName: 'notifications',
        indexes: [
          { fields: ['recipientBranchId', 'status'] },
          { fields: ['recipientCustomerId', 'status'] },
          { fields: ['createdAt'] },
        ],
      }
    );
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('notifications');
  },
};
