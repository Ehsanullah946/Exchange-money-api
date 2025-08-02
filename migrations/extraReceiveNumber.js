'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
   async up(queryInterface, Sequelize) {
    await queryInterface.createTable('extra_receive_numbers', {
    id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
    placeName: { type: Sequelize.STRING },
    receiveId: {
        type:Sequelize.INTEGER,
        allowNull:false
    }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('extra_receive_numbers');
  }
};
