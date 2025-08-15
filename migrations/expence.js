'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(
      'expences',
      {
        No: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        amount: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false,
        },
        moneyTypeId: {
          type: Sequelize.INTEGER,
          allowNull: false,
        },
        eDate: {
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
        expenceType: {
          type: Sequelize.INTEGER,
        },
      },

      {
        tableName: 'expences',
        timestamps: false,
      }
    );
    // Add unique constraint
    await queryInterface.addConstraint('expences', {
      fields: [`amount`, `moneyTypeId`, `eDate`, `deleted`, `expenceType`],
      type: 'unique',
      name: 'expences_full_identifier',
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('expences');
    await queryInterface.removeConstraint(
      'expences',
      'expences_full_identifier'
    );
  },
};
