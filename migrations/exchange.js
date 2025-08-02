'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
   async up(queryInterface, Sequelize) {
    await queryInterface.createTable('exchanges', {
    id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
    rate: { type: Sequelize.DECIMAL(10, 4), allowNull: false },
    saleAmount: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
    purchaseAmount: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
    eDate: { type: Sequelize.DATE, allowNull: false },
    description: { type: Sequelize.TEXT },
    fingerprint: { type: Sequelize.BLOB },
    photo: { type: Sequelize.BLOB },
    deleted: { type: Sequelize.BOOLEAN, defaultValue: false },
    swap: { type: Sequelize.BOOLEAN, defaultValue: false },
    calculate: { type: Sequelize.BOOLEAN, defaultValue: false },
       saleMoneyType: {
        type: Sequelize.INTEGER,
        allowNull:false
    },
       purchaseMoneyType: {
        type: Sequelize.INTEGER,
        allowNull:false
    },
       employeeId: {
        type: Sequelize.INTEGER,
        allowNull:false
    },
     customerId: {
        type: Sequelize.INTEGER,
    },
       organizationId: {
        type: Sequelize.INTEGER,
        allowNull:false
    },
       transferId: {
        type: Sequelize.INTEGER,
    },
       receiveId: {
        type: Sequelize.INTEGER,
    },
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('exchanges');
  }
};
