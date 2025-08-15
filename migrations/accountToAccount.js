'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(
      'accounttoaccount',
      {
        No: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        fromAccount: {
          type: Sequelize.INTEGER,
          allowNull: false,
        },
        toAccount: {
          type: Sequelize.INTEGER,
          allowNull: false,
        },
        Amount: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false,
        },
        tDate: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.NOW,
        },
        description: { type: Sequelize.TEXT },
        deleted: { type: Sequelize.BOOLEAN, defaultValue: false },
        employeeId: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        organizationId: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        fingerprint: { type: Sequelize.BLOB },
      },

      {
        tableName: 'accounttoaccount',
        timestamps: false,
      }
    );
    // Add unique constraint
    await queryInterface.addConstraint('depositWithdraw', {
      fields: ['fromAccount', 'toAccount', 'deleted', 'Amount', 'tDate'],
      type: 'unique',
      name: 'accounttoaccount_full_identifier',
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('accounttoaccount');
    await queryInterface.removeConstraint(
      'accounttoaccount',
      'acccounttoaccount_full_identifier'
    );
  },
};
