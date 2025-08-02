'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
   async up(queryInterface, Sequelize) {
    await queryInterface.createTable('transfers', {
    id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
    transferNo: { type: Sequelize.STRING, allowNull: false },
    transferAmount: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
    chargesAmount: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0.00 },
    chargesType: { type: Sequelize.INTEGER, allowNull: false,defaultValue: 1 },
    tDate: { type: Sequelize.DATE, allowNull: false },
    description: { type: Sequelize.TEXT },
    fingerprint: { type: Sequelize.BLOB },
    photo: { type: Sequelize.BLOB },
    guarantorRelation: { type: Sequelize.STRING },
    deleted: { type: Sequelize.BOOLEAN, defaultValue: false },
    rejected: { type: Sequelize.BOOLEAN, defaultValue: false },
    branchCharges: { type: Sequelize.DECIMAL(10, 2) },
    branchChargesType: { type: Sequelize.INTEGER},
    toWhere: {
        type: Sequelize.INTEGER,
        allowNull:false
    },
    organizationId: {
        type: Sequelize.INTEGER,
        allowNull:false
    },
    receiverId: {
        type: Sequelize.INTEGER,
        allowNull:false
    },
    senderId: {
        type: Sequelize.INTEGER,
        allowNull:false
    },
    customer: {
        type: Sequelize.INTEGER,
    },
    employeeId: {
        type: Sequelize.INTEGER,
    },
    exchangeId: {
        type: Sequelize.INTEGER,
    },
    moneyTypeId: {
        type: Sequelize.INTEGER,
        allowNull:false
    }

    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('transfers');
  }
};
