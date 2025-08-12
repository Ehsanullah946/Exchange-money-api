'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('accounts', {
        No: { type: Sequelize.INTEGER, autoIncrement: true,primaryKey:true },
        credit: {
        type: Sequelize.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 0.00
        },
        dateOfCreation: {
            type: Sequelize.DATE,
            defaultValue: Sequelize.NOW
        },
        smsEnabled: { type: Sequelize.BOOLEAN, defaultValue: false },
        whatsApp: { type: Sequelize.BOOLEAN, defaultValue: false },
        email: { type: Sequelize.BOOLEAN, defaultValue: false },
        telegramEnabled: { type: Sequelize.BOOLEAN, defaultValue: false },
        active: { type: Sequelize.BOOLEAN, defaultValue: true },
        deleted: { type: Sequelize.BOOLEAN, defaultValue: false },
        moneyTypeId: {
        type: Sequelize.INTEGER, primaryKey:true,
        allowNull:false
    }, 
        customerId: {
        type: Sequelize.INTEGER, primaryKey:true,
        allowNull:false
    }
    },
    {
    tableName: "accounts",
     timestamps: false,
        indexes: [
    {
      unique: true,
      fields: ['customerId', 'moneyTypeId', 'No'],
      name: 'account_composite_pk'
    }
  ]
      });
    
     await queryInterface.addConstraint('Accounts', {
      fields: ['customerId', 'moneyTypeId', 'No'],
      type: 'primary key',
      name: 'account_full_identifier'
    });
    
    // Add unique constraint
    await queryInterface.addConstraint('Accounts', {
      fields: ['customerId', 'moneyTypeId'],
      type: 'unique',
      name: 'customer_currency_unique'
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('accounts');
    await queryInterface.removeConstraint('Accounts', 'account_full_identifier');
    await queryInterface.removeConstraint('Accounts', 'customer_currency_unique');
  }
};
