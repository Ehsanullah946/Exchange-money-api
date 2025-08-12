'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('depositWithdraw', {
        No: { type: Sequelize.INTEGER, autoIncrement: true,primaryKey:true },
        deposit: {
        type: Sequelize.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 0.00
        },
        withdraw: {
        type: Sequelize.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 0.00
        },
        DWDate: {
            type: Sequelize.DATE,
            defaultValue: Sequelize.NOW
        },
        description: { type: Sequelize.TEXT },
        deleted: { type: Sequelize.BOOLEAN, defaultValue: false },

        employeeId: {
        type: Sequelize.INTEGER,
        allowNull:true
    },
        accountNo: {
        type: Sequelize.INTEGER,
        allowNull:false
    },
        fingerprint: { type: Sequelize.BLOB },
        photo: { type: Sequelize.BLOB},
        WithdrawReturnDate: { type: Sequelize.DATE },
    },
    {
    tableName: "depositWithdraw",
     timestamps: false,
        indexes: [
    {
      unique: true,
      fields: ['deposit', 'withdraw', 'deleted', 'accountNo', 'DWDate'],
      name: 'depositWithdraw_uniques'
    }
  ]
      });
    
    // Add unique constraint
    await queryInterface.addConstraint('depositWithdraw', {
      fields: ['deposit', 'withdraw', 'deleted', 'accountNo', 'DWDate'],
      type: 'unique',
      name: 'depositWithdraw_uniques'
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('depositWithdraw');
    await queryInterface.removeConstraint('depositWithdraw', 'depositWithdraw_uniques');
    await queryInterface.removeConstraint('depositWithdraw', 'depositWithdraw_uniques');
  }
};
