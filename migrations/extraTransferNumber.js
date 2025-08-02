'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
   async up(queryInterface, Sequelize) {
    await queryInterface.createTable('extra_transfer_numbers', {
    id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      branchId: {
        type: Sequelize.INTEGER,
        allowNull:false
    },
    transferId: {
        type: Sequelize.INTEGER,
        allowNull:false
    }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('extra_transfer_numbers');
  }
};
